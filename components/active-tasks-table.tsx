"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    MoreHorizontal,
    Pencil,
    Trash2,
    Calendar as CalendarIcon,
    Search,
    Filter,
    X,
    Folder,
    Timer,
    Circle,
    CheckCircle,
    ArrowUp as PriorityHigh,
    ArrowDown as PriorityLow,
    Minus as PriorityMedium,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { TaskDialog } from "@/components/task-dialog";
import { updateTaskStatus, deleteTask } from "@/server/tasks";
import { toast } from "sonner";
import { type Task } from "@/db/schema";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { type DateRange } from "react-day-picker";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface ActiveTasksTableProps {
  tasks: {
    task: Task;
    notebook: {
      id: string;
      name: string;
    };
  }[];
}

type SortConfig = {
    key: 'title' | 'dueDate' | 'priority' | 'status' | 'notebook';
    direction: 'asc' | 'desc';
} | null;

export function ActiveTasksTable({ tasks: initialTasks }: ActiveTasksTableProps) {
  const [tasks, setTasks] = React.useState(initialTasks);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all");
  const [notebookFilter, setNotebookFilter] = React.useState<string>("all");
  const [dateFilter, setDateFilter] = React.useState<DateRange | undefined>(undefined);
  
  const [sortConfig, setSortConfig] = React.useState<SortConfig>(null);
  
  const [editingTask, setEditingTask] = React.useState<{ task: Task, notebookId: string } | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  const [deleteTaskInfo, setDeleteTaskInfo] = React.useState<{ id: string, notebookId: string, title: string } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  // Sync state with props if they change (server revalidation)
  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, priorityFilter, notebookFilter, dateFilter]);

  // Derived filters
  const uniqueNotebooks = Array.from(new Set(initialTasks.map(t => t.notebook.name))).sort();

  // Filter Logic
  const filteredTasks = React.useMemo(() => {
    return tasks.filter(({ task, notebook }) => {
        const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || task.status === statusFilter;
        const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
        const matchesNotebook = notebookFilter === "all" || notebook.name === notebookFilter;
        
        let matchesDate = true;
        if (dateFilter?.from && task.dueDate) {
            const taskDate = new Date(task.dueDate);
            taskDate.setHours(0, 0, 0, 0); // Normalize task date
            
            const fromDate = new Date(dateFilter.from);
            fromDate.setHours(0, 0, 0, 0);

            if (dateFilter.to) {
                const toDate = new Date(dateFilter.to);
                toDate.setHours(0, 0, 0, 0);
                matchesDate = taskDate >= fromDate && taskDate <= toDate;
            } else {
                matchesDate = taskDate.getTime() === fromDate.getTime();
            }
        } else if (dateFilter?.from && !task.dueDate) {
             matchesDate = false;
        }

        return matchesSearch && matchesStatus && matchesPriority && matchesNotebook && matchesDate;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter, notebookFilter, dateFilter]);

  // Sort Logic
  const sortedTasks = React.useMemo(() => {
    if (!sortConfig) return filteredTasks;

    return [...filteredTasks].sort((a, b) => {
        let aValue: any = a.task[sortConfig.key as keyof Task];
        let bValue: any = b.task[sortConfig.key as keyof Task];

        if (sortConfig.key === 'notebook') {
            aValue = a.notebook.name;
            bValue = b.notebook.name;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
  }, [filteredTasks, sortConfig]);

  // Pagination Logic
  const totalPages = Math.ceil(sortedTasks.length / itemsPerPage);
  const paginatedTasks = sortedTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (key: NonNullable<SortConfig>['key']) => {
    setSortConfig(current => {
        if (current?.key === key) {
            if (current.direction === 'asc') return { key, direction: 'desc' };
            return null;
        }
        return { key, direction: 'asc' };
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setNotebookFilter("all");
    setDateFilter(undefined);
  };

  const handleStatusUpdate = async (taskId: string, newStatus: string, notebookId: string) => {
    toast.promise(updateTaskStatus(taskId, newStatus, notebookId), {
        loading: 'Updating status...',
        success: 'Status updated',
        error: 'Failed to update status'
    });
    // Optimistic update handled by useEffect syncing with props after server revalidation
  };
  
  const handleDelete = async () => {
      if (!deleteTaskInfo) return;
      
      const { id, notebookId } = deleteTaskInfo;
      
      toast.promise(deleteTask(id, notebookId), {
          loading: 'Deleting task...',
          success: 'Task deleted',
          error: 'Failed to delete task'
      });
      setIsDeleteDialogOpen(false);
  };

  const priorityIcons: Record<string, React.ReactNode> = {
    low: <PriorityLow className="h-4 w-4 text-blue-500" />,
    medium: <PriorityMedium className="h-4 w-4 text-yellow-500" />,
    high: <PriorityHigh className="h-4 w-4 text-red-500" />,
  };

  return (
    <div className="space-y-4">
        {/* Filters Bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-muted/30 p-4 rounded-lg border">
            <div className="flex flex-1 items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Filter tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 bg-background"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px] bg-background">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                    </SelectContent>
                </Select>
                 <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[130px] bg-background">
                        <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                </Select>
                 <Select value={notebookFilter} onValueChange={setNotebookFilter}>
                    <SelectTrigger className="w-[150px] bg-background">
                        <SelectValue placeholder="Notebook" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Notebooks</SelectItem>
                        {uniqueNotebooks.map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-[240px] justify-start text-left font-normal bg-background", !dateFilter && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateFilter?.from ? (
                                dateFilter.to ? (
                                    <>
                                        {format(dateFilter.from, "MMM d, yyyy")} -{" "}
                                        {format(dateFilter.to, "MMM d, yyyy")}
                                    </>
                                ) : (
                                    format(dateFilter.from, "MMM d, yyyy")
                                )
                            ) : (
                                <span>Pick a date range</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="range"
                            selected={dateFilter}
                            onSelect={setDateFilter}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
               
                {(searchQuery || statusFilter !== "all" || priorityFilter !== "all" || notebookFilter !== "all" || dateFilter) && (
                    <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>

        {/* Table */}
        <div className="rounded-md border bg-background">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[30%] cursor-pointer" onClick={() => handleSort('title')}>
                            <div className="flex items-center gap-1">
                                Task {sortConfig?.key === 'title' && <ArrowUpDown className="h-3 w-3" />}
                            </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
                             <div className="flex items-center gap-1">
                                Status {sortConfig?.key === 'status' && <ArrowUpDown className="h-3 w-3" />}
                            </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('priority')}>
                             <div className="flex items-center gap-1">
                                Priority {sortConfig?.key === 'priority' && <ArrowUpDown className="h-3 w-3" />}
                            </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('notebook')}>
                             <div className="flex items-center gap-1">
                                Notebook {sortConfig?.key === 'notebook' && <ArrowUpDown className="h-3 w-3" />}
                            </div>
                        </TableHead>
                        <TableHead className="text-right cursor-pointer" onClick={() => handleSort('dueDate')}>
                             <div className="flex items-center justify-end gap-1">
                                Due Date {sortConfig?.key === 'dueDate' && <ArrowUpDown className="h-3 w-3" />}
                            </div>
                        </TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedTasks.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                No tasks match your filters.
                            </TableCell>
                        </TableRow>
                    ) : (
                        paginatedTasks.map(({ task, notebook }) => (
                            <TableRow key={task.id} className="group">
                                <TableCell className="font-medium">
                                    <div className="flex flex-col">
                                        <span className="truncate max-w-[300px]" title={task.title}>{task.title}</span>
                                        {task.tag && (
                                            <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-sm w-fit mt-1">
                                                {task.tag}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className={cn(
                                                "h-7 px-2 text-xs font-semibold rounded-full border",
                                                task.status === 'in-progress' 
                                                    ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800" 
                                                    : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                                            )}>
                                                {task.status === 'in-progress' ? <Timer className="mr-1 h-3 w-3" /> : <Circle className="mr-1 h-3 w-3" />}
                                                <span className="capitalize">{task.status?.replace('-', ' ')}</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start">
                                            <DropdownMenuItem onClick={() => handleStatusUpdate(task.id, 'todo', notebook.id)}>
                                                <Circle className="mr-2 h-4 w-4" /> To Do
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleStatusUpdate(task.id, 'in-progress', notebook.id)}>
                                                <Timer className="mr-2 h-4 w-4" /> In Progress
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleStatusUpdate(task.id, 'done', notebook.id)}>
                                                <CheckCircle className="mr-2 h-4 w-4" /> Done
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {priorityIcons[task.priority]}
                                        <span className="capitalize text-sm text-muted-foreground">{task.priority}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Link 
                                        href={`/dashboard/notebook/${notebook.id}/tasks`}
                                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors hover:underline"
                                    >
                                        <Folder className="h-3.5 w-3.5" />
                                        {notebook.name}
                                    </Link>
                                </TableCell>
                                <TableCell className="text-right">
                                    {task.dueDate ? (
                                        <span className={cn(
                                            "text-sm font-medium",
                                            new Date(task.dueDate) < new Date() && task.status !== 'done' ? "text-red-500" : "text-muted-foreground"
                                        )}>
                                            {format(new Date(task.dueDate), "MMM d")}
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground/30">-</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => {
                                                setEditingTask({ task, notebookId: notebook.id });
                                                setIsEditDialogOpen(true);
                                            }}>
                                                <Pencil className="mr-2 h-4 w-4" /> Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                                className="text-destructive focus:text-destructive"
                                                onClick={() => {
                                                    setDeleteTaskInfo({ id: task.id, notebookId: notebook.id, title: task.title });
                                                    setIsDeleteDialogOpen(true);
                                                }}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious 
                            href="#" 
                            onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(p => Math.max(1, p - 1));
                            }}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).filter(page => {
                       // Show first, last, current, and neighbors
                       return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                    }).map((page, index, array) => {
                         const showEllipsis = index > 0 && page - array[index - 1] > 1;
                         return (
                            <React.Fragment key={page}>
                                {showEllipsis && (
                                    <PaginationItem>
                                        <PaginationEllipsis />
                                    </PaginationItem>
                                )}
                                <PaginationItem>
                                    <PaginationLink 
                                        href="#"
                                        isActive={currentPage === page}
                                        size="icon"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setCurrentPage(page);
                                        }}
                                    >
                                        {page}
                                    </PaginationLink>
                                </PaginationItem>
                            </React.Fragment>
                         );
                    })}

                    <PaginationItem>
                        <PaginationNext 
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(p => Math.min(totalPages, p + 1));
                            }}
                             className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        )}

        {/* Edit Dialog */}
        <TaskDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            notebookId={editingTask?.notebookId || ""}
            task={editingTask?.task || undefined}
        />

        {/* Delete Confirmation Alert */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the task
                        {deleteTaskInfo?.title && <span className="font-medium text-foreground"> "{deleteTaskInfo.title}"</span>} and remove it from our servers.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleDelete();
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
