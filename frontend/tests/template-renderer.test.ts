import { describe, it, expect } from "vitest";
import { substituteFields, extractFieldNames } from "../app/lib/template-renderer";

describe("substituteFields", () => {
  it("replaces a coverpage_link span with the field value", () => {
    const md = 'by <span class="coverpage_link">Customer</span>';
    expect(substituteFields(md, { Customer: "Acme Inc" })).toBe("by **Acme Inc**");
  });

  it("shows a placeholder when the field is missing", () => {
    const md = '<span class="keyterms_link">Provider</span>';
    expect(substituteFields(md, {})).toBe("**[Provider]**");
  });

  it("handles orderform_link spans", () => {
    const md = '<span class="orderform_link">Subscription Period</span>';
    expect(substituteFields(md, { "Subscription Period": "12 months" })).toBe(
      "**12 months**",
    );
  });

  it("handles businessterms_link spans", () => {
    const md = '<span class="businessterms_link">Fee</span>';
    expect(substituteFields(md, {})).toBe("**[Fee]**");
  });

  it("handles sow_link spans", () => {
    const md = '<span class="sow_link">Deliverable</span>';
    expect(substituteFields(md, { Deliverable: "Design mockup" })).toBe(
      "**Design mockup**",
    );
  });

  it("handles possessives — strips 's for lookup then re-adds it", () => {
    const md = `<span class="coverpage_link">Customer's</span> data`;
    expect(substituteFields(md, { Customer: "Acme" })).toBe("**Acme's** data");
  });

  it("shows placeholder with possessive when field is missing", () => {
    const md = `<span class="coverpage_link">Provider's</span> service`;
    expect(substituteFields(md, {})).toBe("**[Provider]'s** service");
  });

  it("replaces multiple spans in one string", () => {
    const md =
      '<span class="coverpage_link">Customer</span> and <span class="coverpage_link">Provider</span>';
    expect(substituteFields(md, { Customer: "Acme", Provider: "TechCo" })).toBe(
      "**Acme** and **TechCo**",
    );
  });

  it("leaves non-link spans untouched", () => {
    const md = '<span class="header_2">Service</span>';
    expect(substituteFields(md, {})).toBe('<span class="header_2">Service</span>');
  });
});

describe("extractFieldNames", () => {
  it("extracts unique field names from all link span types", () => {
    const md = `
      <span class="coverpage_link">Customer</span>
      <span class="keyterms_link">Provider</span>
      <span class="coverpage_link">Customer</span>
    `;
    expect(extractFieldNames(md)).toEqual(["Customer", "Provider"]);
  });

  it("strips possessives before deduplication", () => {
    const md = `
      <span class="coverpage_link">Customer</span>
      <span class="coverpage_link">Customer's</span>
    `;
    expect(extractFieldNames(md)).toEqual(["Customer"]);
  });

  it("returns an empty array when there are no link spans", () => {
    expect(extractFieldNames("# Heading\n\nSome text.")).toEqual([]);
  });

  it("returns results sorted alphabetically", () => {
    const md =
      '<span class="coverpage_link">Provider</span> <span class="coverpage_link">Customer</span>';
    expect(extractFieldNames(md)).toEqual(["Customer", "Provider"]);
  });
});
