import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "../app/page";

// The PDF module is dynamically imported inside the click handler. Mock it
// so the test focuses on click/download wiring rather than react-pdf internals.
vi.mock("../app/nda-pdf", () => ({
  buildNdaPdfBlob: vi.fn(async () => new Blob(["%PDF-FAKE"], { type: "application/pdf" })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem("prelegal_user", "test@test.com");
  if (!("createObjectURL" in URL)) {
    (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = () => "blob:mock";
  }
  if (!("revokeObjectURL" in URL)) {
    (URL as unknown as { revokeObjectURL: (s: string) => void }).revokeObjectURL = () => {};
  }
});

const getPreview = () => screen.getByTestId("nda-preview");
const getDownloadButton = () => screen.getAllByRole("button", { name: /Download as PDF/i })[0];
const getResetButton = () => screen.getAllByRole("button", { name: /^Reset$/i })[0];

describe("<Home /> — rendering", () => {
  it("renders the app title and description", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1, name: /Mutual NDA Creator/i })).toBeInTheDocument();
    expect(screen.getByText(/download a clean PDF/i)).toBeInTheDocument();
  });

  it("renders all form fields with labels", () => {
    render(<Home />);
    expect(screen.getByLabelText(/Party 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Party 2/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Purpose$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Effective Date$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Governing Law/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Jurisdiction/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/MNDA Modifications/i)).toBeInTheDocument();
  });

  it("renders download and reset buttons", () => {
    render(<Home />);
    expect(getDownloadButton()).toBeInTheDocument();
    expect(getResetButton()).toBeInTheDocument();
  });

  it("renders the preview panel with default placeholders", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /^Preview$/i })).toBeInTheDocument();
    const preview = getPreview();
    expect(preview.textContent).toContain("[Party 1]");
    expect(preview.textContent).toContain("[Party 2]");
  });
});

describe("<Home /> — form interactions", () => {
  it("updates the preview live as the user types the party names", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.type(screen.getByLabelText(/Party 1/i), "Acme");
    await user.type(screen.getByLabelText(/Party 2/i), "Widgets");

    const preview = getPreview();
    expect(preview.textContent).toContain("Acme");
    expect(preview.textContent).toContain("Widgets");
    expect(preview.textContent).not.toContain("[Party 1]");
  });

  it("switches MNDA term to perpetual and reflects it in preview", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const mndaSection = screen.getByRole("group", { name: /MNDA Term/i });
    await user.click(within(mndaSection).getByLabelText(/Continues until terminated/i));

    const preview = getPreview();
    expect(preview.textContent).toContain("Continues until terminated");
    expect(preview.textContent).not.toMatch(/Expires \d+ year/);
  });

  it("disables the MNDA year input when perpetual is selected", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const mndaSection = screen.getByRole("group", { name: /MNDA Term/i });
    const yearInput = within(mndaSection).getByRole("spinbutton");
    expect(yearInput).not.toBeDisabled();

    await user.click(within(mndaSection).getByLabelText(/Continues until terminated/i));
    expect(yearInput).toBeDisabled();
  });

  it("switches Term of Confidentiality to perpetuity", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const confSection = screen.getByRole("group", { name: /Term of Confidentiality/i });
    await user.click(within(confSection).getByLabelText(/In perpetuity/i));

    const preview = getPreview();
    expect(preview.textContent).toMatch(/Term of Confidentiality\.\s*In perpetuity\./);
  });

  it("reflects updated year count in the preview", () => {
    render(<Home />);

    const mndaSection = screen.getByRole("group", { name: /MNDA Term/i });
    const yearInput = within(mndaSection).getByRole("spinbutton") as HTMLInputElement;
    fireEvent.change(yearInput, { target: { value: "3" } });

    expect(getPreview().textContent).toContain("Expires 3 years from the Effective Date.");
  });

  it("resets form back to defaults", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const p1 = screen.getByLabelText(/Party 1/i) as HTMLInputElement;
    await user.type(p1, "Acme");
    expect(p1.value).toBe("Acme");

    await user.click(getResetButton());
    expect(p1.value).toBe("");
  });
});

describe("<Home /> — download wiring", () => {
  it("calls buildNdaPdfBlob and triggers an anchor download", async () => {
    const user = userEvent.setup();
    const { buildNdaPdfBlob } = await import("../app/nda-pdf");

    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");

    render(<Home />);
    await user.type(screen.getByLabelText(/Party 1/i), "Acme");
    await user.type(screen.getByLabelText(/Party 2/i), "Widgets");

    await user.click(getDownloadButton());

    expect(buildNdaPdfBlob).toHaveBeenCalledTimes(1);
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalled();
  });

  it("disables and re-enables the button around the async PDF build", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");

    render(<Home />);
    const btn = getDownloadButton();
    expect(btn).not.toBeDisabled();

    await user.click(btn);

    expect(getDownloadButton()).not.toBeDisabled();
  });
});

describe("<Home /> — validation + UX", () => {
  it("shows pending field count badge after user interaction", async () => {
    const user = userEvent.setup();
    render(<Home />);

    // Before any touch: "Ready" badge.
    expect(screen.getByText(/^Ready$/)).toBeInTheDocument();

    // After typing, required fields still empty → badge flips to "N fields pending".
    await user.type(screen.getByLabelText(/Party 1/i), "Acme");
    expect(screen.getByText(/fields? pending/i)).toBeInTheDocument();
  });

  it("types a signature Print Name into the preview table", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const p1Sig = screen.getByRole("group", { name: /^Party 1$/i });
    await user.type(within(p1Sig).getByLabelText(/Print Name/i), "Jane Doe");
    await user.type(within(p1Sig).getByLabelText(/^Title$/i), "CEO");

    const preview = getPreview();
    expect(preview.textContent).toContain("Jane Doe");
    expect(preview.textContent).toContain("CEO");
  });

  it("triggers download on Cmd/Ctrl+Enter", async () => {
    const { buildNdaPdfBlob } = await import("../app/nda-pdf");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");

    render(<Home />);
    fireEvent.keyDown(window, { key: "Enter", ctrlKey: true });

    await screen.findByText(/Downloaded /);
    expect(buildNdaPdfBlob).toHaveBeenCalled();
  });
}, { timeout: 10000 });
