import { db } from "@/db/drizzle";
import { tasks } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { verifyNotebookApiKey } from "@/lib/api-auth";

export async function GET(req: Request) {
  try {
    // 1. Get notebookId from URL params FIRST
    const { searchParams } = new URL(req.url);
    const notebookId = searchParams.get("notebookId");

    // 2. Security Check (Per-Notebook)
    const apiKey = req.headers.get("x-api-key");
    if (!notebookId || !(await verifyNotebookApiKey(apiKey, notebookId))) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid API Key or Notebook ID" },
        { status: 401 }
      );
    }
    
    // 3. Fetch tasks
    const notebookTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.notebookId, notebookId))
      .orderBy(desc(tasks.createdAt));

    return NextResponse.json({ 
      success: true, 
      count: notebookTasks.length,
      tasks: notebookTasks 
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}