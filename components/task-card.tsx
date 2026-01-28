"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Clock, MoreHorizontal, Trash2, Edit, ArrowRightLeft, CheckCircle, Circle, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Task } from "@/db/schema";
import { format } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { deleteTask, updateTaskStatus } from "@/server/tasks";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { TaskDialog } from "./task-dialog";

interface TaskProps {
    task: Task
}

export function TaskCard({ task }: TaskProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const router = useRouter();

    const priorityColor: Record<string, string> = {
        low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };

    const handleStatusChange = async (newStatus: string) => {
        setIsLoading(true);
        const res = await updateTaskStatus(task.id, newStatus, task.notebookId);
        if (res.success) {
            toast.success("Task status updated");
        } else {
            toast.error("Failed to update status");
        }
        setIsLoading(false);
    }

    const handleDelete = async () => {
        setIsLoading(true);
        const res = await deleteTask(task.id, task.notebookId);
        if (res.success) {
            toast.success("Task deleted");
        } else {
            toast.error("Failed to delete task");
        }
        setIsLoading(false);
    }

    return (
        <Card className={cn("rounded-md group relative", isLoading && "opacity-50 pointer-events-none")}>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 rounded-md">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            )}
            <CardHeader className="">
                <div className="flex justify-between items-start">
                    <div className="flex gap-2 items-center">
                        <h4 className="font-semibold text-lg">
                            {task.title}
                        </h4>
                        <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full w-fit",
                            priorityColor[task.priority]
                        )}>
                            {task.priority}
                        </span>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant={"ghost"} size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                                    Change Status
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => handleStatusChange("todo")}>
                                        <Circle className="mr-2 h-4 w-4" />
                                        To Do
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleStatusChange("in-progress")}>
                                        <Timer className="mr-2 h-4 w-4" />
                                        In Progress
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleStatusChange("done")}>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Done
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                {task.tag && (
                    <div className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold
                    transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 w-fit">
                        {task.tag}
                    </div>
                )}
            </CardHeader>
            <CardContent className="">
                {task.description && (
                    <div className="">
                        {task.description}
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-0 flex items-center justify-between text-muted-foreground">
                <div className="flex items-center gap-2 text-xs">
                    {task.dueDate && (
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{format(new Date(task.dueDate), "MMM d")}</span>
                        </div>
                    )}
                </div>
            </CardFooter>
            <TaskDialog 
                open={isEditOpen} 
                onOpenChange={setIsEditOpen} 
                notebookId={task.notebookId}
                task={task}
            />
        </Card>
    );
}
