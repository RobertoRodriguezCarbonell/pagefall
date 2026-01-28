"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Clock, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TaskProps {
    task: {
        id: string;
        title: string;
        description?: string;
        priority: "low" | "medium" | "high";
        dueDate?: string;
        tag?: string;
        assignedTo?: string;
        status: string;
    }
}

export function TaskCard({ task }: TaskProps) {
    const priorityColor = {
        low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };

    return (
        <Card className="rounded-md">
            <CardHeader className="">
                <div className="flex justify-between items-start">
                    <div className="flex gap-2 items-center">
                        <h4 className="font-semibold text-sm leading-tight text-foreground/90 group-hover:text-primary transition-colors">
                            {task.title}
                        </h4>
                        <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full w-fit",
                            priorityColor[task.priority]
                        )}>
                            {task.priority}
                        </span>
                    </div>
                    <Button variant={"outline"} size="icon" className="h-6 w-6">
                        <MoreHorizontal />
                    </Button>
                </div>
                {task.tag && (
                    <div className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 w-fit">
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
                            <span>{task.dueDate}</span>
                        </div>
                    )}
                </div>
                <div className="flex -space-x-2">
                    {task.assignedTo && (
                        <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary font-medium text-xs">
                            {task.assignedTo.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
            </CardFooter>
        </Card>
    );
}
