"use client";

import { PageWrapper } from "@/components/page-wrapper";
import dynamic from "next/dynamic";
import { AIChat } from "@/components/ai-chat";
import { AISelectionPopup } from "@/components/ai-selection-popup";
import { CommentsPanel } from "@/components/comments-panel";
import { JSONContent } from "@tiptap/react";
import { useState, useCallback, useEffect } from "react";
import { getCommentsByNoteId } from "@/server/comments";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

const RichTextEditor = dynamic(() => import("@/components/rich-text-editor"), {
    ssr: false,
});

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
    const [setCommentMarkFn, setSetCommentMarkFn] = useState<((commentId: string, from: number, to: number) => void) | null>(null);
    const [removeCommentMarkFn, setRemoveCommentMarkFn] = useState<((commentId: string) => void) | null>(null);
    
    // Comments state
    const [comments, setComments] = useState<any[]>([]);
    const [showComments, setShowComments] = useState(false);
    
    // Load comments visibility state from localStorage after mount
    useEffect(() => {
        if (note?.id) {
            const saved = localStorage.getItem(`note-comments-visible-${note.id}`);
            if (saved === 'true') {
                setShowComments(true);
            }
        }
    }, [note?.id]);
    
    // Selection popup state
    const [selectionPopup, setSelectionPopup] = useState<{
        text: string;
        position: { top: number; left: number; placement?: 'top' | 'bottom' };
        activeStyles?: Record<string, boolean>;
        noteId?: string;
        selectionRange?: { from: number; to: number };
    } | null>(null);

    const handleEditorReady = useCallback((
        insertFn: (text: string) => void, 
        replaceFn: (text: string) => void, 
        getHTMLFn: () => string, 
        replaceSelectionFn: (text: string) => void, 
        manualReplaceFn: (text: string) => void,
        toggleStyleFn: (style: string) => void,
        setCommentMarkFn: (commentId: string, from: number, to: number) => void,
        removeCommentMarkFn: (commentId: string) => void
    ) => {
        setInsertContentFn(() => insertFn);
        setReplaceContentFn(() => replaceFn);
        setGetEditorHTMLFn(() => getHTMLFn);
        setReplaceSelectionFn(() => replaceSelectionFn);
        setManualReplaceFn(() => manualReplaceFn);
        setToggleStyleFn(() => toggleStyleFn);
        setSetCommentMarkFn(() => setCommentMarkFn);
        setRemoveCommentMarkFn(() => removeCommentMarkFn);
    }, []);

    const handleTextSelection = useCallback((text: string, position: { top: number; left: number; placement?: 'top' | 'bottom' }, activeStyles?: Record<string, boolean>, noteId?: string, selectionRange?: { from: number; to: number }) => {
        setSelectionPopup({ text, position, activeStyles, noteId, selectionRange });
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

    const fetchComments = useCallback(async () => {
        if (!note?.id) return;
        const result = await getCommentsByNoteId(note.id);
        if (result.success && result.comments) {
            setComments(result.comments);
        }
    }, [note?.id]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const handleToggleComments = useCallback(() => {
        setShowComments(prev => {
            const newValue = !prev;
            // Save to localStorage
            if (typeof window !== 'undefined' && note?.id) {
                localStorage.setItem(`note-comments-visible-${note.id}`, String(newValue));
            }
            return newValue;
        });
    }, [note?.id]);

    const handleCommentCreated = useCallback((commentId: string) => {
        if (setCommentMarkFn && selectionPopup?.selectionRange) {
            const { from, to } = selectionPopup.selectionRange;
            setCommentMarkFn(commentId, from, to);
            // Refresh comments list
            fetchComments();
        }
    }, [setCommentMarkFn, selectionPopup, fetchComments]);

    const handleCommentDeleted = useCallback((commentId: string) => {
        if (removeCommentMarkFn) {
            removeCommentMarkFn(commentId);
            fetchComments();
        }
    }, [removeCommentMarkFn, fetchComments]);

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
                        <div className="flex items-center justify-between gap-4 px-1 shrink-0">
                            <h1 className="text-3xl font-bold">{note?.title}</h1>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleToggleComments}
                                className={`h-9 px-3 gap-2 shrink-0 ${showComments ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
                            >
                                <MessageSquare className="h-4 w-4" />
                                {showComments ? 'Hide' : 'Show'} Comments
                                {comments.length > 0 && (
                                    <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 min-w-[1.25rem] text-center font-medium">
                                        {comments.length}
                                    </span>
                                )}
                            </Button>
                        </div>
                        <RichTextEditor 
                            content={note?.content as JSONContent[]}
                            noteId={note?.id}
                            noteTitle={note?.title}
                            className="flex-1 min-h-0 flex flex-col"
                            comments={comments}
                            showComments={showComments}
                            onEditorReady={handleEditorReady}
                            onTextSelection={handleTextSelection}
                        />
                    </div>
                </div>

                {/* Comments Panel */}
                {showComments && (
                    <div className="shrink-0 w-80 h-full border-l bg-background overflow-y-auto">
                        <CommentsPanel comments={comments} onCommentUpdate={fetchComments} onCommentDeleted={handleCommentDeleted} />
                    </div>
                )}

                {/* Right Side: AI Chat (Responsive) 
                    - On Mobile: Container is present but empty of flow content (since child is fixed).
                    - On Desktop: Container has width and holds the static sidebar.
                */}
                <div className="shrink-0 lg:w-[480px] xl:w-[600px] 2xl:w-[1000px] h-full rounded-lg border lg:border-border overflow-hidden transition-all duration-300 shadow-sm bg-background">
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
                    noteId={selectionPopup.noteId}
                    selectionRange={selectionPopup.selectionRange}
                    onCommentCreated={handleCommentCreated}
                />
            )}
        </PageWrapper>
    );
}
