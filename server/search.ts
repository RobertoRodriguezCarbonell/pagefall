"use server";

import { db } from "@/db/drizzle";
import { notebooks, notes, tasks } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, ilike, or, and, sql, desc } from "drizzle-orm";
import { headers } from "next/headers";

export const getRecentNotes = async () => {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        const userId = session?.user?.id;

        if (!userId) {
            return { success: false, message: "User not found" };
        }

        const recentNotes = await db.select({
            id: notes.id,
            title: notes.title,
            type: sql<string>`'note'`,
            notebookId: notes.notebookId
        }).from(notes)
        .innerJoin(notebooks, eq(notes.notebookId, notebooks.id))
        .where(eq(notebooks.userId, userId))
        .orderBy(desc(notes.updatedAt))
        .limit(10);

         return { success: true, results: recentNotes };

    } catch (error) {
        console.error("Recent notes error:", error);
         return { success: false, message: "Failed to fetch recent notes" };
    }
}

export const getRecentNotebooks = async () => {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        const userId = session?.user?.id;

        if (!userId) {
            return { success: false, message: "User not found" };
        }

        const recentNotebooks = await db.select({
            id: notebooks.id,
            title: notebooks.name,
            type: sql<string>`'notebook'`,
            notebookId: notebooks.id
        }).from(notebooks)
        .where(eq(notebooks.userId, userId))
        .orderBy(desc(notebooks.updatedAt))
        .limit(10);

         return { success: true, results: recentNotebooks };

    } catch (error) {
        console.error("Recent notebooks error:", error);
         return { success: false, message: "Failed to fetch recent notebooks" };
    }
}

export const searchDocuments = async (query: string) => {
    try {
        if (!query || query.trim().length === 0) {
            return { success: true, results: [] };
        }

        const session = await auth.api.getSession({
            headers: await headers()
        });

        const userId = session?.user?.id;

        if (!userId) {
            return { success: false, message: "User not found" };
        }

        // Search notebooks
        const foundNotebooks = await db.select({
            id: notebooks.id,
            title: notebooks.name,
            type: sql<string>`'notebook'`,
            notebookId: notebooks.id // For notebooks, the ID is the notebook ID
        }).from(notebooks)
        .where(
            and(
                eq(notebooks.userId, userId),
                ilike(notebooks.name, `%${query}%`)
            )
        );

        // Search notes
        // We need to join with notebooks to ensure we only get notes for the current user
        const foundNotes = await db.select({
            id: notes.id,
            title: notes.title,
            type: sql<string>`'note'`,
            notebookId: notes.notebookId
        }).from(notes)
        .innerJoin(notebooks, eq(notes.notebookId, notebooks.id))
        .where(
            and(
                eq(notebooks.userId, userId),
                ilike(notes.title, `%${query}%`)
            )
        );

        return { 
            success: true, 
            results: [...foundNotebooks, ...foundNotes] 
        };
    } catch (error) {
        console.error("Search error:", error);
        return { success: false, message: "Failed to perform search" };
    }
};

export const searchTasks = async (query: string) => {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        const userId = session?.user?.id;

        if (!userId) {
            return { success: false, message: "User not found" };
        }

        const foundTasks = await db.select({
            id: tasks.id,
            title: tasks.title,
            status: tasks.status,
            priority: tasks.priority,
            notebookId: tasks.notebookId
        }).from(tasks)
        .innerJoin(notebooks, eq(tasks.notebookId, notebooks.id))
        .where(
            and(
                eq(notebooks.userId, userId),
                ilike(tasks.title, `%${query}%`)
            )
        )
        .limit(10);

        return { success: true, results: foundTasks };
    } catch (error) {
        console.error("Search tasks error:", error);
        return { success: false, message: "Failed to search tasks" };
    }
}

