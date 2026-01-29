import { db } from "@/db/drizzle";
import { tasks } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    // 1. Security Check
    const apiKey = req.headers.get("x-api-key");

    if (apiKey !== process.env.PAGEFALL_API_KEY) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid API Key" },
        { status: 401 }
      );
    }

    // 2. Get notebookId from URL params
    const { searchParams } = new URL(req.url);
    const notebookId = searchParams.get("notebookId");

    if (!notebookId) {
      return NextResponse.json(
        { error: "Missing required parameter: notebookId" },
        { status: 400 }
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