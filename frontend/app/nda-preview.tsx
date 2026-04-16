import { deriveNdaFields, SIGNATURE_ROWS, STANDARD_CLAUSES, type NdaFormData } from "./nda-template";

export function NdaPreview({ data }: { data: NdaFormData }) {
  const derived = deriveNdaFields(data);
  const { p1, p2, law, jur, purpose, effective, mndaTerm, confTerm, modifications } = derived;

  return (
    <article
      data-testid="nda-preview"
      className="prose-nda space-y-5 text-[13px] leading-relaxed text-slate-800"
    >
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-center font-serif text-xl font-semibold tracking-tight text-slate-900">
          Mutual Non-Disclosure Agreement
        </h1>
        <p className="mt-3 text-slate-700">
          This Mutual Non-Disclosure Agreement (the &ldquo;<b>MNDA</b>&rdquo;) is entered into between{" "}
          <b className="text-slate-900">{p1}</b> and <b className="text-slate-900">{p2}</b> (each a &ldquo;Party&rdquo;) and
          consists of this Cover Page and the Common Paper Mutual NDA Standard Terms Version 1.0 (&ldquo;<b>Standard Terms</b>
          &rdquo;), identical to those posted at{" "}
          <span className="break-all text-slate-600">https://commonpaper.com/standards/mutual-nda/1.0</span>.
        </p>
      </header>

      <section>
        <h2 className="font-serif text-base font-semibold text-slate-900">Cover Page</h2>
        <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2">
          <Field label="Purpose">{purpose}</Field>
          <Field label="Effective Date">{effective}</Field>
          <Field label="MNDA Term">{mndaTerm}</Field>
          <Field label="Term of Confidentiality">{confTerm}</Field>
          <Field label="Governing Law">State of {law}.</Field>
          <Field label="Jurisdiction">Courts located in {jur}.</Field>
          <Field label="MNDA Modifications">{modifications}</Field>
        </dl>

        <p className="mt-4 text-slate-700">
          By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.
        </p>

        <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
          <table className="w-full border-collapse text-left text-[12px]">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="w-40 border-b border-r border-slate-200 px-3 py-2 font-medium"></th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-medium">{p1}</th>
                <th className="border-b border-slate-200 px-3 py-2 font-medium">{p2}</th>
              </tr>
            </thead>
            <tbody>
              {SIGNATURE_ROWS.map((row, i) => {
                const last = i === SIGNATURE_ROWS.length - 1;
                const v1 = row.value(data.party1Signature);
                const v2 = row.value(data.party2Signature);
                const borderB = last ? "" : "border-b border-slate-200";
                return (
                  <tr key={row.label}>
                    <td className={`border-r border-slate-200 px-3 py-2 text-slate-600 ${borderB}`}>{row.label}</td>
                    <td className={`border-r border-slate-200 px-3 py-2 ${borderB}`}>{v1 || "\u00A0"}</td>
                    <td className={`px-3 py-2 ${borderB}`}>{v2 || "\u00A0"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <hr className="border-slate-200" />

      <section>
        <h2 className="font-serif text-base font-semibold text-slate-900">Standard Terms</h2>
        <ol className="mt-3 space-y-3">
          {STANDARD_CLAUSES.map((c, i) => (
            <li key={c.title} className="text-justify text-slate-700">
              <span className="text-slate-500">{i + 1}.</span>{" "}
              <b className="text-slate-900">{c.title}</b> {c.body(derived)}
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-slate-200 pt-3 text-center text-[11px] italic text-slate-500">
        Based on the Common Paper Mutual Non-Disclosure Agreement (Version 1.0), free to use under{" "}
        <a
          className="underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC BY 4.0
        </a>
        .
      </footer>
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="font-medium text-slate-900">{label}.</dt>
      <dd className="text-slate-700">{children}</dd>
    </>
  );
}
