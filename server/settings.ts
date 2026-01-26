"use server";

import { settings } from "@/db/schema";
import { encryptApiKey, decryptApiKey } from "@/lib/encryption";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";

export async function saveOpenAIApiKey(apiKey: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const encryptedKey = encryptApiKey(apiKey);

    const existingSettings = await db.query.settings.findFirst({
      where: eq(settings.userId, session.user.id),
    });

    if (existingSettings) {
      await db
        .update(settings)
        .set({
          openAIApiKey: encryptedKey,
          updatedAt: new Date(),
        })
        .where(eq(settings.userId, session.user.id));
    } else {
      await db.insert(settings).values({
        userId: session.user.id,
        openAIApiKey: encryptedKey,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error saving API key:", error);
    return { success: false, error: "Failed to save API key" };
  }
}

export async function getOpenAIApiKey() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userSettings = await db.query.settings.findFirst({
      where: eq(settings.userId, session.user.id),
    });

    if (!userSettings?.openAIApiKey) {
      return { success: true, apiKey: null };
    }

    const decryptedKey = decryptApiKey(userSettings.openAIApiKey);

    return { success: true, apiKey: decryptedKey };
  } catch (error) {
    console.error("Error getting API key:", error);
    return { success: false, error: "Failed to get API key" };
  }
}

export async function deleteOpenAIApiKey() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    await db
      .update(settings)
      .set({
        openAIApiKey: null,
        updatedAt: new Date(),
      })
      .where(eq(settings.userId, session.user.id));

    return { success: true };
  } catch (error) {
    console.error("Error deleting API key:", error);
    return { success: false, error: "Failed to delete API key" };
  }
}