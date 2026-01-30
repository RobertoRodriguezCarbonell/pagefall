"use client"

import React, { useState } from "react"
import {
    ArrowLeft,
    Trash2,
    Check,
    X,
    User,
    Mail,
    MoreVertical
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { updateNotebookMemberPermissions, removeNotebookMember, deleteNotebook } from "@/server/notebooks"
import { format } from "date-fns"

interface NotebookMember {
    id: string;
    notebookId: string;
    userId: string;
    status: string; // 'pending' | 'active'
    
    canEdit: boolean;
    canCreate: boolean;
    canDelete: boolean;
    
    invitedBy: string;
    createdAt: Date;
    user: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
    };
}

interface NotebookSettingsInterfaceProps {
    notebook: {
        id: string;
        name: string;
        createdAt: Date;
    };
    initialMembers: NotebookMember[];
}

export function NotebookSettingsInterface({ notebook, initialMembers }: NotebookSettingsInterfaceProps) {
    const router = useRouter();
    const [members, setMembers] = useState<NotebookMember[]>(initialMembers);
    const [isDeletingNotebook, setIsDeletingNotebook] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

    const handlePermissionChange = async (memberId: string, type: 'canEdit' | 'canCreate' | 'canDelete', checked: boolean) => {
        // Optimistic update
        const memberIndex = members.findIndex(m => m.id === memberId);
        if (memberIndex === -1) return;

        const updatedMember = { ...members[memberIndex], [type]: checked };
        const newMembers = [...members];
        newMembers[memberIndex] = updatedMember;
        // Logic check: if you give 'canCreate' often implies 'canEdit' logic? 
        // Let's keep them independent as defined in schema, but generally edit is needed to see content usually.
        setMembers(newMembers);

        try {
            const result = await updateNotebookMemberPermissions(memberId, {
                canEdit: updatedMember.canEdit,
                canCreate: updatedMember.canCreate,
                canDelete: updatedMember.canDelete
            });

            if (!result.success) {
                // Revert
                setMembers(members); // original
                toast.error(result.error || "Failed to update permissions");
            } else {
                toast.success("Permissions updated");
            }
        } catch (error) {
            setMembers(members);
            toast.error("Failed to update permissions");
        }
    };

    const confirmRemoveMember = async () => {
        if (!memberToRemove) return;
        try {
            const result = await removeNotebookMember(memberToRemove);
            if (result.success) {
                setMembers(members.filter(m => m.id !== memberToRemove));
                toast.success("Member removed");
            } else {
                toast.error(result.error || "Failed to remove member");
            }
        } catch (error) {
            toast.error("Failed to remove member");
        } finally {
            setMemberToRemove(null);
        }
    };

    const handleDeleteNotebook = async () => {
        try {
            setIsDeletingNotebook(true);
            const result = await deleteNotebook(notebook.id);
            if (result.success) {
                toast.success("Notebook deleted successfully");
                router.push("/dashboard");
            } else {
                toast.error(result.error || "Failed to delete notebook");
                setIsDeletingNotebook(false);
            }
        } catch (error) {
            toast.error("Failed to delete notebook");
            setIsDeletingNotebook(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Notebook Settings</h1>
                    <p className="text-muted-foreground">Manage settings for "{notebook.name}"</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Members</CardTitle>
                            <CardDescription>Manage who has access to this notebook and their permissions.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Permissions</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                        No members shared with this notebook yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                members.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium flex items-center gap-2">
                                                    <User className="h-3 w-3" /> {member.user.name}
                                                </span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-2">
                                                    <Mail className="h-3 w-3" /> {member.user.email}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                                                {member.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-4">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox 
                                                        id={`create-${member.id}`} 
                                                        checked={member.canCreate} 
                                                        onCheckedChange={(c) => handlePermissionChange(member.id, 'canCreate', !!c)}
                                                    />
                                                    <label htmlFor={`create-${member.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Create</label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox 
                                                        id={`edit-${member.id}`} 
                                                        checked={member.canEdit} 
                                                        onCheckedChange={(c) => handlePermissionChange(member.id, 'canEdit', !!c)}
                                                    />
                                                    <label htmlFor={`edit-${member.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Edit</label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox 
                                                        id={`delete-${member.id}`} 
                                                        checked={member.canDelete} 
                                                        onCheckedChange={(c) => handlePermissionChange(member.id, 'canDelete', !!c)}
                                                    />
                                                    <label htmlFor={`delete-${member.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Delete</label>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {format(new Date(member.createdAt), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem 
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={() => setMemberToRemove(member.id)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" /> Remove Member
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Member</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this member? They will lose access to all notes in this notebook.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={confirmRemoveMember}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Card className="border-destructive/50 bg-destructive/5">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                        <Trash2 className="h-5 w-5" /> Danger Zone
                    </CardTitle>
                    <CardDescription>
                        Permanent actions that cannot be undone.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h4 className="font-medium text-sm">Delete Notebook</h4>
                            <p className="text-sm text-muted-foreground">
                                Permanently delete this notebook, all its notes, and remove access for all members.
                            </p>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">Delete Notebook</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the notebook 
                                        <span className="font-semibold text-foreground"> "{notebook.name}"</span> and all contained data.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteNotebook} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        {isDeletingNotebook ? "Deleting..." : "Delete Notebook"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
