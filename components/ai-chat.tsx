"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Sparkles, X, Zap, ChevronLeft, History, MessageSquare, Plus, MoreHorizontal } from "lucide-react";
import { getOpenAIApiKey } from "@/server/settings";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [agentMode, setAgentMode] = useState(false);
    const [showHistory, setShowHistory] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Mock History
    const history = [
        { id: 1, title: "Summarize notes", date: "Today" },
        { id: 2, title: "Fix grammar", date: "Yesterday" },
        { id: 3, title: "Brainstorming", date: "2 days ago" },
        { id: 4, title: "Drafting intro", date: "Last week" },
    ];

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
- IMPORTANT: Do not include ANY bullet characters (•, -, *) or numbering inside <li> tags. The HTML tags handle the list formatting.
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
        <div className="flex bg-background h-full w-full flex-row font-sans">
            {/* Desktop History Sidebar */}
            <div className={cn(
                "flex flex-col bg-muted/30 transition-all duration-300 ease-in-out overflow-hidden h-full",
                showHistory ? "w-64 opacity-100 border-r" : "w-0 opacity-0"
            )}>
                <div className="flex-shrink-0 h-14 w-full border-b flex items-center justify-between px-4 bg-muted/5 backdrop-blur">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">History</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                        <Plus className="size-3.5" />
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {history.map((item) => (
                        <button
                            key={item.id}
                            className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted/60 transition-colors group flex items-start gap-2"
                        >
                            <MessageSquare className="size-4 mt-0.5 text-muted-foreground group-hover:text-primary" />
                            <div className="min-w-0">
                                <div className="font-medium truncate text-foreground/80 group-hover:text-foreground">{item.title}</div>
                                <div className="text-[10px] text-muted-foreground">{item.date}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full">
                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between px-4 h-14 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-muted"
                            onClick={() => setShowHistory(!showHistory)}
                        >
                            <History className="size-4 text-muted-foreground" />
                        </Button>

                        <div className="flex flex-col">
                            <h2 className="text-sm font-semibold flex items-center gap-1.5">
                                {agentMode ? <Zap className="size-3.5 fill-primary text-primary" /> : <Sparkles className="size-3.5 text-primary" />}
                                {agentMode ? "Writer Agent" : "AI Assistant"}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground">
                                    <span className="text-xs font-medium">Model: GPT-5.2</span>
                                    <MoreHorizontal className="size-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                    <span>GPT-5.1</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <span>GPT-5</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <span>GPT-5 mini</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <span>GPT-5 nano</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <span>GPT-5.2-Codex</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <span>GPT-5.1-Codex</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground">
                                    <span className="text-xs font-medium">{agentMode ? "Writing Mode" : "Chat Mode"}</span>
                                    <MoreHorizontal className="size-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setAgentMode(false)}>
                                    <Sparkles className="size-4 mr-2" />
                                    <span>Chat Assistant</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setAgentMode(true)}>
                                    <Zap className="size-4 mr-2" />
                                    <span>Writer Agent</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-75">
                            <div className={cn(
                                "p-4 rounded-2xl mb-4 transition-colors",
                                agentMode ? "bg-primary/10" : "bg-muted"
                            )}>
                                {agentMode ? <Zap className="size-8 text-primary" /> : <Sparkles className="size-8 text-muted-foreground" />}
                            </div>
                            <h3 className="font-semibold text-lg mb-1">
                                {agentMode ? "Writer Mode Active" : "How can I help?"}
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-[240px]">
                                {agentMode
                                    ? "I can write, edit, and format content directly in your note."
                                    : "Ask questions, get summaries, or brainstorm ideas."
                                }
                            </p>
                        </div>
                    )}

                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={cn(
                                "flex flex-col max-w-[90%]",
                                message.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                            )}
                        >
                            <div
                                className={cn(
                                    "rounded-2xl px-4 py-2.5 shadow-sm text-sm leading-relaxed",
                                    message.role === "user"
                                        ? "bg-primary text-primary-foreground rounded-br-none"
                                        : "bg-muted/50 border rounded-bl-none prose prose-sm dark:prose-invert max-w-none"
                                )}
                            >
                                <div className="whitespace-pre-wrap">{message.content}</div>
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-1 opacity-50 px-1">
                                {message.role === "user" ? "You" : "AI"}
                            </span>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="rounded-2xl rounded-bl-none px-4 py-3 bg-muted/30 border shadow-sm">
                                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="flex-shrink-0 p-4 bg-background">
                    <div className="relative flex items-center gap-2 bg-muted/30 p-1.5 rounded-xl border focus-within:ring-1 focus-within:ring-ring focus-within:border-primary/50 transition-all">
                        <Input
                            placeholder={agentMode ? "Tell me what to write..." : "Message AI..."}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={isLoading}
                            className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 px-3 py-2.5 h-auto min-h-[44px] max-h-32 resize-none"
                        />
                        <Button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            size="icon"
                            className="size-8 mb-1 mr-1 shrink-0 rounded-lg flex items-center justify-center"
                        >
                            <Send className="size-4" />
                        </Button>
                    </div>
                    <div className="text-[10px] text-center text-muted-foreground mt-2 opacity-50">
                        AI can make mistakes. Check important info.
                    </div>
                </div>
            </div>
        </div>
    );
}
