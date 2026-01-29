"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Plus, Copy, Check } from "lucide-react";
import { getNotebookApiKeys, createNotebookApiKey, deleteNotebookApiKey } from "@/server/api-keys";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface NotebookKeyManagerProps {
    notebookId: string;
    notebookName: string;
}

type ApiKey = {
    id: string;
    name: string;
    key: string;
    permission: "read_only" | "full_access";
    lastUsedAt: Date | null;
    createdAt: Date;
};

export function NotebookKeyManager({ notebookId, notebookName }: NotebookKeyManagerProps) {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    
    // New Key Form State
    const [newKeyName, setNewKeyName] = useState("");
    const [newKeyPermission, setNewKeyPermission] = useState<"read_only" | "full_access">("read_only");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    // Created Key Modal
    const [createdKey, setCreatedKey] = useState<string | null>(null);
    const [isCreatedDialogOpen, setIsCreatedDialogOpen] = useState(false);

    // Delete Confirmation State
    const [keyToDelete, setKeyToDelete] = useState<string | null>(null);

    useEffect(() => {
        loadKeys();
    }, [notebookId]);

    const loadKeys = async () => {
        setIsLoading(true);
        const result = await getNotebookApiKeys(notebookId);
        if (result.success && result.keys) {
            // Need to cast the string dates back to Date objects if JSON serialization messed them up, 
            // but Server Actions usually handle Date objects fine in modern Next.js
            setKeys(result.keys as unknown as ApiKey[]);
        }
        setIsLoading(false);
    };

    const handleCreateKey = async () => {
        if (!newKeyName.trim()) {
            toast.error("Please enter a name for the key");
            return;
        }

        setIsCreating(true);
        const result = await createNotebookApiKey(notebookId, newKeyName, newKeyPermission);
        setIsCreating(false);

        if (result.success && result.apiKey) {
            setCreatedKey(result.apiKey.key); // The full key
            setIsCreatedDialogOpen(true);
            setIsDialogOpen(false);
            setNewKeyName("");
            loadKeys(); // Refresh list (will get masked keys)
        } else {
            toast.error("Failed to create API key");
        }
    };

    const handleDeleteKey = async (id: string) => {
        // Find the key name for the success message if needed, though 'Key deleted' is fine too
        const keyName = keys.find(k => k.id === id)?.name || "API Key";
        
        // Optimistic UI updates can be tricky with toast promises if we revert, 
        // so let's stick to standard flow: Loading Toast -> Success/Error Toast -> Update State
        
        setKeyToDelete(null); // Close dialog immediately

        const promise = deleteNotebookApiKey(id);

        toast.promise(promise, {
            loading: 'Deleting API token...',
            success: (result) => {
                if (result.success) {
                    setKeys(prev => prev.filter(k => k.id !== id));
                    return `API Key "${keyName}" deleted`;
                } else {
                    throw new Error(result.error);
                }
            },
            error: (err) => {
                return typeof err === 'string' ? err : 'Failed to delete API Key';
            }
        });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">{notebookName}</h3>
                    <p className="text-sm text-muted-foreground">Manage access keys for this notebook.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" /> Create Key
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create API Key</DialogTitle>
                            <DialogDescription>
                                Create a new key for <strong>{notebookName}</strong>.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Key Name</Label>
                                <Input 
                                    placeholder="e.g. Zapier Integration" 
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Permission Level</Label>
                                <Select 
                                    value={newKeyPermission} 
                                    onValueChange={(val: any) => setNewKeyPermission(val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="read_only">Read Only</SelectItem>
                                        <SelectItem value="full_access">Full Access (Read + Write)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateKey} disabled={isCreating}>
                                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Created Key Modal */}
            <Dialog open={isCreatedDialogOpen} onOpenChange={setIsCreatedDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>API Key Created</DialogTitle>
                        <DialogDescription>
                            Copy this key now. You won't be able to see it again!
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center space-x-2 my-4">
                        <code className="flex-1 p-2 bg-muted rounded border font-mono text-sm break-all">
                            {createdKey}
                        </code>
                        <Button size="icon" variant="outline" onClick={() => createdKey && copyToClipboard(createdKey)}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            
            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!keyToDelete} onOpenChange={(open) => !open && setKeyToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. Any external services using this key will immediately lose access.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => keyToDelete && handleDeleteKey(keyToDelete)}
                        >
                            Delete Key
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Keys Table */}
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Permission</TableHead>
                            <TableHead>Last Used</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                           <TableRow>
                               <TableCell colSpan={4} className="text-center py-4">
                                   <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                               </TableCell>
                           </TableRow>
                        ) : keys.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                    No keys generated yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            keys.map((key) => (
                                <TableRow key={key.id}>
                                    <TableCell className="font-medium">
                                        {key.name}
                                        <div className="text-xs text-muted-foreground font-mono mt-1">
                                            {key.key}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={key.permission === 'full_access' ? 'default' : 'secondary'}>
                                            {key.permission === 'full_access' ? 'Full Access' : 'Read Only'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {key.lastUsedAt ? formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true }) : 'Never'}
                                    </TableCell>
                                    <TableCell>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => setKeyToDelete(key.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
