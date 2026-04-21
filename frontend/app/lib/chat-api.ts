import type { DocFields, SavedDocSummary } from "./doc-types";

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

export type SaveDocPayload = {
  user_email: string;
  doc_type: string;
  doc_name: string;
  fields: DocFields;
  party1_signature: Record<string, string>;
  party2_signature: Record<string, string>;
  doc_id?: number;
};

export async function saveDocument(payload: SaveDocPayload): Promise<{ id: number }> {
  const resp = await fetch("/api/history/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error("Failed to save document");
  return resp.json();
}

export async function listSavedDocuments(userEmail: string): Promise<SavedDocSummary[]> {
  const resp = await fetch(`/api/history/?user_email=${encodeURIComponent(userEmail)}`);
  if (!resp.ok) throw new Error("Failed to load document history");
  return resp.json();
}

export async function loadSavedDocument(docId: number, userEmail: string): Promise<{
  fields: DocFields;
  party1_signature: Record<string, string>;
  party2_signature: Record<string, string>;
}> {
  const resp = await fetch(`/api/history/${docId}?user_email=${encodeURIComponent(userEmail)}`);
  if (!resp.ok) throw new Error("Failed to load document");
  return resp.json();
}
