"use client";

import { PageWrapper } from "@/components/page-wrapper";
import RichTextEditor from "@/components/rich-text-editor";
import { AIChat } from "@/components/ai-chat";
import { JSONContent } from "@tiptap/react";
import { useState, useCallback } from "react";

interface NotePageClientProps {
    note: {
        id: string;
        title: string;
        content: JSONContent[];
        notebook?: {
            id: string;
            name: string;
        };
    } | null;
}

export default function NotePageClient({ note }: NotePageClientProps) {
    const [insertContentFn, setInsertContentFn] = useState<((text: string) => void) | null>(null);
    const [replaceContentFn, setReplaceContentFn] = useState<((text: string) => void) | null>(null);

    const noteContentString = note?.content 
        ? JSON.stringify(note.content)
        : undefined;

    const handleEditorReady = useCallback((insertFn: (text: string) => void, replaceFn: (text: string) => void) => {
        setInsertContentFn(() => insertFn);
        setReplaceContentFn(() => replaceFn);
    }, []);

    return (
        <PageWrapper breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: note?.notebook?.name ?? "Notebook", href: `/dashboard/notebook/${note?.notebook?.id}` },
            { label: note?.title ?? "Note", href: `/dashboard/notebook/${note?.notebook?.id}/note/${note?.id}` },
        ]}>
            <h1>{note?.title}</h1>
            <RichTextEditor 
                content={note?.content as JSONContent[]}
                noteId={note?.id}
                noteTitle={note?.title}
                onEditorReady={handleEditorReady}
            />
            <AIChat 
                noteContent={noteContentString}
                noteTitle={note?.title}
                onInsertContent={insertContentFn || undefined}
                onReplaceContent={replaceContentFn || undefined}
            />
        </PageWrapper>
    );
}
