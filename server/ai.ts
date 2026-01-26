"use server";

import { getOpenAIApiKey } from "./settings";

export async function sendChatMessage(
  userMessage: string,
  noteContent?: string,
  noteTitle?: string
) {
  try {
    const result = await getOpenAIApiKey();

    if (!result.success || !result.apiKey) {
      return {
        success: false,
        error: "OpenAI API key not configured. Please add it in Settings.",
      };
    }

    const systemPrompt = noteContent
      ? `You are a helpful AI assistant. The user is working on a note titled "${noteTitle}". Here's the current content: ${noteContent}. Help them with questions, suggestions, or improvements.`
      : "You are a helpful AI assistant for note-taking and writing.";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${result.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("OpenAI API error:", error);
      return {
        success: false,
        error: "Failed to get AI response. Please check your API key.",
      };
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content;

    if (!assistantMessage) {
      return { success: false, error: "No response from AI" };
    }

    return { success: true, message: assistantMessage };
  } catch (error) {
    console.error("Error in sendChatMessage:", error);
    return { success: false, error: "An error occurred" };
  }
}
