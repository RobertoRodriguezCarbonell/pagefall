import { db } from "@/db/drizzle";
import { apiKeys } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type Permission = 'read_only' | 'full_access';

export async function verifyNotebookApiKey(apiKey: string | null, notebookId: string, requiredPermission: Permission = 'read_only') {
    if (!apiKey) return false;

    // Check if key starts with correct prefix to avoid DB hits on obviously wrong keys
    if (!apiKey.startsWith("pf_")) return false;

    // Find the key for the specific notebook
    const keyRecord = await db.query.apiKeys.findFirst({
        where: and(
            eq(apiKeys.key, apiKey),
            eq(apiKeys.notebookId, notebookId)
        )
    });

    if (!keyRecord) return false;

    // Permission check
    // If full_access is required, the key must have full_access.
    // If read_only is required, both read_only and full_access keys work.
    if (requiredPermission === 'full_access' && keyRecord.permission !== 'full_access') {
        return false;
    }

    // Update last used timestamp (fire and forget mostly, but we await to be safe)
    try {
        await db.update(apiKeys)
            .set({ lastUsedAt: new Date() })
            .where(eq(apiKeys.id, keyRecord.id));
    } catch (e) {
        console.error("Failed to update api key last usage", e);
    }

    return true;
}
