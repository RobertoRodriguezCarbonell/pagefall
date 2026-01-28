"use client";

import { z } from "zod";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "./ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Loader2, Plus, Flag, Calendar as CalendarIcon, Tag, Circle, Timer, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { createTask, updateTask } from "@/server/tasks";
import { Task } from "@/db/schema";

const formSchema = z.object({
  title: z.string().min(2).max(50),
  description: z.string().optional(),
  status: z.enum(["todo", "in-progress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.date().optional(),
  tag: z.string().optional(),
});

interface TaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    notebookId: string;
    task?: Task; // If provided, we are in "Edit" mode
    defaultStatus?: "todo" | "in-progress" | "done";
}

export const TaskDialog = ({ open, onOpenChange, notebookId, task, defaultStatus = "todo" }: TaskDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      status: defaultStatus,
      priority: "medium",
      tag: "",
    },
  });

  // Reset form when task changes (or when opening/closing in a way that should reset)
  useEffect(() => {
    if (task) {
        form.reset({
            title: task.title,
            description: task.description || "",
            status: task.status as "todo" | "in-progress" | "done",
            priority: task.priority as "low" | "medium" | "high",
            dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
            tag: task.tag || "",
        });
    } else {
        form.reset({
            title: "",
            description: "",
            status: defaultStatus,
            priority: "medium",
            tag: "",
        })
    }
  }, [task, form, open, defaultStatus]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);
      
      let res;
      if (task) {
        // Update existing task
        res = await updateTask(task.id, { ...values, notebookId }, notebookId);
      } else {
        // Create new task
        res = await createTask({ ...values, notebookId });
      }

      if (res.success) {
        toast.success(task ? "Task updated!" : "Task created!");
        onOpenChange(false);
        if (!task) form.reset(); // Only reset on create, keep values on edit if we were to re-open (though we close)
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  const isEdit = !!task;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Task" : "Create New Task"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Make changes to your task here." : "Add a new task to your board."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Task title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add a description..." className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                     <div className="flex gap-2">
                        {["todo", "in-progress", "done"].map((status) => (
                            <div 
                                key={status}
                                className={cn(
                                    "cursor-pointer px-4 py-2 rounded-md border text-sm font-medium transition-all capitalize flex items-center gap-2",
                                    field.value === status 
                                        ? "bg-primary text-primary-foreground border-primary" 
                                        : "bg-background hover:bg-muted text-muted-foreground border-input"
                                )}
                                onClick={() => field.onChange(status)}
                            >
                                {status === "todo" && <Circle className="h-3 w-3" />}
                                {status === "in-progress" && <Timer className="h-3 w-3" />}
                                {status === "done" && <CheckCircle className="h-3 w-3" />}
                                {status === "in-progress" ? "In Progress" : status}
                            </div>
                        ))}
                     </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <FormControl>
                     <div className="flex gap-2">
                        {["low", "medium", "high"].map((priority) => (
                            <div 
                                key={priority}
                                className={cn(
                                    "cursor-pointer px-4 py-2 rounded-md border text-sm font-medium transition-all capitalize flex items-center gap-2",
                                    field.value === priority 
                                        ? "bg-primary text-primary-foreground border-primary" 
                                        : "bg-background hover:bg-muted text-muted-foreground border-input"
                                )}
                                onClick={() => field.onChange(priority)}
                            >
                                <Flag className={cn(
                                    "h-3 w-3",
                                    priority === "high" && field.value !== "high" && "text-red-500",
                                    priority === "medium" && field.value !== "medium" && "text-yellow-500",
                                    priority === "low" && field.value !== "low" && "text-blue-500",
                                )} />
                                {priority}
                            </div>
                        ))}
                     </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
                <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                    <FormItem className="flex-1 flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                    {field.value ? (
                                        format(field.value, "PPP")
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date: Date) =>
                                    date < new Date("1900-01-01")
                                }
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <FormField
                control={form.control}
                name="tag"
                render={({ field }) => (
                    <FormItem className="flex-1">
                    <FormLabel>Tag</FormLabel>
                    <FormControl>
                         <div className="relative">
                            <Tag className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="e.g. Design" className="pl-9" {...field} />
                        </div>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <div className="flex justify-end pt-4">
                <Button disabled={isLoading} type="submit">
                {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                ) : (
                    isEdit ? "Save Changes" : "Create Task"
                )}
                </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
