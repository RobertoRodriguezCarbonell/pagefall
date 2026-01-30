"use server";

import { db } from "@/db/drizzle";
import { InsertNote, notes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkNotebookAccess } from "@/server/notebooks";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const createNote = async (values: InsertNote) => {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        
        if (!session?.user?.id) return { success: false, message: "Unauthorized" };
        
        if (!values.notebookId) return { success: false, message: "Notebook ID is required" };

        const access = await checkNotebookAccess(values.notebookId, session.user.id, 'canCreate');
        if (!access.allowed) return { success: false, message: "You don't have permission to create notes in this notebook" };

        await db.insert(notes).values(values);
        return { success: true, message: "Note created successfully" };
    } catch {
        return { success: false, message: "Failed to create note" };
    }
};

export const getNoteById = async (id: string) => {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        
        if (!session?.user?.id) return { success: false, message: "Unauthorized" };

        const note = await db.query.notes.findFirst({
            where: eq(notes.id, id),
            with: {
                notebook: true
            }
        });

        if (!note) return { success: false, message: "Note not found" };

        // Check read access (no specific permission needed, just membership)
        const access = await checkNotebookAccess(note.notebookId, session.user.id);
        if (!access.allowed) return { success: false, message: "Unauthorized access to this note" };

        return { success: true, note };
    } catch {
        return { success: false, message: "Failed to get note" };
    }
};

export const updateNote = async (id: string, values: Partial<InsertNote>) => {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        
        if (!session?.user?.id) return { success: false, message: "Unauthorized" };

        // 1. Get the note to find the notebookId
        const note = await db.query.notes.findFirst({
            where: eq(notes.id, id),
        });

        if (!note) return { success: false, message: "Note not found" };

        // 2. Check permissions
        const access = await checkNotebookAccess(note.notebookId, session.user.id, 'canEdit');
        if (!access.allowed) return { success: false, message: "You don't have permission to edit notes in this notebook" };

        // 🔍 Debug: Log what we're receiving from the client
        if (values.content) {
        }
        
        await db.update(notes).set(values).where(eq(notes.id, id));
        return { success: true, message: "Note updated successfully" };
    } catch (error) {
        console.error('❌ Server error saving note:', error);
        return { success: false, message: "Failed to update note" };
    }
};

export const saveNoteContent = async (id: string, contentJson: string) => {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        
        if (!session?.user?.id) return { success: false, message: "Unauthorized" };

        // 1. Get the note to find the notebookId
        const note = await db.query.notes.findFirst({
            where: eq(notes.id, id),
        });

        if (!note) return { success: false, message: "Note not found" };

        // 2. Check permissions
        const access = await checkNotebookAccess(note.notebookId, session.user.id, 'canEdit');
        if (!access.allowed) return { success: false, message: "You don't have permission to edit notes in this notebook" };

        const content = JSON.parse(contentJson);
        
        await db.update(notes).set({ content }).where(eq(notes.id, id));
        return { success: true, message: "Note content saved successfully" };
    } catch (error) {
        console.error('❌ Error in saveNoteContent:', error);
        return { success: false, message: "Failed to save note content" };
    }
};

export const deleteNote = async (id: string) => {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        
        if (!session?.user?.id) return { success: false, message: "Unauthorized" };

        // 1. Get the note to find the notebookId
        const note = await db.query.notes.findFirst({
            where: eq(notes.id, id),
        });

        if (!note) return { success: false, message: "Note not found" };

        // 2. Check permissions
        const access = await checkNotebookAccess(note.notebookId, session.user.id, 'canDelete');
        if (!access.allowed) return { success: false, message: "You don't have permission to delete notes in this notebook" };

        await db.delete(notes).where(eq(notes.id, id));
        return { success: true, message: "Note deleted successfully" };
    } catch {
        return { success: false, message: "Failed to delete note" };
    }
};
