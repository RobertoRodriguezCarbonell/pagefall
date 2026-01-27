"use server";

import { db } from "@/db/drizzle";
import { comments } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and, desc } from "drizzle-orm";

export async function createComment(data: {
  noteId: string;
  content: string;
  selectionText?: string;
  selectionStart?: string;
  selectionEnd?: string;
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const [comment] = await db
      .insert(comments)
      .values({
        noteId: data.noteId,
        userId: session.user.id,
        content: data.content,
        selectionText: data.selectionText,
        selectionStart: data.selectionStart,
        selectionEnd: data.selectionEnd,
        resolved: false,
      })
      .returning();

    return { success: true, comment };
  } catch (error) {
    console.error("Error creating comment:", error);
    return { success: false, error: "Failed to create comment" };
  }
}

export async function getCommentsByNoteId(noteId: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const noteComments = await db.query.comments.findMany({
      where: eq(comments.noteId, noteId),
      orderBy: [desc(comments.createdAt)],
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return { success: true, comments: noteComments };
  } catch (error) {
    console.error("Error fetching comments:", error);
    return { success: false, error: "Failed to fetch comments" };
  }
}

export async function updateCommentResolved(commentId: string, resolved: boolean) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const [comment] = await db
      .update(comments)
      .set({ resolved, updatedAt: new Date() })
      .where(and(eq(comments.id, commentId), eq(comments.userId, session.user.id)))
      .returning();

    if (!comment) {
      return { success: false, error: "Comment not found or unauthorized" };
    }

    return { success: true, comment };
  } catch (error) {
    console.error("Error updating comment:", error);
    return { success: false, error: "Failed to update comment" };
  }
}

export async function deleteComment(commentId: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const [deletedComment] = await db
      .delete(comments)
      .where(and(eq(comments.id, commentId), eq(comments.userId, session.user.id)))
      .returning();

    if (!deletedComment) {
      return { success: false, error: "Comment not found or unauthorized" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting comment:", error);
    return { success: false, error: "Failed to delete comment" };
  }
}
