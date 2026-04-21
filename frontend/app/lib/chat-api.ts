import type { DocFields } from "./doc-types";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatResponse = {
  reply: string;
  patch: Partial<DocFields>;
};

export async function sendChatTurn(
  messages: ChatMessage[],
  currentFields: DocFields,
  documentType: string,
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

export async function fetchDocuments() {
  const resp = await fetch("/api/documents/");
  if (!resp.ok) throw new Error("Failed to load document catalog");
  return resp.json();
}

export async function fetchTemplate(docType: string): Promise<string> {
  const resp = await fetch(`/api/documents/${docType}/template`);
  if (!resp.ok) throw new Error("Failed to load template");
  const data = await resp.json();
  return data.markdown;
}
