import { getNoteById } from "@/server/notes";
import { JSONContent } from "@tiptap/react";
import NotePageClient from "./note-page-client";

type Params = Promise<{
    noteId: string;
}>;

export default async function NotePage({ params }: { params: Params }) {
    const { noteId } = await params;
    const { note } = await getNoteById(noteId);

    const transformedNote = note ? {
        id: note.id,
        title: note.title,
        content: note.content as JSONContent[],
        notebook: note.notebook ? {
            id: note.notebook.id,
            name: note.notebook.name,
        } : undefined,
    } : null;

    return <NotePageClient note={transformedNote} />;
}