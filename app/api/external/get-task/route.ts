import { db } from "@/db/drizzle";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { verifyNotebookApiKey } from "@/lib/api-auth";

export async function GET(req: Request) {
  try {
    // 1. Get the taskId from URL search params FIRST
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        { error: "Missing required parameter: taskId" },
        { status: 400 }
      );
    }

    // 2. We need to fetch the task FIRST to know its notebookId
    const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId),
    });

    if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // 3. Security Check (Per-Notebook)
    const apiKey = req.headers.get("x-api-key");
    if (!(await verifyNotebookApiKey(apiKey, task.notebookId))) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid API Key for this resource" },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, task });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}