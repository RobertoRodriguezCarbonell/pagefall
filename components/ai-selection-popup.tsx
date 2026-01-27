"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, MessageCircle, Wand2, MessageSquarePlus, Type, Heading1, Heading2, Heading3, Pilcrow, Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Check } from "lucide-react";
import { getOpenAIApiKey } from "@/server/settings";
import { createComment } from "@/server/comments";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface AISelectionPopupProps {
    selectedText: string;
    position: { top: number; left: number; placement?: 'top' | 'bottom' };
    onClose: () => void;
    onApply: (newText: string, isManual?: boolean) => void;
    onToggleStyle?: (style: string) => void;
    activeStyles?: Record<string, boolean>;
    noteTitle?: string;
    noteId?: string;
    selectionRange?: { from: number; to: number };
    onCommentCreated?: (commentId: string) => void;
}

export function AISelectionPopup({ selectedText, position, onClose, onApply, onToggleStyle, activeStyles, noteTitle, noteId, selectionRange, onCommentCreated }: AISelectionPopupProps) {
    const [instruction, setInstruction] = useState("");
    const [comment, setComment] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState<string | null>(null);
    const [view, setView] = useState<'menu' | 'ai' | 'comment'>('menu');
    
    const inputRef = useRef<HTMLInputElement>(null);
    const commentInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (view === 'ai') {
            inputRef.current?.focus();
        } else if (view === 'comment') {
            commentInputRef.current?.focus();
        }
    }, [view]);

    const quickActions = [
        { label: "Fix Grammar", prompt: "Fix grammar and spelling errors" },
        { label: "Shorten", prompt: "Make this text more concise" },
        { label: "Make Professional", prompt: "Rewrite in a professional tone" },
        { label: "Translate to English", prompt: "Translate this text to English" },
    ];

    const handleCommentSubmit = async () => {
        if (!comment.trim()) return;
        if (!noteId) {
            toast.error("Note ID is missing");
            return;
        }

        setIsLoading(true);
        try {
            const result = await createComment({
                noteId,
                content: comment,
                selectionText: selectedText,
                selectionStart: selectionRange?.from.toString(),
                selectionEnd: selectionRange?.to.toString(),
            });

            if (result.success) {
                toast.success("Comment added successfully");
                setComment("");
                // Trigger callback to apply comment mark in editor
                if (onCommentCreated && result.comment?.id) {
                    onCommentCreated(result.comment.id);
                }
                onClose();
            } else {
                toast.error(result.error || "Failed to add comment");
            }
        } catch (error) {
            console.error("Error submitting comment:", error);
            toast.error("An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleStyleApply = (tag: string) => {
        if (onToggleStyle) {
            onToggleStyle(tag);
            onClose();
            return;
        }

        // Fallback or legacy handling if onToggleStyle is not provided
        const normalizedText = selectedText.trim();
        let newContent = normalizedText;

        switch (tag) {
            case 'p':
            case 'h1':
            case 'h2':
            case 'h3':
            case 'blockquote':
                newContent = `<${tag}>${normalizedText}</${tag}>`;
                break;
            case 'ul':
                newContent = `<ul><li>${normalizedText}</li></ul>`;
                break;
            case 'ol':
                newContent = `<ol><li>${normalizedText}</li></ol>`;
                break;
            case 'strong': // Mapped from 'bold' if needed, but tag passed is 'bold' usually
                newContent = `<strong>${normalizedText}</strong>`;
                break;
            case 'em':
                 newContent = `<em>${normalizedText}</em>`;
                 break;
             // ... other cases
        }

        onApply(newContent, true);
        onClose();
    };

    const handleAIRequest = async (mode: "apply" | "ask", customPrompt?: string) => {
        const textToProcess = customPrompt || instruction;
        if (!textToProcess.trim()) return;

        setIsLoading(true);
        setResponse(null);

        try {
            const apiKeyResult = await getOpenAIApiKey();

            if (!apiKeyResult.success || !apiKeyResult.apiKey) {
                toast.error("OpenAI API key not configured. Please add it in Settings.");
                setIsLoading(false);
                return;
            }

            // Using structured JSON for agent-like behavior similar to main chat
            const systemPrompt = mode === "apply"
                ? `You are an AI writing assistant. The user is editing a note titled "${noteTitle || 'Untitled'}".
The user has selected text in the editor.

You must respond with a JSON object with this structure:
{
  "content": "<html content here>"
}

RULES:
- content should be the REPLACEMENT HTML for the selected text.
- Use ONLY valid HTML tags: <p>, <h1>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <em>, <code>, <blockquote>
- Close all HTML tags properly.
- IMPORTANT: Do not include ANY bullet characters (•, -, *) or numbering inside <li> tags. The HTML tags handle the list formatting.
- Response must be ONLY the JSON object, nothing else.`
                : `You are a helpful AI assistant. The user has selected text in a note titled "${noteTitle || 'Untitled'}".
Provide a helpful, concise answer to their question. You can explain, analyze, or provide information about the selected text.`;

            const userContent = `Selected Text:
"${selectedText}"

Instruction:
${textToProcess}`;

            const apiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKeyResult.apiKey}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userContent },
                    ],
                    temperature: 0.7,
                    max_tokens: 1000,
                }),
            });

            if (!apiResponse.ok) {
                toast.error("Failed to get AI response. Please check your API key.");
                setIsLoading(false);
                return;
            }

            const data = await apiResponse.json();
            const rawContent = data.choices[0]?.message?.content || "";

            if (rawContent && mode === "apply") {
                try {
                    // Clean potential markdown code blocks
                    let cleanedContent = rawContent.trim();
                    cleanedContent = cleanedContent.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '');
                    
                    const parsed = JSON.parse(cleanedContent);
                    if (parsed.content) {
                        onApply(parsed.content);
                        toast.success("Text updated");
                        onClose();
                    } else {
                        // Fallback in case JSON structure is wrong but content exists
                        onApply(cleanedContent);
                        toast.success("Text updated (fallback)");
                        onClose();
                    }
                } catch (e) {
                    // Fallback for plain text response
                    console.log("JSON parse failed, using raw content");
                    onApply(rawContent.replace(/^```html?\n?/i, '').replace(/\n?```$/i, ''));
                    toast.success("Text updated");
                    onClose();
                }
            } else if (rawContent) {
                 setResponse(rawContent);
                 toast.success("Response received");
            }

        } catch (error) {
            console.error("AI Selection Error:", error);
            toast.error("An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (view === 'comment') {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleCommentSubmit();
            } else if (e.key === "Escape") {
                onClose();
            }
            return;
        }

        if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            handleAIRequest("ask");
        } else if (e.key === "Enter") {
            e.preventDefault();
            handleAIRequest("apply");
        } else if (e.key === "Escape") {
            onClose();
        }
    };

    if (view === 'menu') {
        return (
            <>
                <div 
                    className="fixed inset-0 z-40"
                    onClick={onClose}
                />
                <div
                    className="fixed z-50 flex items-center gap-1 p-1 bg-background border rounded-full shadow-lg transition-all animate-in fade-in zoom-in-95 duration-200"
                    style={{
                        top: `${position.top}px`,
                        left: `${position.left}px`,
                        transform: position.placement === 'top' ? 'translateY(-100%)' : 'none'
                    }}
                >
                    <button
                        onClick={() => setView('ai')}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent rounded-full transition-colors"
                    >
                        <Sparkles className="size-3.5 text-purple-500" />
                        <span className="text-xs font-semibold">Ask AI</span>
                    </button>
                    
                    <div className="w-px h-4 bg-border" />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                             <button
                                className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent rounded-full transition-colors text-muted-foreground hover:text-foreground"                                onMouseDown={(e) => e.preventDefault()}                            >
                                <Type className="size-3.5" />
                                <span className="text-xs font-medium">Style</span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" side="top" className="w-48 max-h-64 overflow-y-auto" onCloseAutoFocus={(e) => e.preventDefault()}>
                            <DropdownMenuItem onSelect={() => handleStyleApply('p')} className="text-xs justify-between">
                                <span className="flex items-center"><Pilcrow className="mr-2 size-3.5" /> Text</span>
                                {activeStyles?.p && <Check className="size-3.5" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleStyleApply('h1')} className="text-xs justify-between">
                                <span className="flex items-center"><Heading1 className="mr-2 size-3.5" /> Heading 1</span>
                                {activeStyles?.h1 && <Check className="size-3.5" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleStyleApply('h2')} className="text-xs justify-between">
                                <span className="flex items-center"><Heading2 className="mr-2 size-3.5" /> Heading 2</span>
                                {activeStyles?.h2 && <Check className="size-3.5" />}
                            </DropdownMenuItem>
                             <DropdownMenuItem onSelect={() => handleStyleApply('h3')} className="text-xs justify-between">
                                <span className="flex items-center"><Heading3 className="mr-2 size-3.5" /> Heading 3</span>
                                {activeStyles?.h3 && <Check className="size-3.5" />}
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem onSelect={() => handleStyleApply('bold')} className="text-xs justify-between">
                                <span className="flex items-center"><Bold className="mr-2 size-3.5" /> Bold</span>
                                {activeStyles?.bold && <Check className="size-3.5" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleStyleApply('italic')} className="text-xs justify-between">
                                <span className="flex items-center"><Italic className="mr-2 size-3.5" /> Italic</span>
                                {activeStyles?.italic && <Check className="size-3.5" />}
                            </DropdownMenuItem>
                             <DropdownMenuItem onSelect={() => handleStyleApply('strike')} className="text-xs justify-between">
                                <span className="flex items-center"><Strikethrough className="mr-2 size-3.5" /> Strike</span>
                                {activeStyles?.strike && <Check className="size-3.5" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleStyleApply('code')} className="text-xs justify-between">
                                <span className="flex items-center"><Code className="mr-2 size-3.5" /> Code</span>
                                {activeStyles?.code && <Check className="size-3.5" />}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onSelect={() => handleStyleApply('bulletList')} className="text-xs justify-between">
                                <span className="flex items-center"><List className="mr-2 size-3.5" /> Bullet List</span>
                                {activeStyles?.bulletList && <Check className="size-3.5" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleStyleApply('orderedList')} className="text-xs justify-between">
                                <span className="flex items-center"><ListOrdered className="mr-2 size-3.5" /> Numbered</span>
                                {activeStyles?.orderedList && <Check className="size-3.5" />}
                            </DropdownMenuItem>
                             <DropdownMenuItem onSelect={() => handleStyleApply('blockquote')} className="text-xs justify-between">
                                <span className="flex items-center"><Quote className="mr-2 size-3.5" /> Quote</span>
                                {activeStyles?.blockquote && <Check className="size-3.5" />}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <div className="w-px h-4 bg-border" />
                    
                    <button
                        onClick={() => setView('comment')}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent rounded-full transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <MessageSquarePlus className="size-3.5" />
                        <span className="text-xs font-medium">Add comment</span>
                    </button>
                </div>
            </>
        );
    }
    
    if (view === 'comment') {
        return (
            <>
                <div className="fixed inset-0 z-40" onClick={onClose} />
                <div
                    className="fixed z-50 w-[400px] bg-background border rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-200"
                    style={{
                        top: `${position.top}px`,
                        left: `${position.left}px`,
                        transform: position.placement === 'top' ? 'translateY(-100%)' : 'none'
                    }}
                >
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded bg-blue-500/10">
                                    <MessageSquarePlus className="size-4 text-blue-500" />
                                </div>
                                <span className="text-sm font-medium text-foreground">Add comment</span>
                            </div>
                        </div>
                        
                        {/* Selected text preview */}
                        <div className="mb-3 p-2 bg-muted/50 rounded-md border">
                            <p className="text-xs text-muted-foreground italic">
                                "{selectedText.length > 100 ? selectedText.substring(0, 100) + '...' : selectedText}"
                            </p>
                        </div>
                        
                        {/* Auto-expanding textarea */}
                        <div className="mb-3">
                            <textarea
                                ref={commentInputRef as any}
                                value={comment}
                                onChange={(e) => {
                                    setComment(e.target.value);
                                    // Auto-resize
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                }}
                                onKeyDown={handleKeyPress}
                                placeholder="Write your comment here..."
                                className="w-full min-h-[80px] max-h-[300px] p-3 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                style={{ overflow: 'hidden' }}
                            />
                            <div className="flex items-center justify-between mt-1.5">
                                <span className="text-xs text-muted-foreground">
                                    {comment.length} characters
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    Press Ctrl+Enter to save
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-2">
                            <Button 
                                variant="outline" 
                                onClick={() => setView('menu')}
                                disabled={isLoading}
                                size="sm"
                            >
                                Back
                            </Button>
                            <Button 
                                onClick={handleCommentSubmit}
                                disabled={isLoading || !comment.trim()}
                                size="sm"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="size-3.5 animate-spin mr-1.5" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Check className="size-3.5 mr-1.5" />
                                        Save Comment
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            {/* Backdrop - transparent to see selection */}
            <div 
                className="fixed inset-0 z-40"
                onClick={onClose}
            />
            
            {/* Popup */}
            <div
                className="fixed z-50 w-96 bg-background border rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-200"
                style={{
                    top: `${position.top}px`,
                    left: `${position.left}px`,
                    transform: position.placement === 'top' ? 'translateY(-100%)' : 'none'
                }}
            >
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded bg-primary/10">
                            <Sparkles className="size-3.5 text-primary" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                            AI on selection
                        </span>
                    </div>
                    
                    <div className="flex gap-2 mb-3">
                        <Input
                            ref={inputRef}
                            placeholder="Improve, translate, explain..."
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            onKeyDown={handleKeyPress}
                            disabled={isLoading}
                            className="flex-1 h-9 text-sm"
                        />
                    </div>
                    
                    {!response && !isLoading && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {quickActions.map((action) => (
                                <button
                                    key={action.label}
                                    onClick={() => handleAIRequest("apply", action.prompt)}
                                    className="text-[10px] px-2 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground border transition-colors cursor-pointer"
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    )}
                    
                    <div className="flex gap-2">
                        <Button
                            onClick={() => handleAIRequest("apply")}
                            disabled={isLoading || !instruction.trim()}
                            size="sm"
                            className="flex-1 h-8"
                        >
                            {isLoading ? (
                                <Loader2 className="size-3.5 animate-spin mr-1.5" />
                            ) : (
                                <Wand2 className="size-3.5 mr-1.5" />
                            )}
                            Apply
                        </Button>
                        <Button
                            onClick={() => handleAIRequest("ask")}
                            disabled={isLoading || !instruction.trim()}
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8"
                        >
                            <MessageCircle className="size-3.5 mr-1.5" />
                            Ask
                        </Button>
                    </div>

                    {response && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">Response:</p>
                            <p className="text-sm leading-relaxed">{response}</p>
                        </div>
                    )}

                    <p className="text-xs text-muted-foreground mt-2 text-center">
                        Enter to apply • Shift+Enter to ask • Esc to close
                    </p>
                </div>
            </div>
        </>
    );
}
