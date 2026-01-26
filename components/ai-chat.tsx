"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, Sparkles, X, Zap } from "lucide-react";
import { getOpenAIApiKey } from "@/server/settings";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIChatProps {
  noteContent?: string;
  noteTitle?: string;
  onInsertContent?: (content: string) => void;
  onReplaceContent?: (content: string) => void;
}

export function AIChat({ noteContent, noteTitle, onInsertContent, onReplaceContent }: AIChatProps) {
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

    // Add empty assistant message that will be filled with streaming
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const apiKeyResult = await getOpenAIApiKey();

      if (!apiKeyResult.success || !apiKeyResult.apiKey) {
        toast.error("OpenAI API key not configured. Please add it in Settings.");
        setMessages((prev) => prev.slice(0, -1)); // Remove empty assistant message
        setIsLoading(false);
        return;
      }

      const systemPrompt = noteContent
        ? agentMode
          ? `You are an AI writing assistant in agent mode. The user is working on a note titled "${noteTitle}". Current content: ${noteContent}. When in agent mode, you MUST output the COMPLETE NEW VERSION of the note with all the requested changes applied. Do not provide explanations, just output the full updated note content that will replace the existing content.`
          : `You are a helpful AI assistant. The user is working on a note titled "${noteTitle}". Here's the current content: ${noteContent}. Help them with questions, suggestions, or improvements.`
        : agentMode
          ? "You are an AI writing assistant in agent mode. Output the COMPLETE text content that will replace the entire note. Do not provide explanations."
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
            { role: "user", content: userMessage.content },
          ],
          temperature: 0.7,
          max_tokens: 500,
          stream: true,
        }),
      });

      if (!response.ok) {
        toast.error("Failed to get AI response. Please check your API key.");
        setMessages((prev) => prev.slice(0, -1));
        setIsLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      if (!reader) {
        toast.error("Failed to read response");
        setMessages((prev) => prev.slice(0, -1));
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
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: "assistant",
                    content: accumulatedContent,
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // If in agent mode and onReplaceContent is provided, replace the entire note content
      // If in chat mode and onInsertContent is provided, insert the content at the end
      if (agentMode && onReplaceContent && accumulatedContent) {
        onReplaceContent(accumulatedContent);
        toast.success("Note updated with AI changes");
      } else if (!agentMode && onInsertContent && accumulatedContent) {
        onInsertContent(accumulatedContent);
        toast.success("Content inserted into note");
      }
    } catch (error) {
      toast.error("An error occurred");
      setMessages((prev) => prev.slice(0, -1));
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

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rounded-full size-14 shadow-lg"
        size="icon"
      >
        <Sparkles className="size-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-xl flex flex-col overflow-hidden">
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between space-y-0 pb-4 border-b">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          AI Assistant
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant={agentMode ? "default" : "outline"}
            size="sm"
            onClick={() => setAgentMode(!agentMode)}
            className="h-8"
            title={agentMode ? "Agent mode: AI writes directly" : "Chat mode: AI assists"}
          >
            <Zap className="size-3 mr-1" />
            {agentMode ? "Agent" : "Chat"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
          <div className="space-y-4 min-h-full">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                {agentMode ? (
                  <>
                    <Zap className="size-8 mx-auto mb-2 text-primary" />
                    <p className="font-semibold mb-1">Agent Mode Active</p>
                    <p>AI will write directly into your note!</p>
                  </>
                ) : (
                  "Ask me anything about your note or get help with writing!"
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
                    "rounded-lg px-4 py-2 max-w-[80%] break-words",
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
                <div className="rounded-lg px-4 py-2 bg-muted">
                  <Loader2 className="size-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              placeholder="Ask something..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              size="icon"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
