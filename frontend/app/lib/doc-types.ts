export type Signature = {
  printName: string;
  title: string;
  company: string;
  noticeAddress: string;
  signedDate: string;
};

export type DocFields = Record<string, string>;

export type SavedDocSummary = {
  id: number;
  doc_type: string;
  doc_name: string;
  updated_at: string;
};

export type DocMeta = {
  doc_type: string;
  name: string;
  description: string;
  party1_label: string;
  party2_label: string;
  field_names: string[];
  greeting: string;
};

export type DocState = {
  docType: string;
  docName: string;
  fields: DocFields;
  party1Label: string;
  party2Label: string;
  party1Signature: Signature;
  party2Signature: Signature;
};

export const emptySignature = (): Signature => ({
  printName: "",
  title: "",
  company: "",
  noticeAddress: "",
  signedDate: "",
});

export function makeDefaultDocState(meta: DocMeta): DocState {
  return {
    docType: meta.doc_type,
    docName: meta.name,
    fields: {},
    party1Label: meta.party1_label,
    party2Label: meta.party2_label,
    party1Signature: emptySignature(),
    party2Signature: emptySignature(),
  };
}

export function docFilename(state: DocState, ext: "pdf" | "md"): string {
  const slug = (s: string) =>
    s.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "party";
  const p1 = state.fields[state.party1Label] || state.party1Signature.company;
  const p2 = state.fields[state.party2Label] || state.party2Signature.company;
  const typeSlug = state.docType;
  return `${typeSlug}-${slug(p1)}-${slug(p2)}.${ext}`;
}

export const formatDate = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};
