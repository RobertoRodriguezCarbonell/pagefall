import { getNoteById } from "@/server/notes";
import { JSONContent } from "@tiptap/react";
import NotePageClient from "./note-page-client";

type Params = Promise<{
    noteId: string;
}>;

export default async function NotePage({ params }: { params: Params }) {
    const { noteId } = await params;
    const { note } = await getNoteById(noteId);

    return <NotePageClient note={note} />;
}