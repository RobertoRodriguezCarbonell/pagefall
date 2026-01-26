"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Sparkles, X, Zap, ChevronLeft } from "lucide-react";
import { getOpenAIApiKey } from "@/server/settings";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface AIChatProps {
    noteTitle?: string;
    onInsertContent?: (content: string) => void;
    onReplaceContent?: (content: string) => void;
    getEditorHTML?: () => string;
}

export function AIChat({ noteTitle, onInsertContent, onReplaceContent, getEditorHTML }: AIChatProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [agentMode, setAgentMode] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        // In agent mode, we don't add assistant messages to chat since they're applied to editor
        // In chat mode, we add empty assistant message that will be filled with streaming
        if (!agentMode) {
            setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
        }

        try {
            const apiKeyResult = await getOpenAIApiKey();

            if (!apiKeyResult.success || !apiKeyResult.apiKey) {
                toast.error("OpenAI API key not configured. Please add it in Settings.");
                setMessages((prev) => prev.slice(0, -1)); // Remove empty assistant message
                setIsLoading(false);
                return;
            }

            const currentContent = getEditorHTML ? getEditorHTML() : "";
            
            const systemPrompt = currentContent
                ? agentMode
                    ? `You are an AI writing assistant in agent mode. The user is editing a note titled "${noteTitle}".

CURRENT NOTE HTML:
${currentContent}

You must respond with a JSON object with this structure:
{
  "action": "add" | "replace",
  "content": "<html content here>"
}

IMPORTANT DECISION RULES:
- Use "add" when user wants to ADD/WRITE/CREATE new content to the existing note
- Use "replace" when user wants to CHANGE/MODIFY/DELETE/REMOVE existing content or doesn't like something
- When action is "add": content should be ONLY the NEW HTML to append
- When action is "replace": content should be the COMPLETE HTML of the entire note with changes applied
- Use ONLY valid HTML tags: <p>, <h1>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <em>, <code>, <blockquote>
- Close all HTML tags properly.
- Response must be ONLY the JSON object, nothing else.`
                    : `You are a helpful AI assistant. The user is working on a note titled "${noteTitle}".

Current note content:
${currentContent}

Help them with questions, suggestions, or improvements.`
                : agentMode
                    ? `You are an AI writing assistant in agent mode. Respond with JSON:
{
  "action": "add",
  "content": "<html here>"
}
Use valid HTML tags: <p>, <h1>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <em>. No explanations.`
                    : "You are a helpful AI assistant for note-taking and writing.";

            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKeyResult.apiKey}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: systemPrompt },
                        ...messages.slice(-4).map(m => ({ role: m.role, content: m.content })),
                        { role: "user", content: userMessage.content },
                    ],
                    temperature: 0.7,
                    max_tokens: 1000,
                    stream: true,
                }),
            });

            if (!response.ok) {
                toast.error("Failed to get AI response. Please check your API key.");
                if (!agentMode) {
                    setMessages((prev) => prev.slice(0, -1));
                }
                setIsLoading(false);
                return;
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = "";

            if (!reader) {
                toast.error("Failed to read response");
                if (!agentMode) {
                    setMessages((prev) => prev.slice(0, -1));
                }
                setIsLoading(false);
                return;
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const data = line.slice(6);
                        if (data === "[DONE]") continue;

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices[0]?.delta?.content;

                            if (content) {
                                accumulatedContent += content;
                                // Only update chat messages in chat mode, not agent mode
                                if (!agentMode) {
                                    setMessages((prev) => {
                                        const newMessages = [...prev];
                                        newMessages[newMessages.length - 1] = {
                                            role: "assistant",
                                            content: accumulatedContent,
                                        };
                                        return newMessages;
                                    });
                                }
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }

            // If in agent mode, parse JSON response from AI
            if (agentMode && accumulatedContent && accumulatedContent.length > 0) {
                try {
                    // Clean potential markdown code blocks
                    let cleanedContent = accumulatedContent.trim();
                    cleanedContent = cleanedContent.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '');
                    
                    const response = JSON.parse(cleanedContent);
                    const action = response.action;
                    const htmlContent = response.content;

                    console.log("🤖 AI Decision:", { 
                        action,
                        contentPreview: htmlContent.substring(0, 100) + "...",
                        userMessage: userMessage.content 
                    });

                    if (action === "replace" && onReplaceContent) {
                        console.log("🔄 Replacing entire note");
                        onReplaceContent(htmlContent);
                        toast.success("Note updated with AI changes");
                        setMessages((prev) => [...prev, { 
                            role: "assistant", 
                            content: "✅ Note updated successfully" 
                        }]);
                    } else if (action === "add" && onInsertContent) {
                        console.log("➕ Adding new content");
                        onInsertContent(htmlContent);
                        toast.success("Content added to note");
                        setMessages((prev) => [...prev, { 
                            role: "assistant", 
                            content: "✅ Content added successfully" 
                        }]);
                    }
                } catch (error) {
                    console.error("Failed to parse AI response as JSON:", error);
                    toast.error("AI response format error. Please try again.");
                    setMessages((prev) => [...prev, { 
                        role: "assistant", 
                        content: "❌ Error processing response. Please try again." 
                    }]);
                }
            }
        } catch (error) {
            toast.error("An error occurred");
            if (!agentMode) {
                setMessages((prev) => prev.slice(0, -1));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Floating Trigger Button */}
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-8 right-8 rounded-full size-16 shadow-lg hover:scale-110 transition-transform z-50"
                    size="icon"
                >
                    <Sparkles className="size-6" />
                </Button>
            )}

            {/* Sliding Panel Overlay */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
                        onClick={() => setIsOpen(false)}
                    />
                    
                    {/* Side Panel */}
                    <div className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-background border-l shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b bg-muted/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Sparkles className="size-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold">AI Assistant</h2>
                                    <p className="text-xs text-muted-foreground">
                                        {agentMode ? "Agent mode - writing directly" : "Chat mode - ask anything"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={agentMode ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setAgentMode(!agentMode)}
                                    className="h-9"
                                    title={agentMode ? "Agent mode: AI writes directly" : "Chat mode: AI assists"}
                                >
                                    <Zap className="size-3.5 mr-1.5" />
                                    {agentMode ? "Agent" : "Chat"}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsOpen(false)}
                                    className="size-9"
                                >
                                    <ChevronLeft className="size-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto px-6 py-4" ref={scrollRef}>
                            <div className="space-y-4">
                                {messages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                        {agentMode ? (
                                            <>
                                                <div className="p-4 rounded-full bg-primary/10 mb-4">
                                                    <Zap className="size-10 text-primary" />
                                                </div>
                                                <h3 className="text-lg font-semibold mb-2">Agent Mode Active</h3>
                                                <p className="text-sm text-muted-foreground max-w-xs">
                                                    AI will analyze your requests and write directly into your note.
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="p-4 rounded-full bg-muted mb-4">
                                                    <Sparkles className="size-10 text-muted-foreground" />
                                                </div>
                                                <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
                                                <p className="text-sm text-muted-foreground max-w-xs">
                                                    Ask me anything about your note or get help with writing!
                                                </p>
                                            </>
                                        )}
                                    </div>
                                )}
                                {messages.map((message, index) => (
                                    <div
                                        key={index}
                                        className={cn(
                                            "flex",
                                            message.role === "user" ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "rounded-2xl px-4 py-3 max-w-[85%] shadow-sm",
                                                message.role === "user"
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted"
                                            )}
                                        >
                                            <div className="text-sm whitespace-pre-wrap leading-relaxed">
                                                {message.content}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="rounded-2xl px-4 py-3 bg-muted shadow-sm">
                                            <Loader2 className="size-4 animate-spin" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="flex-shrink-0 border-t bg-muted/30 p-4">
                            <div className="flex gap-2">
                                <Input
                                    placeholder={agentMode ? "Tell me what to write..." : "Ask something..."}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    disabled={isLoading}
                                    className="flex-1 bg-background"
                                />
                                <Button
                                    onClick={handleSend}
                                    disabled={isLoading || !input.trim()}
                                    size="icon"
                                    className="size-10"
                                >
                                    <Send className="size-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
