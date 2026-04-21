"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { DocMeta, DocState, Signature } from "../lib/doc-types";
import { makeDefaultDocState, docFilename } from "../lib/doc-types";
import { fetchDocuments, fetchTemplate, saveDocument, loadSavedDocument } from "../lib/chat-api";
import { ChatPanel } from "../components/chat-panel";
import { DocPreview } from "../components/doc-preview";
import { SignatureBlock } from "../components/signature-block";
import { NdaPreview } from "../nda-preview";
import { buildNdaPdfBlob } from "../nda-pdf";
import { buildGenericPdfBlob } from "../components/generic-pdf";
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
  const [downloading, setDownloading] = useState(false);
  const [savedDocId, setSavedDocId] = useState<number | null>(null);
  const templateRef = useRef("");

  useEffect(() => {
    const user = localStorage.getItem("prelegal_user");
    if (!user) {
      window.location.href = "/login/";
      return;
    }
    const savedId = params.get("saved_id");
    Promise.all([fetchDocuments(), fetchTemplate(docSlug)])
      .then(async ([docs, markdown]: [DocMeta[], string]) => {
        const meta = docs.find((d) => d.doc_type === docSlug);
        if (!meta) {
          setError(
            `Unknown document type: "${docSlug}". Please go back and choose a supported document.`,
          );
          return;
        }
        setDocMeta(meta);
        setTemplateMarkdown(markdown);
        templateRef.current = markdown;

        if (savedId) {
          try {
            const saved = await loadSavedDocument(parseInt(savedId), user);
            const state = makeDefaultDocState(meta);
            setDocState({
              ...state,
              fields: saved.fields,
              party1Signature: { ...state.party1Signature, ...saved.party1_signature } as Signature,
              party2Signature: { ...state.party2Signature, ...saved.party2_signature } as Signature,
            });
            setSavedDocId(parseInt(savedId));
          } catch {
            setDocState(makeDefaultDocState(meta));
          }
        } else {
          setDocState(makeDefaultDocState(meta));
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [docSlug, params]);

  const handlePatch = useCallback((patch: Partial<Record<string, string>>) => {
    const docFields: Record<string, string> = {};
    const p1Updates: Partial<Signature> = {};
    const p2Updates: Partial<Signature> = {};

    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === null) continue;
      if (key.startsWith("party1_")) {
        const field = key.slice(7) as keyof Signature;
        p1Updates[field] = value;
      } else if (key.startsWith("party2_")) {
        const field = key.slice(7) as keyof Signature;
        p2Updates[field] = value;
      } else {
        docFields[key] = value;
      }
    }

    setDocState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: Object.keys(docFields).length
          ? { ...prev.fields, ...docFields }
          : prev.fields,
        party1Signature: Object.keys(p1Updates).length
          ? { ...prev.party1Signature, ...p1Updates }
          : prev.party1Signature,
        party2Signature: Object.keys(p2Updates).length
          ? { ...prev.party2Signature, ...p2Updates }
          : prev.party2Signature,
      };
    });
  }, []);

  const handleSignatureUpdate = useCallback(
    (party: "party1" | "party2", sig: Signature) => {
      setDocState((prev) =>
        prev ? { ...prev, [`${party}Signature`]: sig } : prev,
      );
    },
    [],
  );

  const handleDownload = useCallback(async () => {
    if (!docState || !docMeta || downloading) return;
    setDownloading(true);
    try {
      let blob: Blob;
      if (docSlug === "nda") {
        blob = await buildNdaPdfBlob(mapToNdaFormData(docState));
      } else {
        blob = await buildGenericPdfBlob(
          docMeta.name,
          templateRef.current,
          docState.fields,
        );
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = docFilename(docState, "pdf");
      a.click();
      URL.revokeObjectURL(url);

      // Auto-save on download
      const user = localStorage.getItem("prelegal_user");
      if (user) {
        try {
          const result = await saveDocument({
            user_email: user,
            doc_type: docState.docType,
            doc_name: docState.docName,
            fields: docState.fields,
            party1_signature: docState.party1Signature as Record<string, string>,
            party2_signature: docState.party2Signature as Record<string, string>,
            doc_id: savedDocId ?? undefined,
          });
          setSavedDocId(result.id);
        } catch {
          // save failure is non-fatal
        }
      }
    } finally {
      setDownloading(false);
    }
  }, [docState, docMeta, docSlug, downloading, savedDocId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#D6F4ED" }}>
        <p className="text-sm" style={{ color: "#473472" }}>Loading document...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        <a href="/" className="text-sm font-medium underline underline-offset-2" style={{ color: "#53629E" }}>
          Back to document picker
        </a>
      </main>
    );
  }

  if (!docMeta || !docState) return null;

  const isNda = docSlug === "nda";

  // Merge doc fields + prefixed signature fields so the LLM knows what's already captured
  const allCurrentFields: Record<string, string> = {
    ...docState.fields,
    ...Object.fromEntries(
      Object.entries(docState.party1Signature)
        .filter(([, v]) => v)
        .map(([k, v]) => [`party1_${k}`, v]),
    ),
    ...Object.fromEntries(
      Object.entries(docState.party2Signature)
        .filter(([, v]) => v)
        .map(([k, v]) => [`party2_${k}`, v]),
    ),
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <header
        className="flex flex-shrink-0 items-center justify-between border-b px-4 py-3"
        style={{ backgroundColor: "#D6F4ED", borderColor: "#87BAC3" }}
      >
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="rounded-md border bg-white px-2 py-1 text-xs font-medium shadow-sm transition hover:bg-slate-50"
            style={{ borderColor: "#87BAC3", color: "#53629E" }}
          >
            ← Back
          </a>
          <h1
            className="font-serif text-lg font-semibold tracking-tight"
            style={{ color: "#473472" }}
          >
            {docMeta.name}
          </h1>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundColor: "#A3B087" }}
        >
          {downloading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364-6.364-2.121 2.121M8.757 15.243l-2.121 2.121M17.364 17.364l-2.121-2.121M8.757 8.757 6.636 6.636" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M10 3a1 1 0 0 1 1 1v7.586l1.707-1.707a1 1 0 1 1 1.414 1.414l-3.5 3.5a1 1 0 0 1-1.414 0l-3.5-3.5a1 1 0 1 1 1.414-1.414L9 11.586V4a1 1 0 0 1 1-1Zm-7 12a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Z" clipRule="evenodd" />
              </svg>
              Download PDF
            </>
          )}
        </button>
      </header>

      {/* Disclaimer */}
      <div className="flex-shrink-0 border-b px-4 py-2 text-center text-xs" style={{ backgroundColor: "#fffbeb", borderColor: "#fde68a", color: "#92400e" }}>
        These documents are AI-generated drafts for reference only. They are not legal advice and should be reviewed by a qualified attorney before use.
      </div>

      <div className="grid flex-1 grid-cols-[380px_1fr] overflow-hidden">
        {/* Left panel: chat + signatures */}
        <div
          className="flex flex-col overflow-hidden border-r"
          style={{ borderColor: "#87BAC3" }}
        >
          <div className="flex-1 overflow-hidden p-4">
            <ChatPanel
              docType={docSlug}
              fields={allCurrentFields}
              greeting={docMeta.greeting}
              onPatch={handlePatch}
            />
          </div>
          <div
            className="max-h-[42%] overflow-y-auto border-t p-4"
            style={{ borderColor: "#87BAC3", backgroundColor: "#f8fffe" }}
          >
            <SignatureBlock
              party1Label={docState.party1Label}
              party2Label={docState.party2Label}
              party1Signature={docState.party1Signature}
              party2Signature={docState.party2Signature}
              onUpdate={handleSignatureUpdate}
            />
          </div>
        </div>

        {/* Right panel: PDF-style document viewer */}
        <div
          className="overflow-y-auto px-8 py-10"
          style={{ backgroundColor: "#c8d0d8" }}
        >
          {/* Paper page */}
          <div
            className="mx-auto rounded-sm"
            style={{
              maxWidth: "816px",
              minHeight: "1056px",
              backgroundColor: "#ffffff",
              padding: "72px 80px",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.15), 0 20px 40px -8px rgba(0,0,0,0.25)",
            }}
          >
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
        <main className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#D6F4ED" }}>
          <p className="text-sm" style={{ color: "#473472" }}>Loading...</p>
        </main>
      }
    >
      <EditorInner />
    </Suspense>
  );
}
