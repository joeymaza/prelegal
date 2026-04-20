import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Home from "../app/page";

vi.mock("../app/lib/chat-api", () => ({
  fetchDocuments: vi.fn(async () => [
    {
      doc_type: "nda",
      name: "Mutual NDA (Standard Terms)",
      description: "Common Paper Mutual NDA.",
      party1_label: "Party 1",
      party2_label: "Party 2",
      field_names: ["party1Name"],
      greeting: "Hi! Let's draft an NDA.",
    },
    {
      doc_type: "csa",
      name: "Cloud Service Agreement (CSA)",
      description: "Common Paper CSA.",
      party1_label: "Provider",
      party2_label: "Customer",
      field_names: ["Provider", "Customer"],
      greeting: "Hi! Let's draft a CSA.",
    },
  ]),
  fetchTemplate: vi.fn(async () => "## Template\n\nContent here."),
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem("prelegal_user", "test@test.com");
});

describe("<Home /> — document picker", () => {
  it("renders the Prelegal heading", async () => {
    render(<Home />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Prelegal/i })).toBeInTheDocument(),
    );
  });

  it("shows the document selection prompt", async () => {
    render(<Home />);
    await waitFor(() =>
      expect(screen.getByText(/Choose a document type/i)).toBeInTheDocument(),
    );
  });

  it("renders document cards from the API", async () => {
    render(<Home />);
    await waitFor(() =>
      expect(screen.getByText("Mutual NDA (Standard Terms)")).toBeInTheDocument(),
    );
    expect(screen.getByText("Cloud Service Agreement (CSA)")).toBeInTheDocument();
  });

  it("renders Start drafting links with correct hrefs", async () => {
    render(<Home />);
    await waitFor(() =>
      expect(screen.getAllByRole("link", { name: /Start drafting/i }).length).toBeGreaterThan(0),
    );
    const links = screen.getAllByRole("link", { name: /Start drafting/i });
    expect(links[0]).toHaveAttribute("href", "/editor/?doc=nda");
    expect(links[1]).toHaveAttribute("href", "/editor/?doc=csa");
  });

  it("shows the logged-in user email", async () => {
    render(<Home />);
    await waitFor(() =>
      expect(screen.getByText("test@test.com")).toBeInTheDocument(),
    );
  });

  it("shows log out button", async () => {
    render(<Home />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Log out/i })).toBeInTheDocument(),
    );
  });
});
