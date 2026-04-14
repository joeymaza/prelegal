import { describe, it, expect } from "vitest";
import { buildNdaPdfBlob } from "../app/nda-pdf";
import { defaultFormData, type NdaFormData } from "../app/nda-template";

const withName = (overrides: Partial<NdaFormData> = {}): NdaFormData => ({
  ...defaultFormData,
  party1Name: "Acme",
  party2Name: "Widgets",
  governingLawState: "Delaware",
  jurisdiction: "New Castle County, DE",
  ...overrides,
});

// @react-pdf/renderer's Blob polyfill in jsdom does not implement arrayBuffer().
// Fall back to FileReader for portability.
async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(new Uint8Array(fr.result as ArrayBuffer));
    fr.onerror = () => reject(fr.error);
    fr.readAsArrayBuffer(blob as Blob);
  });
}

describe("buildNdaPdfBlob", () => {
  it("returns a Blob of type application/pdf", async () => {
    const blob = await buildNdaPdfBlob(withName());
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
  });

  it("produces bytes with a valid %PDF- header", async () => {
    const blob = await buildNdaPdfBlob(withName());
    const bytes = await blobToBytes(blob);
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe("%PDF-");
  });

  it("produces a non-trivial byte count (>2KB)", async () => {
    const blob = await buildNdaPdfBlob(withName());
    expect(blob.size).toBeGreaterThan(2000);
  });

  it("ends with the PDF EOF marker", async () => {
    const blob = await buildNdaPdfBlob(withName());
    const bytes = await blobToBytes(blob);
    const tail = new TextDecoder().decode(bytes.slice(-8));
    expect(tail).toContain("%%EOF");
  });

  it("renders with perpetual terms without throwing", async () => {
    const blob = await buildNdaPdfBlob(
      withName({ mndaTermMode: "perpetual", confTermMode: "perpetual" }),
    );
    expect(blob.size).toBeGreaterThan(2000);
  });

  it("renders with empty optional fields without throwing", async () => {
    const blob = await buildNdaPdfBlob({
      ...defaultFormData,
      party1Name: "",
      party2Name: "",
      governingLawState: "",
      jurisdiction: "",
      purpose: "",
      modifications: "",
    });
    expect(blob.size).toBeGreaterThan(2000);
  });
}, { timeout: 20000 });
