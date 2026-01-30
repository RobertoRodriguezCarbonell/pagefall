"use server";

import { db } from "@/db/drizzle";
import { InsertNotebook, notebooks, notebookMembers, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, or } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

// Helper to check notebook access
export async function checkNotebookAccess(notebookId: string, userId: string, permission?: 'canEdit' | 'canCreate' | 'canDelete') {
    // 1. Check ownership
    const notebook = await db.query.notebooks.findFirst({
        where: eq(notebooks.id, notebookId),
    });

    if (notebook && notebook.userId === userId) {
        return { allowed: true, isOwner: true };
    }

    // 2. Check membership
    const member = await db.query.notebookMembers.findFirst({
        where: and(
            eq(notebookMembers.notebookId, notebookId),
            eq(notebookMembers.userId, userId),
            eq(notebookMembers.status, 'active')
        )
    });

    if (member) {
        if (!permission) return { allowed: true, isOwner: false };
        // Check specific permission
        if (member[permission]) {
             return { allowed: true, isOwner: false };
        }
    }

    return { allowed: false, isOwner: false };
}

export const createNotebook = async (values: InsertNotebook) => {
    try {
        await db.insert(notebooks).values(values);
        return { success: true, message: "Notebook created successfully" };
    } catch {
        return { success: false, message: "Failed to create notebook" };
    }
};

export const getNotebooks = async () => {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        const userId = session?.user?.id;

        if (!userId) {
            return { success: false, message: "User not found" };
        }

        // Fetch owned notebooks
        const ownedNotebooks = await db.query.notebooks.findMany({
            where: eq(notebooks.userId, userId),
            with: {
                notes: true,
                tasks: true,
                members: true // To show shared status
            }
        });

        // Fetch shared notebooks (via membership)
        const memberships = await db.query.notebookMembers.findMany({
            where: and(
                eq(notebookMembers.userId, userId),
                eq(notebookMembers.status, 'active')
            ),
            with: {
                notebook: {
                    with: {
                         notes: true,
                         tasks: true,
                         members: true
                    }
                }
            }
        });

        // Map memberships to notebook structure and mark as sharedWithAssignedPermissions
        const sharedNotebooks = memberships.map(m => ({
            ...m.notebook,
            isShared: true, // Marker for UI
            permissions: {
                canEdit: m.canEdit,
                canCreate: m.canCreate,
                canDelete: m.canDelete
            }
        }));

        // Combine
        const allNotebooks = [
            ...ownedNotebooks.map(n => ({
                ...n,
                isShared: n.members.length > 0,
                isOwner: true,
                permissions: { canEdit: true, canCreate: true, canDelete: true } // Owner has full permissions
            })),
            ...sharedNotebooks
        ];

        return { success: true, notebooks: allNotebooks };
    } catch (e) {
        console.error(e);
        return { success: false, message: "Failed to get notebooks" };
    }
};

export const getNotebookById = async (id: string) => {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        
        const userId = session?.user?.id;
        if (!userId) return { success: false, message: "Unauthorized" };

        const access = await checkNotebookAccess(id, userId);
        if (!access.allowed) return { success: false, message: "Unauthorized" };

        const notebook = await db.query.notebooks.findFirst({
            where: eq(notebooks.id, id),
            with: {
                notes: true,
                tasks: true,
            }
        });

        return { success: true, notebook };
    } catch {
        return { success: false, message: "Failed to get notebook" };
    }
};

export const updateNotebook = async (id: string, values: InsertNotebook) => {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        
        if (!session?.user?.id) return { success: false, message: "Unauthorized" };

        const access = await checkNotebookAccess(id, session.user.id);
        if (!access.isOwner) return { success: false, message: "Only owner can update notebook details" };

        await db.update(notebooks).set(values).where(eq(notebooks.id, id));
        return { success: true, message: "Notebook updated successfully" };
    } catch {
        return { success: false, message: "Failed to update notebook" };
    }
};

export const deleteNotebook = async (id: string) => {
    try {
         const session = await auth.api.getSession({
            headers: await headers()
        });
        
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const access = await checkNotebookAccess(id, session.user.id);
        if (!access.isOwner) return { success: false, error: "Only owner can delete notebook" };

        await db.delete(notebooks).where(eq(notebooks.id, id));
        return { success: true, message: "Notebook deleted successfully" };
    } catch {
        return { success: false, error: "Failed to delete notebook" };
    }
};

// -- Sharing Actions --

export const inviteUserToNotebook = async (data: {
    notebookId: string;
    email: string;
    permissions: {
        canEdit: boolean;
        canCreate: boolean;
        canDelete: boolean;
    }
}) => {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const access = await checkNotebookAccess(data.notebookId, session.user.id);
    if (!access.isOwner) return { success: false, error: "Only the owner can invite members" };

    try {
        // Find user by email
        const targetUser = await db.query.user.findFirst({
            where: eq(user.email, data.email)
        });

        if (!targetUser) return { success: false, error: "User not found" };
        if (targetUser.id === session.user.id) return { success: false, error: "Cannot invite yourself" };

        // Check if already member or invited
        const existingMember = await db.query.notebookMembers.findFirst({
            where: and(
                eq(notebookMembers.notebookId, data.notebookId),
                eq(notebookMembers.userId, targetUser.id)
            )
        });

        if (existingMember) {
            if (existingMember.status === 'active') return { success: false, error: "User is already a member" };
            return { success: false, error: "User is already invited" };
        }

        // Create invitation
        await db.insert(notebookMembers).values({
            notebookId: data.notebookId,
            userId: targetUser.id,
            invitedBy: session.user.id,
            status: 'pending',
            canEdit: data.permissions.canEdit,
            canCreate: data.permissions.canCreate,
            canDelete: data.permissions.canDelete
        });

        return { success: true };
    } catch (error) {
        console.error("Invite error:", error);
        return { success: false, error: "Failed to invite user" };
    }
}

export const getNotebookInvitations = async () => {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    
    if (!session?.user?.id) return { success: false, invitations: [] };

    const invitations = await db.query.notebookMembers.findMany({
        where: and(
            eq(notebookMembers.userId, session.user.id),
            eq(notebookMembers.status, 'pending')
        ),
        with: {
            notebook: true,
            inviter: true
        }
    });

    return { success: true, invitations };
}

export const respondToNotebookInvitation = async (invitationId: string, accept: boolean) => {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    try {
        const member = await db.query.notebookMembers.findFirst({
            where: and(
                eq(notebookMembers.id, invitationId),
                eq(notebookMembers.userId, session.user.id)
            )
        });

        if (!member) return { success: false, error: "Invitation not found" };

        if (accept) {
            await db.update(notebookMembers)
                .set({ status: 'active' })
                .where(eq(notebookMembers.id, invitationId));
        } else {
            await db.delete(notebookMembers)
                .where(eq(notebookMembers.id, invitationId));
        }

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Respond invite error:", error);
        return { success: false, error: "Failed to respond to invitation" };
    }
}

export const leaveNotebook = async (notebookId: string) => {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    try {
        const result = await db.delete(notebookMembers)
            .where(
                and(
                    eq(notebookMembers.notebookId, notebookId),
                    eq(notebookMembers.userId, session.user.id)
                )
            )
            .returning(); 

        if (result.length === 0) {
             return { success: false, error: "Membership not found" };
        }

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Leave notebook error:", error);
        return { success: false, error: "Failed to leave notebook" };
    }
}

export const getNotebookSettingsData = async (notebookId: string) => {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const access = await checkNotebookAccess(notebookId, session.user.id);
    if (!access.isOwner) return { success: false, error: "Unauthorized" };

    try {
        const notebook = await db.query.notebooks.findFirst({
            where: eq(notebooks.id, notebookId),
        });

        if (!notebook) return { success: false, error: "Notebook not found" };

        const members = await db.query.notebookMembers.findMany({
            where: eq(notebookMembers.notebookId, notebookId),
            with: {
                user: true // Get user details
            }
        });

        return { success: true, notebook, members };
    } catch (error) {
        console.error("Get settings error:", error);
        return { success: false, error: "Failed to fetch settings" };
    }
}

export const updateNotebookMemberPermissions = async (memberId: string, permissions: {
    canEdit: boolean;
    canCreate: boolean;
    canDelete: boolean;
}) => {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const member = await db.query.notebookMembers.findFirst({
        where: eq(notebookMembers.id, memberId),
    });

    if (!member) return { success: false, error: "Member not found" };

    const access = await checkNotebookAccess(member.notebookId, session.user.id);
    if (!access.isOwner) return { success: false, error: "Only the owner can manage permissions" };

    try {
        await db.update(notebookMembers)
            .set(permissions)
            .where(eq(notebookMembers.id, memberId));

        revalidatePath(`/dashboard/notebook/${member.notebookId}/settings`);
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to update permissions" };
    }
}

export const removeNotebookMember = async (memberId: string) => {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const member = await db.query.notebookMembers.findFirst({
        where: eq(notebookMembers.id, memberId),
    });

    if (!member) return { success: false, error: "Member not found" };

    const access = await checkNotebookAccess(member.notebookId, session.user.id);
    if (!access.isOwner) return { success: false, error: "Only the owner can remove members" };

    try {
        await db.delete(notebookMembers).where(eq(notebookMembers.id, memberId));
        revalidatePath(`/dashboard/notebook/${member.notebookId}/settings`);
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to remove member" };
    }
}
