"use server";

import { db } from "@/db/drizzle";
import { vaultGroups, vaultEntries, vaultMembers, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, or } from "drizzle-orm";
import { headers } from "next/headers";
import { encryptString, decryptString } from "@/lib/encryption";
import { revalidatePath } from "next/cache";

// Helper to check vault access
async function checkVaultAccess(groupId: string, userId: string, permission?: 'canEdit' | 'canCreate' | 'canDelete') {
    // 1. Check ownership
    const group = await db.query.vaultGroups.findFirst({
        where: eq(vaultGroups.id, groupId),
    });

    if (group && group.userId === userId) {
        return { allowed: true, isOwner: true };
    }

    // 2. Check membership
    const member = await db.query.vaultMembers.findFirst({
        where: and(
            eq(vaultMembers.vaultGroupId, groupId),
            eq(vaultMembers.userId, userId),
            eq(vaultMembers.status, 'active')
        )
    });

    if (!member) {
        return { allowed: false, isOwner: false };
    }

    if (permission) {
        if (!member[permission]) {
            return { allowed: false, isOwner: false };
        }
    }

    return { allowed: true, isOwner: false };
}


// Initial data fetching
export const getVaultData = async () => {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    try {
        // Fetch owned groups
        const ownedGroups = await db.query.vaultGroups.findMany({
            where: eq(vaultGroups.userId, session.user.id),
            with: {
                entries: true
            }
        });

        // Fetch shared groups
        const members = await db.query.vaultMembers.findMany({
            where: and(
                eq(vaultMembers.userId, session.user.id),
                eq(vaultMembers.status, 'active')
            ),
            with: {
                group: {
                    with: {
                        entries: true
                    }
                }
            }
        });

        const sharedGroups = members.map(m => ({
            ...m.group,
            isShared: true,
            permissions: {
                canEdit: m.canEdit,
                canCreate: m.canCreate,
                canDelete: m.canDelete
            }
        }));

        const allGroups = [...ownedGroups.map(g => ({ ...g, isShared: false })), ...sharedGroups];

        // Decrypt passwords before sending to client
        const groupsWithDecryptedEntries = allGroups.map(group => ({
            ...group,
            entries: group.entries.map(entry => {
                let decryptedPassword = "";
                try {
                    decryptedPassword = decryptString(entry.password);
                } catch (e) {
                    console.error(`Failed to decrypt password for entry ${entry.id}`, e);
                    decryptedPassword = "";
                }
                return {
                    ...entry,
                    password: decryptedPassword
                };
            })
        }));

        return { success: true, groups: groupsWithDecryptedEntries };
    } catch (error) {
        console.error("Failed to fetch vault data:", error);
        return { success: false, error: "Failed to fetch vault data" };
    }
};

// Create Group
export const createVaultGroup = async (name: string) => {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    try {
        const [newGroup] = await db.insert(vaultGroups).values({
            name,
            userId: session.user.id
        }).returning();

        revalidatePath("/dashboard/password-vaults");
        return { success: true, group: newGroup };
    } catch (error) {
        return { success: false, error: "Failed to create group" };
    }
};

// Create Entry
export const createVaultEntry = async (data: {
    groupId: string;
    title: string;
    username: string;
    password: string;
    website?: string;
    notes?: string;
}) => {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const access = await checkVaultAccess(data.groupId, session.user.id, 'canCreate');
    if (!access.allowed) return { success: false, error: "Unauthorized" };

    try {
        const encryptedPassword = encryptString(data.password);

        const [newEntry] = await db.insert(vaultEntries).values({
            groupId: data.groupId,
            title: data.title,
            username: data.username,
            password: encryptedPassword,
            website: data.website || null,
            notes: data.notes || null,
        }).returning();

        const decryptedEntry = {
            ...newEntry,
            password: data.password // Return the raw one we just saved
        };

        revalidatePath("/dashboard/password-vaults");
        return { success: true, entry: decryptedEntry };
    } catch (error) {
        console.error("Create Entry Error:", error);
        return { success: false, error: "Failed to create entry" };
    }
};

// Update Entry
export const updateVaultEntry = async (id: string, data: {
    title?: string;
    username?: string;
    password?: string;
    website?: string;
    notes?: string;
    groupId?: string;
}) => {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    // Get the entry to check access
    const entry = await db.query.vaultEntries.findFirst({
        where: eq(vaultEntries.id, id),
        with: { group: true } // Need group to check ownership/permissions
    });

    if (!entry) return { success: false, error: "Entry not found" };

    // Check write/edit permission on the CURRENT group
    // Note: 'canEdit' isn't explicitly in reqs but 'canCreate'/'canDelete'. 
    // Usually 'canEdit' is implied by 'canCreate' or a separate one. 
    // The schema has 'canEdit', let's use it.
    const access = await checkVaultAccess(entry.groupId, session.user.id, 'canEdit');
    if (!access.allowed) return { success: false, error: "Unauthorized to edit this entry" };


    // If changing group, verify new group ownership/create permission
    if (data.groupId && data.groupId !== entry.groupId) {
         const newGroupAccess = await checkVaultAccess(data.groupId, session.user.id, 'canCreate');
         if (!newGroupAccess.allowed) return { success: false, error: "Unauthorized to move to target group" };
    }

    try {
        const updateData: any = { ...data };
        if (data.password) {
            updateData.password = encryptString(data.password);
        }

        const [updatedEntry] = await db.update(vaultEntries)
            .set(updateData)
            .where(eq(vaultEntries.id, id))
            .returning();
        
        let passwordToReturn = data.password;
        if (!passwordToReturn) { 
             passwordToReturn = decryptString(updatedEntry.password);
        }

        revalidatePath("/dashboard/password-vaults");
        return { success: true, entry: { ...updatedEntry, password: passwordToReturn } };
    } catch (error) {
        return { success: false, error: "Failed to update entry" };
    }
};

// Delete Entry
export const deleteVaultEntry = async (id: string) => {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const entry = await db.query.vaultEntries.findFirst({
        where: eq(vaultEntries.id, id),
        with: { group: true }
    });

    if (!entry) return { success: false, error: "Entry not found" };

    const access = await checkVaultAccess(entry.groupId, session.user.id, 'canDelete');
    if (!access.allowed) return { success: false, error: "Unauthorized to delete" };

    try {
        await db.delete(vaultEntries).where(eq(vaultEntries.id, id));
        revalidatePath("/dashboard/password-vaults");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Failed to delete" };
    }
};

// Invitations & Sharing

export const inviteUserToVault = async (data: {
    vaultGroupId: string;
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

    // 1. Verify owner (only owner can invite for now?)
    const group = await db.query.vaultGroups.findFirst({
        where: and(
            eq(vaultGroups.id, data.vaultGroupId),
            eq(vaultGroups.userId, session.user.id)
        )
    });

    if (!group) return { success: false, error: "Unauthorized or group not found" };

    // 2. Check if user exists
    const invitedUser = await db.query.user.findFirst({
        where: eq(user.email, data.email)
    });

    if (!invitedUser) return { success: false, error: "User with this email not found" };
    if (invitedUser.id === session.user.id) return { success: false, error: "Cannot invite yourself" };

    // 3. Check if already member
    const existingMember = await db.query.vaultMembers.findFirst({
        where: and(
            eq(vaultMembers.vaultGroupId, data.vaultGroupId),
            eq(vaultMembers.userId, invitedUser.id)
        )
    });

    if (existingMember) {
        return { success: false, error: "User is already a member or pending" };
    }

    try {
        await db.insert(vaultMembers).values({
            vaultGroupId: data.vaultGroupId,
            userId: invitedUser.id,
            invitedBy: session.user.id,
            status: 'pending',
            canEdit: data.permissions.canEdit,
            canCreate: data.permissions.canCreate,
            canDelete: data.permissions.canDelete
        });

        revalidatePath("/dashboard/password-vaults");
        return { success: true };
    } catch (error) {
        console.error("Invite error:", error);
        return { success: false, error: "Failed to invite user" };
    }
}

export const getPendingInvitations = async () => {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    try {
        const invitations = await db.query.vaultMembers.findMany({
            where: and(
                eq(vaultMembers.userId, session.user.id),
                eq(vaultMembers.status, 'pending')
            ),
            with: {
                group: true,
                inviter: true
            }
        });

        return { success: true, invitations };
    } catch (error) {
        console.error("Get invites error:", error);
        return { success: false, error: "Failed to fetch invitations" };
    }
}

export const respondToInvitation = async (invitationId: string, accept: boolean) => {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    try {
        const member = await db.query.vaultMembers.findFirst({
            where: and(
                eq(vaultMembers.id, invitationId),
                eq(vaultMembers.userId, session.user.id)
            )
        });

        if (!member) return { success: false, error: "Invitation not found" };

        if (accept) {
            await db.update(vaultMembers)
                .set({ status: 'active' })
                .where(eq(vaultMembers.id, invitationId));
        } else {
            await db.delete(vaultMembers)
                .where(eq(vaultMembers.id, invitationId));
        }

        revalidatePath("/dashboard/password-vaults");
        return { success: true };
    } catch (error) {
        console.error("Respond invite error:", error);
        return { success: false, error: "Failed to respond to invitation" };
    }
}
