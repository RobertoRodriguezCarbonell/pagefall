"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Copy, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { saveOpenAIApiKey, getOpenAIApiKey } from "@/server/settings";

export default function SettingsPage() {
    const [showApiKey, setShowApiKey] = useState(false);
    const [apiKey, setApiKey] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Load existing API key on mount
    useEffect(() => {
        setMounted(true);
        const loadApiKey = async () => {
            const result = await getOpenAIApiKey();
            if (result.success && result.apiKey) {
                setApiKey(result.apiKey);
            }
        };
        loadApiKey();
    }, []);

    const handleSaveApiKey = async () => {
        if (!apiKey.trim()) {
            toast.error("Please enter an API key");
            return;
        }

        setIsSaving(true);
        try {
            const result = await saveOpenAIApiKey(apiKey);
            
            if (result.success) {
                toast.success("API key saved successfully");
            } else {
                toast.error(result.error || "Failed to save API key");
            }
        } catch (error) {
            toast.error("An error occurred while saving");
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestConnection = async () => {
        if (!apiKey.trim()) {
            toast.error("Please enter an API key first");
            return;
        }

        setIsTesting(true);
        try {
            const response = await fetch("https://api.openai.com/v1/models", {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                },
            });

            if (response.ok) {
                toast.success("Connection successful! API key is valid");
            } else {
                toast.error("Invalid API key or connection failed");
            }
        } catch (error) {
            toast.error("Failed to test connection");
        } finally {
            setIsTesting(false);
        }
    };

    const handleCopyApiKey = async () => {
        if (!apiKey) {
            toast.error("No API key to copy");
            return;
        }
        
        try {
            await navigator.clipboard.writeText(apiKey);
            toast.success("API key copied to clipboard");
        } catch {
            toast.error("Failed to copy API key");
        }
    };

    return (
        <PageWrapper breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Settings", href: "/dashboard/settings" },
        ]}>
            <h1 className="text-3xl font-bold mb-6">Settings</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Integrations</CardTitle>
                    <CardDescription>
                        Connect external services to enhance your experience
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* OpenAI Integration */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            {mounted && (
                                <Image
                                    src={theme === "dark" ? "/openai-dark.svg" : "/openai-light.svg"}
                                    alt="OpenAI"
                                    width={48}
                                    height={48}
                                />
                            )}
                            <div>
                                <h3 className="text-lg font-semibold">OpenAI</h3>
                                <p className="text-sm text-muted-foreground">
                                    Connect your OpenAI API key to enable AI features
                                </p>
                            </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-2">
                            <Label htmlFor="openai-api-key">API Key</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        id="openai-api-key"
                                        type={showApiKey ? "text" : "password"}
                                        placeholder="sk-..."
                                        className="pr-10"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    title={showApiKey ? "Hide API key" : "Show API key"}
                                >
                                    {showApiKey ? (
                                        <EyeOff className="size-4" />
                                    ) : (
                                        <Eye className="size-4" />
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handleCopyApiKey}
                                    title="Copy API key"
                                >
                                    <Copy className="size-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Your API key is encrypted and stored securely
                            </p>
                        </div>
                        
                        <div className="flex gap-2">
                            <Button onClick={handleSaveApiKey} disabled={isSaving}>
                                {isSaving ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin mr-2" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save API Key"
                                )}
                            </Button>
                            <Button variant="outline" onClick={handleTestConnection} disabled={isTesting}>
                                {isTesting ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin mr-2" />
                                        Testing...
                                    </>
                                ) : (
                                    "Test Connection"
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </PageWrapper>
    );
}