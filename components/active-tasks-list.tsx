import { getUserActiveTasks } from "@/server/tasks";
import Link from "next/link";
import { Folder, Circle, Timer, CheckCircle, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

export async function ActiveTasksList() {
    const { tasks, success } = await getUserActiveTasks();

    if (!success || !tasks || tasks.length === 0) {
        return (
             <div className="p-8 text-center border rounded-lg bg-muted/20 mt-4">
                <p className="text-muted-foreground">No active tasks found.</p>
            </div>
        )
    }

    const priorityIcons: Record<string, React.ReactNode> = {
        low: <ArrowDown className="h-4 w-4 text-blue-500" />,
        medium: <Minus className="h-4 w-4 text-yellow-500" />,
        high: <ArrowUp className="h-4 w-4 text-red-500" />,
    };

    return (
        <div className="rounded-md border mt-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[300px]">Task</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Notebook</TableHead>
                        <TableHead className="text-right">Due Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tasks.map(({ task, notebook }) => (
                        <TableRow key={task.id}>
                            <TableCell className="font-medium">
                                <Link href={`/dashboard/notebook/${notebook.id}/tasks`} className="hover:underline">
                                    {task.title}
                                </Link>
                            </TableCell>
                            <TableCell>
                                <div className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit",
                                    task.status === 'in-progress' 
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" 
                                        : "bg-secondary text-secondary-foreground"
                                )}>
                                    {task.status === 'in-progress' ? <Timer className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                                    <span className="capitalize">{task.status?.replace('-', ' ')}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    {priorityIcons[task.priority] || <Minus className="h-4 w-4 text-muted-foreground" />}
                                    <span className="capitalize text-sm">{task.priority}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Link 
                                    href={`/dashboard/notebook/${notebook.id}/tasks`}
                                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                                >
                                    <Folder className="h-3.5 w-3.5" />
                                    {notebook.name}
                                </Link>
                            </TableCell>
                            <TableCell className="text-right">
                                {task.dueDate ? (
                                    <span className="text-muted-foreground text-sm">
                                        {format(new Date(task.dueDate), "MMM d, yyyy")}
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground/50 text-sm">-</span>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
