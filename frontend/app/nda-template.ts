export type NdaTermMode = "expires" | "perpetual";

export type NdaSignature = {
  printName: string;
  title: string;
  company: string;
  noticeAddress: string;
  signedDate: string;
};

export type NdaFormData = {
  party1Name: string;
  party2Name: string;
  purpose: string;
  effectiveDate: string;
  mndaTermMode: NdaTermMode;
  mndaTermYears: number;
  confTermMode: NdaTermMode;
  confTermYears: number;
  governingLawState: string;
  jurisdiction: string;
  modifications: string;
  party1Signature: NdaSignature;
  party2Signature: NdaSignature;
};

const emptySignature = (): NdaSignature => ({
  printName: "",
  title: "",
  company: "",
  noticeAddress: "",
  signedDate: "",
});

export const makeDefaultFormData = (): NdaFormData => ({
  party1Name: "",
  party2Name: "",
  purpose: "Evaluating whether to enter into a business relationship with the other party.",
  effectiveDate: new Date().toISOString().slice(0, 10),
  mndaTermMode: "expires",
  mndaTermYears: 1,
  confTermMode: "expires",
  confTermYears: 1,
  governingLawState: "",
  jurisdiction: "",
  modifications: "None.",
  party1Signature: emptySignature(),
  party2Signature: emptySignature(),
});

export const defaultFormData: NdaFormData = makeDefaultFormData();

export const formatDate = (iso: string) => {
  if (!iso) return "[Effective Date]";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

export const years = (n: number) => `${n} year${n === 1 ? "" : "s"}`;

export type NdaDerived = {
  p1: string;
  p2: string;
  law: string;
  jur: string;
  purpose: string;
  effective: string;
  mndaTerm: string;
  confTerm: string;
  modifications: string;
};

export function deriveNdaFields(data: NdaFormData): NdaDerived {
  return {
    p1: data.party1Name.trim() || "[Party 1]",
    p2: data.party2Name.trim() || "[Party 2]",
    law: data.governingLawState.trim() || "[Governing Law State]",
    jur: data.jurisdiction.trim() || "[Jurisdiction]",
    purpose: data.purpose.trim() || "[Purpose]",
    effective: formatDate(data.effectiveDate),
    mndaTerm:
      data.mndaTermMode === "expires"
        ? `Expires ${years(data.mndaTermYears)} from the Effective Date.`
        : "Continues until terminated in accordance with the terms of the MNDA.",
    confTerm:
      data.confTermMode === "expires"
        ? `${years(data.confTermYears)} from the Effective Date, but in the case of trade secrets until the Confidential Information is no longer considered a trade secret under applicable laws.`
        : "In perpetuity.",
    modifications: data.modifications.trim() || "None.",
  };
}

export type NdaClause = { title: string; body: (d: NdaDerived) => string };

export type SignatureRow = {
  label: string;
  value: (s: NdaSignature) => string;
};

export const SIGNATURE_ROWS: SignatureRow[] = [
  { label: "Signature", value: () => "" },
  { label: "Print Name", value: (s) => s.printName.trim() },
  { label: "Title", value: (s) => s.title.trim() },
  { label: "Company", value: (s) => s.company.trim() },
  { label: "Notice Address", value: (s) => s.noticeAddress.trim() },
  { label: "Date", value: (s) => (s.signedDate ? formatDate(s.signedDate) : "") },
];

export const STANDARD_CLAUSES: NdaClause[] = [
  {
    title: "Introduction.",
    body: () =>
      `This MNDA (which incorporates these Standard Terms and the Cover Page) allows each party ("Disclosing Party") to disclose or make available information in connection with the Purpose which (1) the Disclosing Party identifies to the receiving party ("Receiving Party") as "confidential", "proprietary", or the like, or (2) should be reasonably understood as confidential or proprietary due to its nature and the circumstances of its disclosure ("Confidential Information"). Each party's Confidential Information also includes the existence and status of the parties' discussions and information on the Cover Page.`,
  },
  {
    title: "Use and Protection of Confidential Information.",
    body: () =>
      `The Receiving Party shall: (a) use Confidential Information solely for the Purpose; (b) not disclose Confidential Information to third parties without the Disclosing Party's prior written approval, except that the Receiving Party may disclose Confidential Information to its employees, agents, advisors, contractors, and other representatives having a reasonable need to know for the Purpose, provided those representatives are bound by confidentiality obligations no less protective of the Disclosing Party than the applicable terms in this MNDA and the Receiving Party remains responsible for their compliance with this MNDA; and (c) protect Confidential Information using at least the same protections the Receiving Party uses for its own similar information, but no less than a reasonable standard of care.`,
  },
  {
    title: "Exceptions.",
    body: () =>
      `The Receiving Party's obligations in this MNDA do not apply to information that it can demonstrate: (a) is or becomes publicly available through no fault of the Receiving Party; (b) it rightfully knew or possessed prior to receipt from the Disclosing Party without confidentiality restrictions; (c) it rightfully obtained from a third party without confidentiality restrictions; or (d) it independently developed without using or referencing the Confidential Information.`,
  },
  {
    title: "Disclosures Required by Law.",
    body: () =>
      `The Receiving Party may disclose Confidential Information to the extent required by law, regulation, regulatory authority, subpoena, or court order, provided (to the extent legally permitted) it provides the Disclosing Party reasonable advance notice of the required disclosure and reasonably cooperates, at the Disclosing Party's expense, with the Disclosing Party's efforts to obtain confidential treatment for the Confidential Information.`,
  },
  {
    title: "Term and Termination.",
    body: () =>
      `This MNDA commences on the Effective Date and expires at the end of the MNDA Term. Either party may terminate this MNDA for any or no reason upon written notice to the other party. The Receiving Party's obligations relating to Confidential Information will survive for the Term of Confidentiality, despite any expiration or termination of this MNDA.`,
  },
  {
    title: "Return or Destruction of Confidential Information.",
    body: () =>
      `Upon expiration or termination of this MNDA, or upon the Disclosing Party's earlier request, the Receiving Party will: (a) cease using Confidential Information; (b) promptly after the Disclosing Party's written request, destroy all Confidential Information in the Receiving Party's possession or control or return it to the Disclosing Party; and (c) if requested by the Disclosing Party, confirm its compliance with these obligations in writing. As an exception to subsection (b), the Receiving Party may retain Confidential Information in accordance with its standard backup or record retention policies or as required by law, but the terms of this MNDA will continue to apply to the retained Confidential Information.`,
  },
  {
    title: "Proprietary Rights.",
    body: () =>
      `The Disclosing Party retains all of its intellectual property and other rights in its Confidential Information, and its disclosure to the Receiving Party grants no license under such rights.`,
  },
  {
    title: "Disclaimer.",
    body: () =>
      `ALL CONFIDENTIAL INFORMATION IS PROVIDED "AS IS", WITH ALL FAULTS, AND WITHOUT WARRANTIES, INCLUDING THE IMPLIED WARRANTIES OF TITLE, MERCHANTABILITY, AND FITNESS FOR A PARTICULAR PURPOSE.`,
  },
  {
    title: "Governing Law and Jurisdiction.",
    body: (d) =>
      `This MNDA and all matters relating hereto are governed by, and construed in accordance with, the laws of the State of ${d.law}, without regard to the conflict of laws provisions of such state. Any legal suit, action, or proceeding relating to this MNDA must be instituted in the federal or state courts located in ${d.jur}. Each party irrevocably submits to the exclusive jurisdiction of such courts in any such suit, action, or proceeding.`,
  },
  {
    title: "Equitable Relief.",
    body: () =>
      `A breach of this MNDA may cause irreparable harm for which monetary damages are an insufficient remedy. Upon a breach of this MNDA, the Disclosing Party is entitled to seek appropriate equitable relief, including an injunction, in addition to its other remedies.`,
  },
  {
    title: "General.",
    body: () =>
      `Neither party has an obligation under this MNDA to disclose Confidential Information to the other or proceed with any proposed transaction. Neither party may assign this MNDA without the prior written consent of the other party, except that either party may assign this MNDA in connection with a merger, reorganization, acquisition, or other transfer of all or substantially all its assets or voting securities. Any assignment in violation of this Section is null and void. This MNDA will bind and inure to the benefit of each party's permitted successors and assigns. Waivers must be signed by the waiving party's authorized representative and cannot be implied from conduct. If any provision of this MNDA is held unenforceable, it will be limited to the minimum extent necessary so the rest of this MNDA remains in effect. This MNDA (including the Cover Page) constitutes the entire agreement of the parties with respect to its subject matter and supersedes all prior and contemporaneous understandings, agreements, representations, and warranties, whether written or oral, regarding such subject matter. This MNDA may only be amended, modified, waived, or supplemented by an agreement in writing signed by both parties. Notices, requests, and approvals under this MNDA must be sent in writing to the email or postal addresses on the Cover Page and are deemed delivered on receipt. This MNDA may be executed in counterparts, including electronic copies, each of which is deemed an original and which together form the same agreement.`,
  },
];

export function ndaFilename(data: NdaFormData, ext: "pdf" | "md"): string {
  const slug = (s: string) =>
    s.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "party";
  return `Mutual-NDA-${slug(data.party1Name)}-${slug(data.party2Name)}.${ext}`;
}

export function renderNda(data: NdaFormData): string {
  const derived = deriveNdaFields(data);
  const { p1, p2, law, jur, purpose, effective, mndaTerm, confTerm, modifications } = derived;
  const signatureRows = SIGNATURE_ROWS.map(
    (row) => `| ${row.label} | ${row.value(data.party1Signature)} | ${row.value(data.party2Signature)} |`,
  ).join("\n");
  const clauses = STANDARD_CLAUSES.map((c, i) => `${i + 1}. **${c.title}** ${c.body(derived)}`).join("\n\n");

  return `# Mutual Non-Disclosure Agreement

This Mutual Non-Disclosure Agreement (the "**MNDA**") is entered into between **${p1}** and **${p2}** (each a "Party") and consists of this Cover Page and the Common Paper Mutual NDA Standard Terms Version 1.0 ("**Standard Terms**"), identical to those posted at https://commonpaper.com/standards/mutual-nda/1.0.

## Cover Page

**Purpose.** ${purpose}

**Effective Date.** ${effective}

**MNDA Term.** ${mndaTerm}

**Term of Confidentiality.** ${confTerm}

**Governing Law.** State of ${law}.

**Jurisdiction.** Courts located in ${jur}.

**MNDA Modifications.** ${modifications}

By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.

|  | ${p1} | ${p2} |
| :--- | :--- | :--- |
${signatureRows}

---

## Standard Terms

${clauses}

_Based on the Common Paper Mutual Non-Disclosure Agreement (Version 1.0), free to use under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)._
`;
}
