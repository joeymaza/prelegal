"use client";

import { useMemo, useState } from "react";
import { defaultFormData, NdaFormData, renderNda } from "./nda-template";

const inputCls =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const labelCls = "block text-sm font-medium text-slate-700";

export default function Home() {
  const [data, setData] = useState<NdaFormData>(defaultFormData);
  const rendered = useMemo(() => renderNda(data), [data]);

  const update = <K extends keyof NdaFormData>(key: K, value: NdaFormData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const { buildNdaPdfBlob } = await import("./nda-pdf");
      const blob = await buildNdaPdfBlob(data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safe = (s: string) => s.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "party";
      a.href = url;
      a.download = `Mutual-NDA-${safe(data.party1Name)}-${safe(data.party2Name)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Mutual NDA Creator</h1>
        <p className="text-sm text-slate-600">
          Fill in the business terms, preview the agreement, and download it as Markdown. Based on the Common Paper Mutual NDA
          (v1.0).
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="p1">Party 1</label>
              <input id="p1" className={inputCls} value={data.party1Name} onChange={(e) => update("party1Name", e.target.value)} placeholder="Acme, Inc." />
            </div>
            <div>
              <label className={labelCls} htmlFor="p2">Party 2</label>
              <input id="p2" className={inputCls} value={data.party2Name} onChange={(e) => update("party2Name", e.target.value)} placeholder="Widgets LLC" />
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="purpose">Purpose</label>
            <textarea id="purpose" rows={2} className={inputCls} value={data.purpose} onChange={(e) => update("purpose", e.target.value)} />
          </div>

          <div>
            <label className={labelCls} htmlFor="effective">Effective Date</label>
            <input id="effective" type="date" className={inputCls} value={data.effectiveDate} onChange={(e) => update("effectiveDate", e.target.value)} />
          </div>

          <fieldset className="rounded-md border border-slate-200 p-3">
            <legend className="px-1 text-sm font-medium text-slate-700">MNDA Term</legend>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="mnda" checked={data.mndaTermMode === "expires"} onChange={() => update("mndaTermMode", "expires")} />
                Expires
                <input
                  type="number"
                  min={1}
                  className="w-20 rounded border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
                  disabled={data.mndaTermMode !== "expires"}
                  value={data.mndaTermYears}
                  onChange={(e) => update("mndaTermYears", Math.max(1, Number(e.target.value) || 1))}
                />
                year(s) from Effective Date
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="mnda" checked={data.mndaTermMode === "perpetual"} onChange={() => update("mndaTermMode", "perpetual")} />
                Continues until terminated
              </label>
            </div>
          </fieldset>

          <fieldset className="rounded-md border border-slate-200 p-3">
            <legend className="px-1 text-sm font-medium text-slate-700">Term of Confidentiality</legend>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="conf" checked={data.confTermMode === "expires"} onChange={() => update("confTermMode", "expires")} />
                <input
                  type="number"
                  min={1}
                  className="w-20 rounded border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
                  disabled={data.confTermMode !== "expires"}
                  value={data.confTermYears}
                  onChange={(e) => update("confTermYears", Math.max(1, Number(e.target.value) || 1))}
                />
                year(s) from Effective Date
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="conf" checked={data.confTermMode === "perpetual"} onChange={() => update("confTermMode", "perpetual")} />
                In perpetuity
              </label>
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="law">Governing Law (State)</label>
              <input id="law" className={inputCls} value={data.governingLawState} onChange={(e) => update("governingLawState", e.target.value)} placeholder="Delaware" />
            </div>
            <div>
              <label className={labelCls} htmlFor="jur">Jurisdiction</label>
              <input id="jur" className={inputCls} value={data.jurisdiction} onChange={(e) => update("jurisdiction", e.target.value)} placeholder="New Castle County, DE" />
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="mods">MNDA Modifications</label>
            <textarea id="mods" rows={2} className={inputCls} value={data.modifications} onChange={(e) => update("modifications", e.target.value)} />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={download}
              disabled={downloading}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {downloading ? "Generating PDF…" : "Download as PDF"}
            </button>
            <button
              type="button"
              onClick={() => setData(defaultFormData)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Reset
            </button>
          </div>
        </form>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">Preview</h2>
          <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-800">
            {rendered}
          </pre>
        </section>
      </div>
    </main>
  );
}
