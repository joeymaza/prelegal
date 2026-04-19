"use client";

import type { NdaFormData, NdaSignature } from "./nda-template";

const inputCls =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-400";
const labelCls = "block text-xs font-medium uppercase tracking-wide text-slate-600";
const fieldsetCls = "rounded-lg border border-slate-200 bg-slate-50/60 p-3";
const legendCls = "px-1 text-xs font-medium uppercase tracking-wide text-slate-600";

type SignaturePanelProps = {
  data: NdaFormData;
  onUpdate: <K extends keyof NdaFormData>(key: K, value: NdaFormData[K]) => void;
};

export function SignaturePanel({ data, onUpdate }: SignaturePanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2 border-b border-slate-200 pb-1">
        <h3 className="text-sm font-semibold text-slate-900">Signatures</h3>
        <span className="text-xs text-slate-500">Optional — fill in what you know</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SignatureFields
          prefix="p1sig"
          partyLabel={data.party1Name.trim() || "Party 1"}
          value={data.party1Signature}
          onChange={(next) => onUpdate("party1Signature", next)}
        />
        <SignatureFields
          prefix="p2sig"
          partyLabel={data.party2Name.trim() || "Party 2"}
          value={data.party2Signature}
          onChange={(next) => onUpdate("party2Signature", next)}
        />
      </div>
    </div>
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

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelCls} htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}
