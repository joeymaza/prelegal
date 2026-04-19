import type { NdaFormData } from "./nda-template";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatResponse = {
  reply: string;
  patch: Partial<Omit<NdaFormData, "party1Signature" | "party2Signature">>;
};

export async function sendChatTurn(
  messages: ChatMessage[],
  currentFields: Partial<NdaFormData>,
  documentType: string = "nda",
): Promise<ChatResponse> {
  const resp = await fetch("/api/chat/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      document_type: documentType,
      messages,
      current_fields: currentFields,
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: "Something went wrong" }));
    throw new Error(err.detail || `Chat request failed (${resp.status})`);
  }
  return resp.json();
}
