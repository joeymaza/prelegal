"use client";

import type { Signature } from "../lib/doc-types";

const inputCls =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 placeholder:text-slate-400";
const labelCls = "block text-xs font-medium uppercase tracking-wide text-slate-600";

type SignatureBlockProps = {
  party1Label: string;
  party2Label: string;
  party1Signature: Signature;
  party2Signature: Signature;
  onUpdate: (party: "party1" | "party2", sig: Signature) => void;
};

export function SignatureBlock({
  party1Label,
  party2Label,
  party1Signature,
  party2Signature,
  onUpdate,
}: SignatureBlockProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2 border-b border-slate-200 pb-1">
        <h3 className="text-sm font-semibold text-slate-900">Signatures</h3>
        <span className="text-xs text-slate-500">Optional</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SignatureFields
          prefix="p1"
          label={party1Label}
          value={party1Signature}
          onChange={(sig) => onUpdate("party1", sig)}
        />
        <SignatureFields
          prefix="p2"
          label={party2Label}
          value={party2Signature}
          onChange={(sig) => onUpdate("party2", sig)}
        />
      </div>
    </div>
  );
}

function SignatureFields({
  prefix,
  label,
  value,
  onChange,
}: {
  prefix: string;
  label: string;
  value: Signature;
  onChange: (sig: Signature) => void;
}) {
  const set = <K extends keyof Signature>(key: K, v: Signature[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <fieldset className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <legend className="px-1 text-xs font-medium uppercase tracking-wide text-slate-600">
        {label}
      </legend>
      <div className="mt-1 space-y-2">
        <div>
          <label className={labelCls} htmlFor={`${prefix}-name`}>
            Print Name
          </label>
          <input
            id={`${prefix}-name`}
            className={inputCls}
            value={value.printName}
            onChange={(e) => set("printName", e.target.value)}
            placeholder="Jane Doe"
          />
        </div>
        <div>
          <label className={labelCls} htmlFor={`${prefix}-title`}>
            Title
          </label>
          <input
            id={`${prefix}-title`}
            className={inputCls}
            value={value.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="CEO"
          />
        </div>
        <div>
          <label className={labelCls} htmlFor={`${prefix}-company`}>
            Company
          </label>
          <input
            id={`${prefix}-company`}
            className={inputCls}
            value={value.company}
            onChange={(e) => set("company", e.target.value)}
            placeholder="Acme, Inc."
          />
        </div>
        <div>
          <label className={labelCls} htmlFor={`${prefix}-addr`}>
            Notice Address
          </label>
          <textarea
            id={`${prefix}-addr`}
            rows={2}
            className={inputCls}
            value={value.noticeAddress}
            onChange={(e) => set("noticeAddress", e.target.value)}
            placeholder="123 Main St, Wilmington, DE 19801"
          />
        </div>
        <div>
          <label className={labelCls} htmlFor={`${prefix}-date`}>
            Date Signed
          </label>
          <input
            id={`${prefix}-date`}
            type="date"
            className={inputCls}
            value={value.signedDate}
            onChange={(e) => set("signedDate", e.target.value)}
          />
        </div>
      </div>
    </fieldset>
  );
}
