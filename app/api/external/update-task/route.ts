import { db } from "@/db/drizzle";
import { tasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { verifyNotebookApiKey } from "@/lib/api-auth";

export async function POST(req: Request) {
  try {
    // 1. Get data from body first
    const body = await req.json();
    const { taskId, notebookId, ...updates } = body;

    // 2. Security Check (Per-Notebook)
    const apiKey = req.headers.get("x-api-key");
    if (!notebookId || !(await verifyNotebookApiKey(apiKey, notebookId, 'full_access'))) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid API Key or Notebook ID (Full Access Required)" },
        { status: 401 }
      );
    }
    
    // 3. Validate required identifiers
    if (!taskId || !notebookId) {
      return NextResponse.json(
        { error: "Missing required fields: taskId, notebookId" },
        { status: 400 }
      );
    }

    // 4. Validate fields to update
    const validFields = ["title", "description", "status", "priority", "dueDate", "tag"];
    const updateData: any = {};

    for (const key of Object.keys(updates)) {
      if (validFields.includes(key)) {
        if (key === "dueDate" && updates[key]) {
             updateData[key] = new Date(updates[key]);
        } else {
             updateData[key] = updates[key];
        }
      }
    }

    // Add updatedAt timestamp
    updateData.updatedAt = new Date();

    if (Object.keys(updateData).length <= 1) { // Only updatedAt added
         return NextResponse.json({ message: "No valid fields to update provided" }, { status: 400 });
    }

    // 5. Update the task
    // We check both taskId and notebookId to ensure data integrity
    const updatedTask = await db
      .update(tasks)
      .set(updateData)
      .where(and(eq(tasks.id, taskId), eq(tasks.notebookId, notebookId)))
      .returning();

    if (!updatedTask.length) {
      return NextResponse.json(
        { error: "Task not found or does not belong to the provided notebook" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, task: updatedTask[0] });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}