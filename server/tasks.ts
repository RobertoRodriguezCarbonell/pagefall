"use server";

import { db } from "@/db/drizzle";
import { InsertTask, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export const createTask = async (values: InsertTask) => {
    try {
        await db.insert(tasks).values(values);
        // Revalidate the specific tasks page
        revalidatePath(`/dashboard/notebook/${values.notebookId}/tasks`);
        return { success: true, message: "Task created successfully" };
    } catch (error) {
        console.error("Error creating task:", error);
        return { success: false, message: "Failed to create task" };
    }
};

export const getTasksByNotebookId = async (notebookId: string) => {
    try {
        const notebookTasks = await db.query.tasks.findMany({
            where: eq(tasks.notebookId, notebookId),
            orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
        });

        return { success: true, tasks: notebookTasks };
    } catch (error) {
        console.error("Error fetching tasks:", error);
        return { success: false, tasks: [] };
    }
};

export const updateTask = async (taskId: string, values: Partial<InsertTask>, notebookId: string) => {
    try {
        await db.update(tasks).set({ ...values, updatedAt: new Date() }).where(eq(tasks.id, taskId));
        revalidatePath(`/dashboard/notebook/${notebookId}/tasks`);
        return { success: true, message: "Task updated successfully" };
    } catch {
        return { success: false, message: "Failed to update task" };
    }
};

export const updateTaskStatus = async (taskId: string, status: string, notebookId: string) => {
    try {
        await db.update(tasks).set({ status }).where(eq(tasks.id, taskId));
        revalidatePath(`/dashboard/notebook/${notebookId}/tasks`);
        return { success: true, message: "Task status updated successfully" };
    } catch {
        return { success: false, message: "Failed to update task status" };
    }
};

export const deleteTask = async (taskId: string, notebookId: string) => {
    try {
        await db.delete(tasks).where(eq(tasks.id, taskId));
        revalidatePath(`/dashboard/notebook/${notebookId}/tasks`);
        return { success: true, message: "Task deleted successfully" };
    } catch {
        return { success: false, message: "Failed to delete task" };
    }
};
