"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, MessageCircle, Wand2, MessageSquarePlus } from "lucide-react";
import { getOpenAIApiKey } from "@/server/settings";
import { toast } from "sonner";

interface AISelectionPopupProps {
    selectedText: string;
    position: { top: number; left: number; placement?: 'top' | 'bottom' };
    onClose: () => void;
    onApply: (newText: string) => void;
}

export function AISelectionPopup({ selectedText, position, onClose, onApply }: AISelectionPopupProps) {
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

    const handleCommentSubmit = () => {
        if (!comment.trim()) return;
        toast.success("Comment functionality coming soon");
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

            const systemPrompt = mode === "apply"
                ? `You are an AI writing assistant. The user has selected this text:

"${selectedText}"

The user wants you to: ${textToProcess}

Respond with ONLY the modified HTML content.
RULES:
1. Use semantic HTML tags (<p>, <ul>, <li>, <strong>, etc.).
2. If the user input is a list, or the user asks for a list/bullets, YOU MUST return a <ul> or <ol> list with <li> items. Do NOT return a series of <p> tags for lists.
3. Do NOT include any physical bullet characters (•, -, *) or numbering (1., 2.) inside the text content of <li> tags. The HTML tags handle the formatting automatically.
4. Do not wrap code in markdown blocks (no \`\`\`html).
5. Just return the raw HTML string.`
                : `You are an AI assistant. The user has selected this text:

"${selectedText}"

The user is asking: ${instruction}

Provide a helpful, concise answer to their question. You can explain, analyze, or provide information about the selected text.`;

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
                        { role: "user", content: instruction },
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
            const result = data.choices[0]?.message?.content || "";

            if (result) {
                if (mode === "apply") {
                    onApply(result);
                    toast.success("Text updated");
                    onClose();
                } else {
                    setResponse(result);
                    toast.success("Response received");
                }
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
                    className="fixed z-50 w-80 bg-background border rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-200"
                    style={{
                        top: `${position.top}px`,
                        left: `${position.left}px`,
                        transform: position.placement === 'top' ? 'translateY(-100%)' : 'none'
                    }}
                >
                    <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded bg-blue-500/10">
                                    <MessageSquarePlus className="size-3.5 text-blue-500" />
                                </div>
                                <span className="text-xs font-medium text-foreground">Add comment</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{selectedText.length > 20 ? selectedText.substring(0, 20) + '...' : selectedText}</span>
                        </div>
                        
                        <Input
                            ref={commentInputRef}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Type your comment..."
                            className="h-9 text-sm mb-2"
                        />
                        
                        <div className="flex justify-end gap-2">
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => setView('menu')}
                                className="h-7 text-xs"
                            >
                                Back
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={handleCommentSubmit}
                                className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Save
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
