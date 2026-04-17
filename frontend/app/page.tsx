"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  makeDefaultFormData,
  NdaFormData,
  NdaSignature,
  ndaFilename,
} from "./nda-template";
import { NdaPreview } from "./nda-preview";

const inputCls =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-400";
const labelCls = "block text-xs font-medium uppercase tracking-wide text-slate-600";
const fieldsetCls = "rounded-lg border border-slate-200 bg-slate-50/60 p-3";
const legendCls = "px-1 text-xs font-medium uppercase tracking-wide text-slate-600";

type FieldErrors = Partial<Record<keyof NdaFormData, string>>;

function validate(data: NdaFormData): FieldErrors {
  const errors: FieldErrors = {};
  if (!data.party1Name.trim()) errors.party1Name = "Required";
  if (!data.party2Name.trim()) errors.party2Name = "Required";
  if (!data.governingLawState.trim()) errors.governingLawState = "Required";
  if (!data.jurisdiction.trim()) errors.jurisdiction = "Required";
  if (!data.effectiveDate) errors.effectiveDate = "Required";
  return errors;
}

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
  const [touched, setTouched] = useState(false);
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

  const errors = useMemo(() => validate(data), [data]);
  const errorCount = Object.keys(errors).length;

  const update = <K extends keyof NdaFormData>(key: K, value: NdaFormData[K]) => {
    setTouched(true);
    setData((d) => ({ ...d, [key]: value }));
  };

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

  const reset = () => {
    setData(makeDefaultFormData());
    setTouched(false);
  };

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

  const showError = (key: keyof NdaFormData) => touched && errors[key];

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
          Fill in the business terms, preview the agreement, and download a clean PDF. Based on the{" "}
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
        {/* Form panel */}
        <form
          className="paper space-y-5 rounded-xl p-5"
          onSubmit={(e) => e.preventDefault()}
          aria-label="NDA form"
        >
          <SectionHeading index={1} title="Parties" hint="Who is signing this NDA?" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="p1"
              label="Party 1"
              error={showError("party1Name") ? errors.party1Name : undefined}
            >
              <input
                id="p1"
                className={inputCls}
                value={data.party1Name}
                onChange={(e) => update("party1Name", e.target.value)}
                placeholder="Acme, Inc."
              />
            </Field>
            <Field
              id="p2"
              label="Party 2"
              error={showError("party2Name") ? errors.party2Name : undefined}
            >
              <input
                id="p2"
                className={inputCls}
                value={data.party2Name}
                onChange={(e) => update("party2Name", e.target.value)}
                placeholder="Widgets LLC"
              />
            </Field>
          </div>

          <SectionHeading index={2} title="Purpose & Date" />
          <Field id="purpose" label="Purpose">
            <textarea
              id="purpose"
              rows={2}
              className={inputCls}
              value={data.purpose}
              onChange={(e) => update("purpose", e.target.value)}
            />
          </Field>
          <Field
            id="effective"
            label="Effective Date"
            error={showError("effectiveDate") ? errors.effectiveDate : undefined}
          >
            <input
              id="effective"
              type="date"
              className={inputCls}
              value={data.effectiveDate}
              onChange={(e) => update("effectiveDate", e.target.value)}
            />
          </Field>

          <SectionHeading index={3} title="Terms" />
          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>MNDA Term</legend>
            <div className="mt-1 space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="mnda"
                  className="accent-indigo-600"
                  checked={data.mndaTermMode === "expires"}
                  onChange={() => update("mndaTermMode", "expires")}
                />
                <span>Expires</span>
                <input
                  type="number"
                  min={1}
                  className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
                  disabled={data.mndaTermMode !== "expires"}
                  value={data.mndaTermYears}
                  onChange={(e) => update("mndaTermYears", Math.max(1, Number(e.target.value) || 1))}
                  aria-label="MNDA term in years"
                />
                <span>year(s) from Effective Date</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="mnda"
                  className="accent-indigo-600"
                  checked={data.mndaTermMode === "perpetual"}
                  onChange={() => update("mndaTermMode", "perpetual")}
                />
                Continues until terminated
              </label>
            </div>
          </fieldset>

          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>Term of Confidentiality</legend>
            <div className="mt-1 space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="conf"
                  className="accent-indigo-600"
                  checked={data.confTermMode === "expires"}
                  onChange={() => update("confTermMode", "expires")}
                  aria-label="Expires"
                />
                <input
                  type="number"
                  min={1}
                  className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
                  disabled={data.confTermMode !== "expires"}
                  value={data.confTermYears}
                  onChange={(e) => update("confTermYears", Math.max(1, Number(e.target.value) || 1))}
                  aria-label="Confidentiality term in years"
                />
                <span>year(s) from Effective Date</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="conf"
                  className="accent-indigo-600"
                  checked={data.confTermMode === "perpetual"}
                  onChange={() => update("confTermMode", "perpetual")}
                />
                In perpetuity
              </label>
            </div>
          </fieldset>

          <SectionHeading index={4} title="Governing Law" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="law"
              label="Governing Law (State)"
              error={showError("governingLawState") ? errors.governingLawState : undefined}
            >
              <input
                id="law"
                className={inputCls}
                value={data.governingLawState}
                onChange={(e) => update("governingLawState", e.target.value)}
                placeholder="Delaware"
              />
            </Field>
            <Field
              id="jur"
              label="Jurisdiction"
              error={showError("jurisdiction") ? errors.jurisdiction : undefined}
            >
              <input
                id="jur"
                className={inputCls}
                value={data.jurisdiction}
                onChange={(e) => update("jurisdiction", e.target.value)}
                placeholder="New Castle County, DE"
              />
            </Field>
          </div>

          <Field id="mods" label="MNDA Modifications">
            <textarea
              id="mods"
              rows={2}
              className={inputCls}
              value={data.modifications}
              onChange={(e) => update("modifications", e.target.value)}
            />
          </Field>

          <SectionHeading index={5} title="Signatures" hint="Optional — fill in what you know" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SignatureFields
              prefix="p1sig"
              partyLabel={data.party1Name.trim() || "Party 1"}
              value={data.party1Signature}
              onChange={(next) => update("party1Signature", next)}
            />
            <SignatureFields
              prefix="p2sig"
              partyLabel={data.party2Name.trim() || "Party 2"}
              value={data.party2Signature}
              onChange={(next) => update("party2Signature", next)}
            />
          </div>

          {/* Desktop action row */}
          <div className="hidden items-center gap-3 border-t border-slate-200 pt-4 lg:flex">
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
            Tip: press <kbd className="rounded border border-slate-300 bg-slate-50 px-1 py-0.5 text-[10px]">⌘/Ctrl</kbd> +{" "}
            <kbd className="rounded border border-slate-300 bg-slate-50 px-1 py-0.5 text-[10px]">Enter</kbd> to download.
          </p>
        </form>

        {/* Preview panel */}
        <section
          className="paper rounded-xl p-6"
          aria-label="NDA preview"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">Preview</h2>
            {touched && errorCount > 0 ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                {errorCount} field{errorCount === 1 ? "" : "s"} pending
              </span>
            ) : (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                Ready
              </span>
            )}
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

function SectionHeading({ index, title, hint }: { index: number; title: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-slate-200 pb-1">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
        {index}
      </span>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </div>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelCls} htmlFor={id}>
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-amber-700">{error}</p>}
    </div>
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
          <Spinner /> Generating PDF…
        </>
      ) : (
        <>
          <DownloadIcon /> Download as PDF
        </>
      )}
    </button>
  );
}

function SignatureFields({
  prefix,
  partyLabel,
  value,
  onChange,
}: {
  prefix: string;
  partyLabel: string;
  value: NdaSignature;
  onChange: (next: NdaSignature) => void;
}) {
  const set = <K extends keyof NdaSignature>(key: K, v: NdaSignature[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <fieldset className={fieldsetCls}>
      <legend className={legendCls}>{partyLabel}</legend>
      <div className="mt-1 space-y-3">
        <Field id={`${prefix}-name`} label="Print Name">
          <input
            id={`${prefix}-name`}
            className={inputCls}
            value={value.printName}
            onChange={(e) => set("printName", e.target.value)}
            placeholder="Jane Doe"
          />
        </Field>
        <Field id={`${prefix}-title`} label="Title">
          <input
            id={`${prefix}-title`}
            className={inputCls}
            value={value.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="CEO"
          />
        </Field>
        <Field id={`${prefix}-company`} label="Company">
          <input
            id={`${prefix}-company`}
            className={inputCls}
            value={value.company}
            onChange={(e) => set("company", e.target.value)}
            placeholder="Acme, Inc."
          />
        </Field>
        <Field id={`${prefix}-addr`} label="Notice Address">
          <textarea
            id={`${prefix}-addr`}
            rows={2}
            className={inputCls}
            value={value.noticeAddress}
            onChange={(e) => set("noticeAddress", e.target.value)}
            placeholder="123 Main St, Wilmington, DE 19801"
          />
        </Field>
        <Field id={`${prefix}-date`} label="Date Signed">
          <input
            id={`${prefix}-date`}
            type="date"
            className={inputCls}
            value={value.signedDate}
            onChange={(e) => set("signedDate", e.target.value)}
          />
        </Field>
      </div>
    </fieldset>
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
