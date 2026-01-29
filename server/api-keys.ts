"use server";

import { db } from "@/db/drizzle";
import { notebooks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import crypto from "crypto";

// Generar una nueva API Key para un notebook específico
export const generateNotebookApiKey = async (notebookId: string) => {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" };
    }

    // Verificar que el notebook pertenece al usuario
    const notebook = await db.query.notebooks.findFirst({
        where: and(
            eq(notebooks.id, notebookId),
            eq(notebooks.userId, session.user.id)
        )
    });

    if (!notebook) {
        return { success: false, error: "Notebook not found" };
    }

    // Generar Key: prefijo 'pf_' + 32 caracteres random en hex
    const apiKey = `pf_${crypto.randomBytes(16).toString('hex')}`;

    try {
        await db.update(notebooks)
            .set({ apiKey })
            .where(eq(notebooks.id, notebookId));
        
        return { success: true, apiKey };
    } catch (error) {
        console.error("Error generating API Key:", error);
        return { success: false, error: "Failed to generate API Key" };
    }
};

// Revocar (eliminar) la API Key
export const revokeNotebookApiKey = async (notebookId: string) => {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" };
    }

    // Verificar propiedad
    const notebook = await db.query.notebooks.findFirst({
        where: and(
            eq(notebooks.id, notebookId),
            eq(notebooks.userId, session.user.id)
        )
    });

    if (!notebook) {
        return { success: false, error: "Notebook not found" };
    }

    try {
        await db.update(notebooks)
            .set({ apiKey: null })
            .where(eq(notebooks.id, notebookId));
        
        return { success: true };
    } catch (error) {
        console.error("Error revoking API Key:", error);
        return { success: false, error: "Failed to revoke API Key" };
    }
};
