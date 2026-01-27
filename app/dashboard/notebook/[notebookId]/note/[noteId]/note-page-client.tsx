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
    const [manualReplaceFn, setManualReplaceFn] = useState<((text: string) => void) | null>(null);
    const [toggleStyleFn, setToggleStyleFn] = useState<((style: string) => void) | null>(null);
    
    // Selection popup state
    const [selectionPopup, setSelectionPopup] = useState<{
        text: string;
        position: { top: number; left: number; placement?: 'top' | 'bottom' };
        activeStyles?: Record<string, boolean>;
    } | null>(null);

    const handleEditorReady = useCallback((
        insertFn: (text: string) => void, 
        replaceFn: (text: string) => void, 
        getHTMLFn: () => string, 
        replaceSelectionFn: (text: string) => void, 
        manualReplaceFn: (text: string) => void,
        toggleStyleFn: (style: string) => void
    ) => {
        setInsertContentFn(() => insertFn);
        setReplaceContentFn(() => replaceFn);
        setGetEditorHTMLFn(() => getHTMLFn);
        setReplaceSelectionFn(() => replaceSelectionFn);
        setManualReplaceFn(() => manualReplaceFn);
        setToggleStyleFn(() => toggleStyleFn);
    }, []);

    const handleTextSelection = useCallback((text: string, position: { top: number; left: number; placement?: 'top' | 'bottom' }, activeStyles?: Record<string, boolean>) => {
        setSelectionPopup({ text, position, activeStyles });
    }, []);

    const handleClosePopup = useCallback(() => {
        setSelectionPopup(null);
    }, []);

    const handleApplyToSelection = useCallback((newText: string, isManual?: boolean) => {
        // If it sends a style command (simple string like 'bold', 'h1'), use toggleStyleFn
        // But the previous implementation sent HTML for Style Apply.
        // We will adapt the Popup to call a new prop onToggleStyle, or we misuse this one.
        // For now, let's keep this for text replacement.
        if (isManual && manualReplaceFn) {
            manualReplaceFn(newText);
        } else if (replaceSelectionFn) {
            replaceSelectionFn(newText);
        }
    }, [replaceSelectionFn, manualReplaceFn]);

    const handleToggleStyle = useCallback((style: string) => {
        if (toggleStyleFn) {
            toggleStyleFn(style);
        }
    }, [toggleStyleFn]);

    return (
        <PageWrapper breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: note?.notebook?.name ?? "Notebook", href: `/dashboard/notebook/${note?.notebook?.id}` },
            { label: note?.title ?? "Note", href: `/dashboard/notebook/${note?.notebook?.id}/note/${note?.id}` },
        ]}>
            <div className="flex flex-row h-[calc(100vh-8rem)] gap-6 items-start">
                {/* Left Side: Editor Area */}
                <div className="flex-1 w-full h-full min-w-0 pr-2 overflow-hidden flex flex-col">
                    <div className="max-w-4xl mx-auto w-full h-full flex flex-col space-y-4">
                        <h1 className="text-3xl font-bold px-1 shrink-0">{note?.title}</h1>
                        <RichTextEditor 
                            content={note?.content as JSONContent[]}
                            noteId={note?.id}
                            noteTitle={note?.title}
                            className="flex-1 min-h-0 flex flex-col"
                            onEditorReady={handleEditorReady}
                            onTextSelection={handleTextSelection}
                        />
                    </div>
                </div>

                {/* Right Side: AI Chat (Responsive) 
                    - On Mobile: Container is present but empty of flow content (since child is fixed).
                    - On Desktop: Container has width and holds the static sidebar.
                */}
                <div className="shrink-0 lg:w-[600px] xl:w-[700px] h-full rounded-lg border lg:border-border overflow-hidden transition-all duration-300 shadow-sm bg-background">
                    <AIChat 
                        noteTitle={note?.title}
                        onInsertContent={insertContentFn || undefined}
                        onReplaceContent={replaceContentFn || undefined}
                        getEditorHTML={getEditorHTMLFn || undefined}
                    />
                </div>
            </div>

            {selectionPopup && (
                <AISelectionPopup
                    selectedText={selectionPopup.text}
                    position={selectionPopup.position}
                    onClose={handleClosePopup}
                    onApply={handleApplyToSelection}
                    onToggleStyle={handleToggleStyle}
                    activeStyles={selectionPopup.activeStyles}
                    noteTitle={note?.title}
                />
            )}
        </PageWrapper>
    );
}
