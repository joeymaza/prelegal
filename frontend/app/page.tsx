"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  makeDefaultFormData,
  NdaFormData,
  ndaFilename,
} from "./nda-template";
import { NdaPreview } from "./nda-preview";
import { ChatPanel } from "./chat-panel";
import { SignaturePanel } from "./signature-panel";

function encodeState(data: NdaFormData): string {
  if (typeof window === "undefined") return "";
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

function decodeState(s: string): NdaFormData | null {
  try {
    const json = decodeURIComponent(escape(atob(s)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function Home() {
  const [data, setData] = useState<NdaFormData>(makeDefaultFormData);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [user, setUser] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("prelegal_user");
    if (!stored) {
      window.location.href = "/login/";
      return;
    }
    setUser(stored);
    setReady(true);

    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("d");
    if (encoded) {
      const decoded = decodeState(encoded);
      if (decoded) setData((prev) => ({ ...prev, ...decoded }));
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const download = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const { buildNdaPdfBlob } = await import("./nda-pdf");
      const blob = await buildNdaPdfBlob(data);
      const url = URL.createObjectURL(blob);
      const filename = ndaFilename(data, "pdf");
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
      showToast(`Downloaded ${filename}`);
    } finally {
      setDownloading(false);
    }
  }, [data, downloading, showToast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void download();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [download]);

  const reset = () => setData(makeDefaultFormData());

  const copyShareLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("d", encodeState(data));
    try {
      await navigator.clipboard.writeText(url.toString());
      showToast("Share link copied to clipboard");
    } catch {
      showToast("Could not copy — your browser blocked clipboard access");
    }
  };

  const applyPatch = useCallback((patch: Partial<NdaFormData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const update = useCallback(
    <K extends keyof NdaFormData>(key: K, value: NdaFormData[K]) =>
      applyPatch({ [key]: value } as Partial<NdaFormData>),
    [applyPatch],
  );

  const logout = () => {
    localStorage.removeItem("prelegal_user");
    window.location.href = "/login/";
  };

  if (!ready) return null;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-32 pt-6 sm:px-6 lg:pb-10 lg:pt-10">
      <header className="mb-6 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-indigo-700 text-[11px] font-bold text-white shadow-sm"
          >
            NDA
          </span>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900">
            Mutual NDA Creator
          </h1>
          <span className="ml-1 hidden rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 sm:inline">
            v1.0 · Common Paper
          </span>
          <span className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            {user}
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              Log out
            </button>
          </span>
        </div>
        <p className="text-sm text-slate-600">
          Chat with AI to draft your agreement, preview it live, and download a clean PDF. Based on the{" "}
          <a
            className="text-indigo-600 underline decoration-indigo-200 underline-offset-2 hover:decoration-indigo-400"
            href="https://commonpaper.com/standards/mutual-nda/1.0"
            target="_blank"
            rel="noreferrer"
          >
            Common Paper Mutual NDA
          </a>
          .
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* Left panel: Chat + Signatures + Actions */}
        <div className="flex flex-col gap-5">
          <div className="paper flex flex-col rounded-xl p-5" style={{ height: "500px" }}>
            <ChatPanel ndaData={data} onPatch={applyPatch} />
          </div>

          <div className="paper rounded-xl p-5">
            <SignaturePanel data={data} onUpdate={update} />
          </div>

          {/* Desktop action row */}
          <div className="hidden items-center gap-3 lg:flex">
            <DownloadButton downloading={downloading} onClick={download} />
            <button
              type="button"
              onClick={copyShareLink}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Copy share link
            </button>
            <button
              type="button"
              onClick={reset}
              className="ml-auto rounded-md px-3 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
            >
              Reset
            </button>
          </div>

          <p className="hidden text-xs text-slate-500 lg:block">
            Tip: press <kbd className="rounded border border-slate-300 bg-slate-50 px-1 py-0.5 text-[10px]">Ctrl</kbd> +{" "}
            <kbd className="rounded border border-slate-300 bg-slate-50 px-1 py-0.5 text-[10px]">Enter</kbd> to download.
          </p>
        </div>

        {/* Preview panel */}
        <section
          className="paper rounded-xl p-6"
          aria-label="NDA preview"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">Preview</h2>
          </div>
          <div className="max-h-[78vh] overflow-auto rounded-lg bg-white px-5 py-4 ring-1 ring-slate-100">
            <NdaPreview data={data} />
          </div>
        </section>
      </div>

      {/* Sticky mobile action bar */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          <DownloadButton downloading={downloading} onClick={download} className="flex-1" />
          <button
            type="button"
            onClick={copyShareLink}
            aria-label="Copy share link"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm"
          >
            Share
          </button>
          <button
            type="button"
            onClick={reset}
            aria-label="Reset form"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-500"
          >
            Reset
          </button>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-20 left-1/2 z-20 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-lg lg:bottom-8"
          style={{ animation: "toast-in 200ms ease-out" }}
        >
          {toast}
        </div>
      )}
    </main>
  );
}

function DownloadButton({
  downloading,
  onClick,
  className = "",
}: {
  downloading: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={downloading}
      className={`inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {downloading ? (
        <>
          <Spinner /> Generating PDF...
        </>
      ) : (
        <>
          <DownloadIcon /> Download as PDF
        </>
      )}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M10 3a1 1 0 0 1 1 1v7.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42L9 11.59V4a1 1 0 0 1 1-1Z" />
      <path d="M4 14a1 1 0 0 1 1 1v1h10v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />
    </svg>
  );
}
