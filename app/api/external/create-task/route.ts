import { db } from "@/db/drizzle";
import { tasks } from "@/db/schema";
import { NextResponse } from "next/server";
import { verifyNotebookApiKey } from "@/lib/api-auth";

export async function POST(req: Request) {
  try {
    // 1. Obtener datos del cuerpo primero para saber el notebook
    const body = await req.json();
    const { title, notebookId, description, priority, dueDate, tag, status } = body;

    // 2. Verificación de Seguridad con DB (Per-Notebook)
    const apiKey = req.headers.get("x-api-key");
    if (!notebookId || !(await verifyNotebookApiKey(apiKey, notebookId, 'full_access'))) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid API Key or Notebook ID (Full Access Required)" },
        { status: 401 }
      );
    }

    // 3. Validaciones básicas
    if (!title) {
      return NextResponse.json(
        { error: "Missing required fields: title" },
        { status: 400 }
      );
    }

    // Validar que el status sea válido si se envía
    const validStatuses = ["todo", "in-progress", "done"];
    const finalStatus = (status && validStatuses.includes(status)) ? status : "todo";

    // 4. Insertar la tarea
    const newTask = await db
      .insert(tasks)
      .values({
        title,
        notebookId,
        description: description || "",
        priority: priority || "medium",
        status: finalStatus, // USAMOS EL STATUS PROCESADO
        dueDate: dueDate ? new Date(dueDate) : null,
        tag: tag || "API",
      })
      .returning();

    return NextResponse.json({ success: true, task: newTask[0] });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}