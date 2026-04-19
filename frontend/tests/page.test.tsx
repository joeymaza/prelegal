import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "../app/page";

vi.mock("../app/nda-pdf", () => ({
  buildNdaPdfBlob: vi.fn(async () => new Blob(["%PDF-FAKE"], { type: "application/pdf" })),
}));

vi.mock("../app/chat-api", () => ({
  sendChatTurn: vi.fn(async () => ({
    reply: "Got it!",
    patch: { party1Name: "Acme" },
  })),
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

  it("renders the chat panel with greeting", () => {
    render(<Home />);
    expect(screen.getByText(/I'll help you draft your Mutual NDA/i)).toBeInTheDocument();
  });

  it("renders the chat input", () => {
    render(<Home />);
    expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
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

describe("<Home /> — chat interactions", () => {
  it("sends a message and shows the AI reply", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const input = screen.getByPlaceholderText(/Type your message/i);
    await user.type(input, "Acme Inc and Widgets LLC");
    await user.click(screen.getByRole("button", { name: /Send/i }));

    expect(await screen.findByText("Got it!")).toBeInTheDocument();
  });

  it("applies the patch from the AI to the preview", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const input = screen.getByPlaceholderText(/Type your message/i);
    await user.type(input, "Acme Inc and Widgets LLC");
    await user.click(screen.getByRole("button", { name: /Send/i }));

    await screen.findByText("Got it!");
    const preview = getPreview();
    expect(preview.textContent).toContain("Acme");
  });

  it("shows user message in the chat", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const input = screen.getByPlaceholderText(/Type your message/i);
    await user.type(input, "Hello there");
    await user.click(screen.getByRole("button", { name: /Send/i }));

    expect(screen.getByText("Hello there")).toBeInTheDocument();
  });
});

describe("<Home /> — signatures", () => {
  it("types a signature Print Name into the preview table", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const sigFields = screen.getAllByLabelText(/Print Name/i);
    await user.type(sigFields[0], "Jane Doe");

    const preview = getPreview();
    expect(preview.textContent).toContain("Jane Doe");
  });
});

describe("<Home /> — download wiring", () => {
  it("calls buildNdaPdfBlob and triggers an anchor download", async () => {
    const user = userEvent.setup();
    const { buildNdaPdfBlob } = await import("../app/nda-pdf");

    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");

    render(<Home />);
    await user.click(getDownloadButton());

    expect(buildNdaPdfBlob).toHaveBeenCalledTimes(1);
  });

  it("triggers download on Ctrl+Enter", async () => {
    const { buildNdaPdfBlob } = await import("../app/nda-pdf");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");

    render(<Home />);
    fireEvent.keyDown(window, { key: "Enter", ctrlKey: true });

    await screen.findByText(/Downloaded /);
    expect(buildNdaPdfBlob).toHaveBeenCalled();
  });
}, { timeout: 10000 });
