import { describe, it, expect } from "vitest";
import {
  defaultFormData,
  ndaFilename,
  renderNda,
  type NdaFormData,
} from "../app/nda-template";

const base = (overrides: Partial<NdaFormData> = {}): NdaFormData => ({
  ...defaultFormData,
  ...overrides,
});

describe("renderNda — structure", () => {
  it("includes the top-level agreement title", () => {
    expect(renderNda(base())).toContain("# Mutual Non-Disclosure Agreement");
  });

  it("includes Cover Page and Standard Terms sections", () => {
    const out = renderNda(base());
    expect(out).toContain("## Cover Page");
    expect(out).toContain("## Standard Terms");
  });

  it("includes all 11 numbered standard-terms clauses", () => {
    const out = renderNda(base());
    for (let i = 1; i <= 11; i++) {
      expect(out).toMatch(new RegExp(`${i}\\. \\*\\*`));
    }
  });

  it("includes signature table with both parties as column headers", () => {
    const out = renderNda(
      base({ party1Name: "Acme", party2Name: "Widgets" }),
    );
    expect(out).toMatch(/\|\s*Acme\s*\|\s*Widgets\s*\|/);
    expect(out).toContain("| Signature |");
    expect(out).toContain("| Print Name |");
    expect(out).toContain("| Date |");
  });

  it("includes the CC BY 4.0 attribution footer", () => {
    expect(renderNda(base())).toMatch(/CC BY 4\.0/);
  });

  it("fills signature table cells with per-party values", () => {
    const out = renderNda(
      base({
        party1Signature: {
          printName: "Jane Doe",
          title: "CEO",
          company: "Acme, Inc.",
          noticeAddress: "123 Main St",
          signedDate: "2026-05-01",
        },
        party2Signature: {
          printName: "John Roe",
          title: "CTO",
          company: "Widgets LLC",
          noticeAddress: "456 Oak Ave",
          signedDate: "2026-05-02",
        },
      }),
    );
    expect(out).toContain("| Print Name | Jane Doe | John Roe |");
    expect(out).toContain("| Title | CEO | CTO |");
    expect(out).toContain("| Company | Acme, Inc. | Widgets LLC |");
    expect(out).toContain("| Notice Address | 123 Main St | 456 Oak Ave |");
    expect(out).toContain("| Date | May 1, 2026 | May 2, 2026 |");
    // Signature row stays blank for ink.
    expect(out).toContain("| Signature |  |  |");
  });

  it("leaves signature cells blank when fields are empty", () => {
    const out = renderNda(base());
    expect(out).toContain("| Print Name |  |  |");
    expect(out).toContain("| Date |  |  |");
  });
});

describe("renderNda — placeholders for missing values", () => {
  it("shows [Party 1] and [Party 2] when party names are empty", () => {
    const out = renderNda(base({ party1Name: "", party2Name: "" }));
    expect(out).toContain("[Party 1]");
    expect(out).toContain("[Party 2]");
  });

  it("shows [Governing Law State] when state is empty", () => {
    const out = renderNda(base({ governingLawState: "" }));
    expect(out).toContain("[Governing Law State]");
  });

  it("shows [Jurisdiction] when jurisdiction is empty", () => {
    const out = renderNda(base({ jurisdiction: "" }));
    expect(out).toContain("[Jurisdiction]");
  });

  it("shows [Purpose] when purpose is blank (even whitespace)", () => {
    const out = renderNda(base({ purpose: "   " }));
    expect(out).toContain("[Purpose]");
  });

  it("shows [Effective Date] when effectiveDate is empty", () => {
    const out = renderNda(base({ effectiveDate: "" }));
    expect(out).toContain("[Effective Date]");
  });

  it("defaults modifications to 'None.' when blank", () => {
    const out = renderNda(base({ modifications: "" }));
    expect(out).toMatch(/MNDA Modifications.*None\./);
  });

  it("trims party names before substitution", () => {
    const out = renderNda(base({ party1Name: "  Acme  " }));
    expect(out).toContain("between **Acme**");
    expect(out).not.toContain("  Acme  ");
  });
});

describe("renderNda — MNDA term mode", () => {
  it("renders 'Expires N years from the Effective Date' for expires mode", () => {
    const out = renderNda(base({ mndaTermMode: "expires", mndaTermYears: 3 }));
    expect(out).toContain("Expires 3 years from the Effective Date.");
  });

  it("uses singular 'year' when term is 1", () => {
    const out = renderNda(base({ mndaTermMode: "expires", mndaTermYears: 1 }));
    expect(out).toContain("Expires 1 year from the Effective Date.");
  });

  it("uses plural 'years' when term is > 1", () => {
    const out = renderNda(base({ mndaTermMode: "expires", mndaTermYears: 5 }));
    expect(out).toContain("Expires 5 years from the Effective Date.");
  });

  it("renders 'Continues until terminated' for perpetual mode", () => {
    const out = renderNda(base({ mndaTermMode: "perpetual" }));
    expect(out).toContain("Continues until terminated in accordance with the terms of the MNDA.");
    expect(out).not.toContain("Expires 1 year");
  });
});

describe("renderNda — confidentiality term mode", () => {
  it("renders year count for expires mode", () => {
    const out = renderNda(base({ confTermMode: "expires", confTermYears: 7 }));
    expect(out).toMatch(/Term of Confidentiality\.\*\*\s*7 years from the Effective Date/);
  });

  it("uses singular for 1 year", () => {
    const out = renderNda(base({ confTermMode: "expires", confTermYears: 1 }));
    expect(out).toMatch(/\*\*Term of Confidentiality\.\*\*\s*1 year from the Effective Date/);
  });

  it("renders 'In perpetuity.' for perpetual mode", () => {
    const out = renderNda(base({ confTermMode: "perpetual" }));
    expect(out).toMatch(/\*\*Term of Confidentiality\.\*\*\s*In perpetuity\./);
  });
});

describe("renderNda — governing law and jurisdiction", () => {
  it("injects state into both cover page and clause 9", () => {
    const out = renderNda(base({ governingLawState: "Delaware" }));
    expect(out).toContain("**Governing Law.** State of Delaware.");
    expect(out).toContain("laws of the State of Delaware");
  });

  it("injects jurisdiction into both cover page and clause 9", () => {
    const out = renderNda(base({ jurisdiction: "New Castle County, DE" }));
    expect(out).toContain("Courts located in New Castle County, DE.");
    expect(out).toContain("courts located in New Castle County, DE");
  });
});

describe("renderNda — effective date formatting", () => {
  it("formats an ISO date as a long US date", () => {
    const out = renderNda(base({ effectiveDate: "2026-04-14" }));
    expect(out).toContain("April 14, 2026");
  });

  it("does not mutate timezone — Jan 1 stays Jan 1", () => {
    const out = renderNda(base({ effectiveDate: "2026-01-01" }));
    expect(out).toContain("January 1, 2026");
  });
});

describe("ndaFilename", () => {
  it("slugs both parties and uses the given extension", () => {
    const fn = ndaFilename(
      base({ party1Name: "Acme, Inc.", party2Name: "Widgets LLC" }),
      "pdf",
    );
    expect(fn).toBe("Mutual-NDA-Acme-Inc-Widgets-LLC.pdf");
  });

  it("falls back to 'party' when a name is empty", () => {
    const fn = ndaFilename(base({ party1Name: "", party2Name: "" }), "pdf");
    expect(fn).toBe("Mutual-NDA-party-party.pdf");
  });

  it("collapses runs of non-alphanumeric chars into single hyphens and trims", () => {
    const fn = ndaFilename(
      base({ party1Name: "  --Foo!!!@@Bar--  ", party2Name: "Co." }),
      "md",
    );
    expect(fn).toBe("Mutual-NDA-Foo-Bar-Co.md");
  });

  it("supports md extension", () => {
    const fn = ndaFilename(
      base({ party1Name: "A", party2Name: "B" }),
      "md",
    );
    expect(fn).toBe("Mutual-NDA-A-B.md");
  });
});
