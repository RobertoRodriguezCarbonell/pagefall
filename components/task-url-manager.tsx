"use client";

import { Task } from "@/db/schema";
import { TaskDialog } from "./task-dialog";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export function TaskUrlManager({ notebookId, tasks }: { notebookId: string, tasks: Task[] }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const taskId = searchParams.get("taskId");
    const [activeTask, setActiveTask] = useState<Task | undefined>(undefined);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (taskId) {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                setActiveTask(task);
                setIsOpen(true);
            }
        }
    }, [taskId, tasks]);

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete("taskId");
            const newUrl = newParams.toString() 
                ? `/dashboard/notebook/${notebookId}/tasks?${newParams.toString()}` 
                : `/dashboard/notebook/${notebookId}/tasks`;
            router.replace(newUrl, { scroll: false }); // keep scroll position
            // We keep the activeTask until closed to allow animation? 
            // TaskDialog handles logic. 
        }
    }

    if (!activeTask) return null;

    return (
        <TaskDialog 
            open={isOpen} 
            onOpenChange={handleOpenChange} 
            notebookId={notebookId} 
            task={activeTask} 
        />
    );
}
