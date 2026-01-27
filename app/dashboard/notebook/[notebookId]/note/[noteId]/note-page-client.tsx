"use client";

import { PageWrapper } from "@/components/page-wrapper";
import RichTextEditor from "@/components/rich-text-editor";
import { AIChat } from "@/components/ai-chat";
import { AISelectionPopup } from "@/components/ai-selection-popup";
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
    const [getEditorHTMLFn, setGetEditorHTMLFn] = useState<(() => string) | null>(null);
    const [replaceSelectionFn, setReplaceSelectionFn] = useState<((text: string) => void) | null>(null);
    
    // Selection popup state
    const [selectionPopup, setSelectionPopup] = useState<{
        text: string;
        position: { top: number; left: number };
    } | null>(null);

    const handleEditorReady = useCallback((insertFn: (text: string) => void, replaceFn: (text: string) => void, getHTMLFn: () => string, replaceSelectionFn: (text: string) => void) => {
        setInsertContentFn(() => insertFn);
        setReplaceContentFn(() => replaceFn);
        setGetEditorHTMLFn(() => getHTMLFn);
        setReplaceSelectionFn(() => replaceSelectionFn);
    }, []);

    const handleTextSelection = useCallback((text: string, position: { top: number; left: number }) => {
        setSelectionPopup({ text, position });
    }, []);

    const handleClosePopup = useCallback(() => {
        setSelectionPopup(null);
    }, []);

    const handleApplyToSelection = useCallback((newText: string) => {
        if (replaceSelectionFn) {
            replaceSelectionFn(newText);
        }
    }, [replaceSelectionFn]);

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
                onTextSelection={handleTextSelection}
            />
            <AIChat 
                noteTitle={note?.title}
                onInsertContent={insertContentFn || undefined}
                onReplaceContent={replaceContentFn || undefined}
                getEditorHTML={getEditorHTMLFn || undefined}
            />
            {selectionPopup && (
                <AISelectionPopup
                    selectedText={selectionPopup.text}
                    position={selectionPopup.position}
                    onClose={handleClosePopup}
                    onApply={handleApplyToSelection}
                />
            )}
        </PageWrapper>
    );
}
