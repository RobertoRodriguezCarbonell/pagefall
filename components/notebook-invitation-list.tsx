"use client"

import { Button } from "@/components/ui/button"
import { respondToNotebookInvitation } from "@/server/notebooks"
import { Inbox } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Invitation {
    id: string;
    notebook: {
        name: string;
    };
    inviter: {
        name: string;
    };
}

interface NotebookInvitationListProps {
    initialInvitations: Invitation[];
}

export function NotebookInvitationList({ initialInvitations }: NotebookInvitationListProps) {
    const [invitations, setInvitations] = useState(initialInvitations);
    const [inviteToReject, setInviteToReject] = useState<string | null>(null);
    const router = useRouter();

    if (invitations.length === 0) return null;

    const handleRespond = async (id: string, accept: boolean) => {
        try {
            const result = await respondToNotebookInvitation(id, accept);
            if (result.success) {
                setInvitations(invitations.filter(i => i.id !== id));
                toast.success(accept ? "Invitation accepted" : "Invitation rejected");
                router.refresh();
            } else {
                toast.error(result.error || "Failed to respond");
            }
        } catch {
            toast.error("Failed to respond");
        }
    }

    return (
        <div className="mb-8 space-y-4">
             <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <Inbox className="h-4 w-4" /> Notebook Invitations
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {invitations.map(invite => (
                    <div key={invite.id} className="p-4 rounded-lg bg-muted/50 border flex flex-col justify-between gap-4">
                        <div>
                            <div className="font-semibold text-lg">{invite.notebook.name}</div>
                            <div className="text-sm text-muted-foreground">Invited by {invite.inviter.name}</div>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Button 
                                size="sm" 
                                className="w-full"
                                onClick={() => handleRespond(invite.id, true)}
                            >
                                Accept
                            </Button>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full"
                                onClick={() => setInviteToReject(invite.id)}
                            >
                                Reject
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            <AlertDialog open={!!inviteToReject} onOpenChange={(open) => !open && setInviteToReject(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reject Invitation?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to reject this invitation? You won't be able to access the notebook unless invited again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => inviteToReject && handleRespond(inviteToReject, false).then(() => setInviteToReject(null))}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Reject
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
