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
import { getNotebooks } from "@/server/notebooks";
import { generateNotebookApiKey, revokeNotebookApiKey } from "@/server/api-keys";
import { RefreshCw, Trash2, Key } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type NotebookWithKey = {
    id: string;
    name: string;
    apiKey: string | null;
}

export default function SettingsPage() {
    const [showApiKey, setShowApiKey] = useState(false);
    const [apiKey, setApiKey] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    
    // Notebook API Keys State
    const [notebooks, setNotebooks] = useState<NotebookWithKey[]>([]);
    const [isLoadingNotebooks, setIsLoadingNotebooks] = useState(true);
    const [generatingId, setGeneratingId] = useState<string | null>(null);

    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Load existing API key on mount
    useEffect(() => {
        setMounted(true);
        const loadSettings = async () => {
            // OpenAI Key
            const result = await getOpenAIApiKey();
            if (result.success && result.apiKey) {
                setApiKey(result.apiKey);
            }

            // Notebooks
            setIsLoadingNotebooks(true);
            const notebooksResult = await getNotebooks();
            if (notebooksResult.success && notebooksResult.notebooks) {
                setNotebooks(notebooksResult.notebooks);
            }
            setIsLoadingNotebooks(false);
        };
        loadSettings();
    }, []);

    const handleGenerateKey = async (notebookId: string) => {
        setGeneratingId(notebookId);
        try {
            const result = await generateNotebookApiKey(notebookId);
            if (result.success && result.apiKey) {
                setNotebooks(prev => prev.map(n => 
                    n.id === notebookId ? { ...n, apiKey: result.apiKey! } : n
                ));
                toast.success("API Key generated successfully");
            } else {
                toast.error("Failed to generate API Key");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setGeneratingId(null);
        }
    };

    const handleRevokeKey = async (notebookId: string) => {
        if (!confirm("Are you sure you want to revoke this API Key? External integrations will stop working.")) return;

        setGeneratingId(notebookId);
        try {
            const result = await revokeNotebookApiKey(notebookId);
            if (result.success) {
                setNotebooks(prev => prev.map(n => 
                    n.id === notebookId ? { ...n, apiKey: null } : n
                ));
                toast.success("API Key revoked");
            } else {
                toast.error("Failed to revoke API Key");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setGeneratingId(null);
        }
    };

    const handleCopyNotebookKey = (key: string) => {
        navigator.clipboard.writeText(key);
        toast.success("Copied to clipboard");
    };

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

                    <Separator />

                    {/* Pagefall Notebook API Keys */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Key className="size-6 text-primary" />
                            <div>
                                <h3 className="text-lg font-semibold">Pagefall API Access</h3>
                                <p className="text-sm text-muted-foreground">
                                    Manage unique API Keys for each of your notebooks to connect with external tools (n8n, Postman, etc.).
                                </p>
                            </div>
                        </div>
                        
                        <div className="border rounded-lg divide-y">
                            {isLoadingNotebooks ? (
                                <div className="p-4 flex justify-center">
                                    <Loader2 className="animate-spin size-6 text-muted-foreground" />
                                </div>
                            ) : notebooks.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground">
                                    No notebooks found. Create one to generate API keys.
                                </div>
                            ) : (
                                notebooks.map((notebook) => (
                                    <div key={notebook.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-medium">{notebook.name}</h4>
                                                {notebook.apiKey ? (
                                                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">Active</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Disabled</Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground font-mono">ID: {notebook.id}</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {notebook.apiKey ? (
                                                <div className="flex items-center gap-2 flex-1 sm:flex-none">
                                                    <div className="relative">
                                                        <Input 
                                                            readOnly 
                                                            value={notebook.apiKey} 
                                                            type="password"
                                                            className="w-[180px] font-mono text-xs pr-8" 
                                                        />
                                                    </div>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        onClick={() => handleCopyNotebookKey(notebook.apiKey!)}
                                                        title="Copy Key"
                                                    >
                                                        <Copy className="size-3" />
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleRevokeKey(notebook.id)}
                                                        disabled={generatingId === notebook.id}
                                                    >
                                                        {generatingId === notebook.id ? (
                                                            <Loader2 className="size-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="size-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleGenerateKey(notebook.id)}
                                                        title="Regenerate Key"
                                                        disabled={generatingId === notebook.id}
                                                    >
                                                        <RefreshCw className="size-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => handleGenerateKey(notebook.id)}
                                                    disabled={generatingId === notebook.id}
                                                >
                                                    {generatingId === notebook.id ? (
                                                        <Loader2 className="size-4 animate-spin mr-2" />
                                                    ) : (
                                                        <Key className="size-3 mr-2" />
                                                    )}
                                                    Generate Key
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </PageWrapper>
    );
}