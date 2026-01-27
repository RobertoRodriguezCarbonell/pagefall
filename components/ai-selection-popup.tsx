"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, MessageCircle, Wand2 } from "lucide-react";
import { getOpenAIApiKey } from "@/server/settings";
import { toast } from "sonner";

interface AISelectionPopupProps {
    selectedText: string;
    position: { top: number; left: number };
    onClose: () => void;
    onApply: (newText: string) => void;
}

export function AISelectionPopup({ selectedText, position, onClose, onApply }: AISelectionPopupProps) {
    const [instruction, setInstruction] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Auto-focus input when popup opens
        inputRef.current?.focus();
    }, []);

    const handleAIRequest = async (mode: "apply" | "ask") => {
        if (!instruction.trim()) return;

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

The user wants you to: ${instruction}

Respond with ONLY the modified text, nothing else. No explanations, no markdown, just the result text.`
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
