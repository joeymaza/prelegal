"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { DocMeta, DocState, Signature } from "../lib/doc-types";
import { makeDefaultDocState } from "../lib/doc-types";
import { fetchDocuments, fetchTemplate } from "../lib/chat-api";
import { ChatPanel } from "../components/chat-panel";
import { DocPreview } from "../components/doc-preview";
import { SignatureBlock } from "../components/signature-block";
import { NdaPreview } from "../nda-preview";
import type { NdaFormData } from "../nda-template";

function mapToNdaFormData(state: DocState): NdaFormData {
  const f = state.fields;
  return {
    party1Name: f.party1Name || "",
    party2Name: f.party2Name || "",
    purpose:
      f.purpose ||
      "Evaluating whether to enter into a business relationship with the other party.",
    effectiveDate: f.effectiveDate || "",
    mndaTermMode: f.mndaTermMode === "perpetual" ? "perpetual" : "expires",
    mndaTermYears: parseInt(f.mndaTermYears || "1") || 1,
    confTermMode: f.confTermMode === "perpetual" ? "perpetual" : "expires",
    confTermYears: parseInt(f.confTermYears || "1") || 1,
    governingLawState: f.governingLawState || "",
    jurisdiction: f.jurisdiction || "",
    modifications: f.modifications || "None.",
    party1Signature: state.party1Signature,
    party2Signature: state.party2Signature,
  };
}

function EditorInner() {
  const params = useSearchParams();
  const docSlug = params.get("doc") ?? "nda";

  const [docMeta, setDocMeta] = useState<DocMeta | null>(null);
  const [docState, setDocState] = useState<DocState | null>(null);
  const [templateMarkdown, setTemplateMarkdown] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = localStorage.getItem("prelegal_user");
    if (!user) {
      window.location.href = "/login/";
      return;
    }
    Promise.all([fetchDocuments(), fetchTemplate(docSlug)])
      .then(([docs, markdown]: [DocMeta[], string]) => {
        const meta = docs.find((d) => d.doc_type === docSlug);
        if (!meta) {
          setError(
            `Unknown document type: "${docSlug}". Please go back and choose a supported document.`,
          );
          return;
        }
        setDocMeta(meta);
        setDocState(makeDefaultDocState(meta));
        setTemplateMarkdown(markdown);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [docSlug]);

  const handlePatch = useCallback((patch: Partial<Record<string, string>>) => {
    const clean = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined),
    ) as Record<string, string>;
    setDocState((prev) =>
      prev ? { ...prev, fields: { ...prev.fields, ...clean } } : prev,
    );
  }, []);

  const handleSignatureUpdate = useCallback(
    (party: "party1" | "party2", sig: Signature) => {
      setDocState((prev) =>
        prev ? { ...prev, [`${party}Signature`]: sig } : prev,
      );
    },
    [],
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">Loading document...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        <a
          href="/"
          className="text-sm font-medium underline underline-offset-2"
          style={{ color: "#53629E" }}
        >
          Back to document picker
        </a>
      </main>
    );
  }

  if (!docMeta || !docState) return null;

  const isNda = docSlug === "nda";

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header
        className="flex flex-shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3"
        style={{ backgroundColor: "#D6F4ED" }}
      >
        <a
          href="/"
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
        >
          ← Back
        </a>
        <h1
          className="font-serif text-lg font-semibold tracking-tight"
          style={{ color: "#473472" }}
        >
          {docMeta.name}
        </h1>
      </header>

      <div className="grid flex-1 grid-cols-[380px_1fr] overflow-hidden">
        {/* Left panel: chat + signatures */}
        <div className="flex flex-col overflow-hidden border-r border-slate-200">
          <div className="flex-1 overflow-hidden p-4">
            <ChatPanel
              docType={docSlug}
              fields={docState.fields}
              greeting={docMeta.greeting}
              onPatch={handlePatch}
            />
          </div>
          <div className="max-h-[40%] overflow-y-auto border-t border-slate-200 p-4">
            <SignatureBlock
              party1Label={docState.party1Label}
              party2Label={docState.party2Label}
              party1Signature={docState.party1Signature}
              party2Signature={docState.party2Signature}
              onUpdate={handleSignatureUpdate}
            />
          </div>
        </div>

        {/* Right panel: document preview */}
        <div className="overflow-y-auto bg-white p-6">
          <div className="mx-auto max-w-3xl">
            {isNda ? (
              <NdaPreview data={mapToNdaFormData(docState)} />
            ) : (
              <DocPreview markdown={templateMarkdown} fields={docState.fields} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-slate-500">Loading...</p>
        </main>
      }
    >
      <EditorInner />
    </Suspense>
  );
}
