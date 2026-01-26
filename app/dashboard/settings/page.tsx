"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { toast } from "sonner";

export default function SettingsPage() {
    const [showApiKey, setShowApiKey] = useState(false);
    const [apiKey, setApiKey] = useState("");
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

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

    // Prevent hydration mismatch
    useState(() => {
        setMounted(true);
    });

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
                        <div className="flex items-center gap-3">
                            {mounted && (
                                <Image
                                    src={theme === "dark" ? "/openai-dark.svg" : "/openai-light.svg"}
                                    alt="OpenAI"
                                    width={24}
                                    height={24}
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
                            <Button>Save API Key</Button>
                            <Button variant="outline">Test Connection</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </PageWrapper>
    );
}
