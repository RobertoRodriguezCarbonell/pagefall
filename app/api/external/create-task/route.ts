import { db } from "@/db/drizzle";
import { tasks } from "@/db/schema";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // 1. Verificación de Seguridad
    const apiKey = req.headers.get("x-api-key");

    if (apiKey !== process.env.PAGEFALL_API_KEY) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid API Key" },
        { status: 401 }
      );
    }

    // 2. Obtener datos del cuerpo de la petición
    const body = await req.json();
    const { title, notebookId, description, priority, dueDate, tag } = body;

    // 3. Validaciones básicas
    if (!title || !notebookId) {
      return NextResponse.json(
        { error: "Missing required fields: title or notebookId" },
        { status: 400 }
      );
    }

    // 4. Insertar la tarea
    const newTask = await db
      .insert(tasks)
      .values({
        title,
        notebookId,
        description: description || "",
        priority: priority || "medium",
        status: "todo",
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