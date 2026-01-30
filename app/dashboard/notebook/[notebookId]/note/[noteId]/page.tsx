import { getNoteById } from "@/server/notes";
import { JSONContent } from "@tiptap/react";
import NotePageClient from "./note-page-client";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { checkNotebookAccess } from "@/server/notebooks";

type Params = Promise<{
    noteId: string;
}>;

export default async function NotePage({ params }: { params: Params }) {
    const { noteId } = await params;
    const { note } = await getNoteById(noteId);
    
    // Check permissions
    const session = await auth.api.getSession({
        headers: await headers()
    });
    
    let readOnly = true;
    
    if (note?.notebookId && session?.user?.id) {
        const access = await checkNotebookAccess(note.notebookId, session.user.id, 'canEdit');
        readOnly = !access.allowed;
    }

    const transformedNote = note ? {
        id: note.id,
        title: note.title,
        content: note.content as JSONContent[],
        notebook: note.notebook ? {
            id: note.notebook.id,
            name: note.notebook.name,
        } : undefined,
    } : null;

    return <NotePageClient note={transformedNote} readOnly={readOnly} />;
}