"use client"

import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Notebook } from "@/db/schema"
import Link from "next/link";
import { ArrowRight, Loader2, Trash2, Settings, Share2, LogOut, RefreshCw, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteNotebook, inviteUserToNotebook, leaveNotebook } from "@/server/notebooks";
import { toast } from "sonner";
import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Separator } from "./ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

// Extended type to include UI flags added by backend
type ExtendedNotebook = Notebook & {
    isShared?: boolean;
    isOwner?: boolean;
    permissions?: {
        canEdit: boolean;
        canCreate: boolean;
        canDelete: boolean;
    };
    created_at?: Date;
    updated_at?: Date;
    user_id?: string;
    notes?: any[];
}

export default function NotebookCard({ notebook }: { notebook: ExtendedNotebook }) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [open, setOpen] = useState(false);
    const [openLeave, setOpenLeave] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [shareEmail, setShareEmail] = useState("");
    const [sharePermissions, setSharePermissions] = useState({
        canEdit: false,
        canCreate: false,
        canDelete: false
    });

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const result = await deleteNotebook(notebook.id);
            if (result.success) {
                toast.success("Notebook deleted successfully");
                setOpen(false);
                router.refresh();
            } else {
                toast.error(result.error || "Failed to delete notebook");
                setIsDeleting(false);
            }
        } catch {
            toast.error("Failed to delete notebook");
            setIsDeleting(false);
        }
    };

    const handleLeave = async () => {
        try {
            const result = await leaveNotebook(notebook.id);
            if (result.success) {
                toast.success("Left notebook successfully");
                setOpenLeave(false);
                router.refresh();
            } else {
                toast.error(result.error || "Failed to leave notebook");
            }
        } catch {
            toast.error("Failed to leave notebook");
        }
    }

    const handleShareSubmit = async () => {
        if(!shareEmail) {
            toast.error("Please enter an email")
            return;
        }
        
        setIsSharing(true)
        try {
            const result = await inviteUserToNotebook({
                notebookId: notebook.id,
                email: shareEmail,
                permissions: sharePermissions
            })
            
            if (result.success) {
                toast.success("Invitation sent successfully")
                setIsShareOpen(false)
                setShareEmail("")
                setSharePermissions({
                    canEdit: false,
                    canCreate: false,
                    canDelete: false
                })
            } else {
                toast.error(result.error || "Failed to invite user")
            }
        } catch (error) {
            toast.error("Failed to invite user")
        } finally {
            setIsSharing(false)
        }
    }

    return (
        <Card className="flex flex-col h-full hover:shadow-md transition-shadow relative overflow-hidden group">
            {/* Background pattern */}
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <div className="w-24 h-24 rounded-full bg-primary blur-3xl" />
            </div>

            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex flex-col space-y-1.5 overflow-hidden w-full">
                        <CardTitle className="flex items-center justify-between gap-2">
                             <div className="flex items-center gap-2 truncate">
                                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                    <ArrowRight className="h-4 w-4 text-primary -rotate-45" />
                                </div>
                                <span className="truncate">{notebook.name}</span>
                             </div>

                             {!notebook.isOwner && (
                                <Badge variant="secondary" className="shrink-0 text-xs gap-1">
                                    <Users className="h-3 w-3" /> Shared
                                </Badge>
                             )}
                             {notebook.isOwner && notebook.isShared && (
                                <Badge variant="outline" className="shrink-0 text-xs gap-1 border-primary/20 bg-primary/5 text-primary">
                                    <Users className="h-3 w-3" /> Owner
                                </Badge>
                             )}
                        </CardTitle>
                        <span className="text-sm text-muted-foreground">{notebook.notes?.length ?? 0} notes</span>
                    </div>
                </div>
            </CardHeader>
            <Separator />
            <CardContent className="pb-2 flex-grow" />
            <CardFooter className="flex gap-x-2 items-center">
                <Link className="flex-1" href={`/dashboard/notebook/${notebook.id}`}>
                    <Button className="w-full">View</Button>
                </Link>

                {notebook.isOwner ? (
                <div className="flex gap-2">
                    <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" title="Share">
                                <Share2 className="size-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Share Notebook</DialogTitle>
                                <DialogDescription>
                                    Invite others to collaborate on this notebook.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email address</Label>
                                    <Input
                                        id="email"
                                        placeholder="user@example.com"
                                        value={shareEmail}
                                        onChange={(e) => setShareEmail(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleShareSubmit();
                                            }
                                        }}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <Label>Permissions</Label>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox 
                                                id="canEdit" 
                                                checked={sharePermissions.canEdit}
                                                onCheckedChange={(checked) => 
                                                    setSharePermissions(prev => ({ ...prev, canEdit: checked as boolean }))
                                                }
                                            />
                                            <Label htmlFor="canEdit" className="text-sm font-normal">Can edit notes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox 
                                                id="canCreate" 
                                                checked={sharePermissions.canCreate}
                                                onCheckedChange={(checked) => 
                                                    setSharePermissions(prev => ({ ...prev, canCreate: checked as boolean }))
                                                }
                                            />
                                            <Label htmlFor="canCreate" className="text-sm font-normal">Can create new notes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox 
                                                id="canDelete" 
                                                checked={sharePermissions.canDelete}
                                                onCheckedChange={(checked) => 
                                                    setSharePermissions(prev => ({ ...prev, canDelete: checked as boolean }))
                                                }
                                            />
                                            <Label htmlFor="canDelete" className="text-sm font-normal">Can delete notes</Label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleShareSubmit} disabled={isSharing}>
                                    {isSharing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Send Invitation
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Link href={`/dashboard/notebook/${notebook.id}/settings`}>
                        <Button variant="outline" size="icon" title="Settings">
                            <Settings className="size-4" />
                        </Button>
                    </Link>

                    <AlertDialog open={open} onOpenChange={setOpen}>
                        <AlertDialogTrigger asChild>
                            <Button 
                                variant="outline" 
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Delete"
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Notebook?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the 
                                    notebook "{notebook.name}" and all its notes.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                    onClick={handleDelete}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    disabled={isDeleting}
                                >
                                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
                ) : (
                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => setOpenLeave(true)}
                        className="text-destructive hover:text-destructive"
                        title="Leave Notebook"
                    >
                        <LogOut className="size-4" />
                    </Button>
                )}
            </CardFooter>

            <AlertDialog open={openLeave} onOpenChange={setOpenLeave}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Leave Notebook?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to leave "{notebook.name}"? You will lose access to its notes.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleLeave}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Leave
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
