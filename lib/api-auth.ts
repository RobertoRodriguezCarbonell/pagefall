import { db } from "@/db/drizzle";
import { notebooks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function verifyNotebookApiKey(apiKey: string | null, notebookId: string) {
    if (!apiKey) return false;

    // Check if key starts with correct prefix to avoid DB hits on obviously wrong keys
    if (!apiKey.startsWith("pf_")) return false;

    // Fetch notebook and check key
    const notebook = await db.query.notebooks.findFirst({
        where: eq(notebooks.id, notebookId),
        columns: {
            apiKey: true
        }
    });

    if (!notebook || !notebook.apiKey) return false;

    // Secure string comparison could be better but simple strict equality is fine here for now
    return notebook.apiKey === apiKey;
}
