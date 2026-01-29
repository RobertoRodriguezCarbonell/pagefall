import { db } from "@/db/drizzle";
import { tasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function DELETE(req: Request) {
  try {
    // 1. Security Check
    const apiKey = req.headers.get("x-api-key");

    if (apiKey !== process.env.PAGEFALL_API_KEY) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid API Key" },
        { status: 401 }
      );
    }

    // 2. Get data from body or query params
    // For DELETE requests, it's common to pass IDs in the body or URL
    // We'll support JSON body here for consistency with other endpoints
    const body = await req.json();
    const { taskId, notebookId } = body;

    // 3. Validate required identifiers
    if (!taskId || !notebookId) {
      return NextResponse.json(
        { error: "Missing required fields: taskId, notebookId" },
        { status: 400 }
      );
    }

    // 4. Delete the task
    // We assume both IDs must match for security/integrity
    const deletedTask = await db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.notebookId, notebookId)))
      .returning();

    if (!deletedTask.length) {
      return NextResponse.json(
        { error: "Task not found or does not belong to the provided notebook" },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
        success: true, 
        message: "Task deleted successfully",
        deletedId: deletedTask[0].id 
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}