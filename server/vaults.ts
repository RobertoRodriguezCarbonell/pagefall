"use server";

import { db } from "@/db/drizzle";
import { vaultGroups, vaultEntries } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { encryptString, decryptString } from "@/lib/encryption";
import { revalidatePath } from "next/cache";

// Initial data fetching
export const getVaultData = async () => {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    try {
        const groups = await db.query.vaultGroups.findMany({
            where: eq(vaultGroups.userId, session.user.id),
            with: {
                entries: true
            }
        });

        // Decrypt passwords before sending to client
        const groupsWithDecryptedEntries = groups.map(group => ({
            ...group,
            entries: group.entries.map(entry => {
                let decryptedPassword = "";
                try {
                    decryptedPassword = decryptString(entry.password);
                } catch (e) {
                    console.error(`Failed to decrypt password for entry ${entry.id}`, e);
                    // Return empty or error indicator? sending raw likely useless/dangerous if valid enc
                    // but we'll send empty string
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

    // Verify group ownership
    const group = await db.query.vaultGroups.findFirst({
        where: and( 
            eq(vaultGroups.id, data.groupId),
            eq(vaultGroups.userId, session.user.id)
        )
    });

    if (!group) return { success: false, error: "Group not found or unauthorized" };

    try {
        const encryptedPassword = encryptString(data.password);
        console.log("Saving new entry with password:", data.password); // Be careful logging this in prod

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

    // Verify entry (and indirectly group ownership through relation check)
    // Actually easier: Check if the entry's group belongs to user.
    // Or just find the entry join group and check user id.
    
    const entry = await db.query.vaultEntries.findFirst({
        where: eq(vaultEntries.id, id),
        with: {
            group: true
        }
    });

    if (!entry || entry.group.userId !== session.user.id) {
        return { success: false, error: "Entry not found or unauthorized" };
    }

    // If changing group, verify new group ownership
    if (data.groupId && data.groupId !== entry.groupId) {
         const newGroup = await db.query.vaultGroups.findFirst({
            where: and( 
                eq(vaultGroups.id, data.groupId),
                eq(vaultGroups.userId, session.user.id)
            )
        });
        if (!newGroup) return { success: false, error: "Target group not found" };
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

        // Return with decrypted password (if it was updated, use the one passed, else decrypt existing? 
        // Or better just return it as is if client needs it, but usually client has the form state.
        // Let's be consistent and return decrypted.
        
        let passwordToReturn = data.password;
        if (!passwordToReturn) { 
             // If we didn't update password, we shouldn't really care to return it decrypted here strictly 
             // but let's do it for consistency
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
        with: {
            group: true
        }
    });

    if (!entry || entry.group.userId !== session.user.id) {
        return { success: false, error: "Entry not found or unauthorized" };
    }

    try {
        await db.delete(vaultEntries).where(eq(vaultEntries.id, id));
        revalidatePath("/dashboard/password-vaults");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete entry" };
    }
};
