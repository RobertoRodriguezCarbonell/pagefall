"use server";

import { db } from "@/db/drizzle";
import { notebooks, apiKeys } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import crypto from "crypto";

// Obtener todas las keys de un notebook
export const getNotebookApiKeys = async (notebookId: string) => {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    // Verificar ownership del notebook
    const notebook = await db.query.notebooks.findFirst({
        where: and(
            eq(notebooks.id, notebookId),
            eq(notebooks.userId, session.user.id)
        )
    });

    if (!notebook) return { success: false, error: "Notebook not found" };

    // Obtener keys
    const keys = await db.query.apiKeys.findMany({
        where: eq(apiKeys.notebookId, notebookId),
        orderBy: [desc(apiKeys.createdAt)]
    });

    // Mask keys for display
    const maskedKeys = keys.map(k => ({
        ...k,
        key: k.key.substring(0, 6) + "..." + k.key.substring(k.key.length - 4)
    }));

    return { success: true, keys: maskedKeys };
};

// Crear una nueva API Key
export const createNotebookApiKey = async (notebookId: string, name: string, permission: 'read_only' | 'full_access') => {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const notebook = await db.query.notebooks.findFirst({
        where: and(
            eq(notebooks.id, notebookId),
            eq(notebooks.userId, session.user.id)
        )
    });

    if (!notebook) return { success: false, error: "Notebook not found" };

    const apiKey = `pf_${crypto.randomBytes(16).toString('hex')}`;

    try {
        const [newKey] = await db.insert(apiKeys).values({
            notebookId,
            name,
            permission,
            key: apiKey
        }).returning();
        
        return { success: true, apiKey: newKey };
    } catch (error) {
        console.error("Error creating API Key:", error);
        return { success: false, error: "Failed to create API Key" };
    }
};

// Eliminar (revocar) una API Key
export const deleteNotebookApiKey = async (keyId: string) => {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    // Verificar que la key pertenece a un notebook del usuario
    const key = await db.query.apiKeys.findFirst({
        where: eq(apiKeys.id, keyId),
        with: {
            notebook: true
        }
    });

    if (!key || !key.notebook) return { success: false, error: "Key not found" };

    if (key.notebook.userId !== session.user.id) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await db.delete(apiKeys).where(eq(apiKeys.id, keyId));
        return { success: true };
    } catch (error) {
         console.error("Error deleting API Key:", error);
        return { success: false, error: "Failed to delete API Key" };
    }
};
