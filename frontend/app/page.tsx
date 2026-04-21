"use client";

import { useCallback, useEffect, useState } from "react";
import type { DocMeta } from "./lib/doc-types";
import { fetchDocuments } from "./lib/chat-api";

export default function Home() {
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("prelegal_user");
    if (!stored) {
      window.location.href = "/login/";
      return;
    }
    setUser(stored);
    fetchDocuments()
      .then(setDocs)
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("prelegal_user");
    window.location.href = "/login/";
  }, []);

  if (!user) return null;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1
            className="font-serif text-3xl font-semibold tracking-tight"
            style={{ color: "#473472" }}
          >
            Prelegal
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Choose a document type to start drafting with AI.
          </p>
        </div>
        <span className="flex items-center gap-2 text-xs text-slate-500">
          {user}
          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            Log out
          </button>
        </span>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500">Loading documents...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc) => (
            <a
              key={doc.doc_type}
              href={`/editor/?doc=${doc.doc_type}`}
              className="paper group flex flex-col rounded-xl p-5 transition hover:shadow-lg"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-md text-[10px] font-bold text-white shadow-sm"
                  style={{ background: "linear-gradient(135deg, #53629E, #473472)" }}
                  aria-hidden
                >
                  {doc.doc_type.slice(0, 3).toUpperCase()}
                </span>
                <h2
                  className="font-serif text-base font-semibold tracking-tight"
                  style={{ color: "#473472" }}
                >
                  {doc.name}
                </h2>
              </div>
              <p className="flex-1 text-xs leading-relaxed text-slate-600">
                {doc.description}
              </p>
              <span
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium transition group-hover:underline"
                style={{ color: "#53629E" }}
              >
                Start drafting
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M3 10a.75.75 0 0 1 .75-.75h10.19l-3.72-3.72a.75.75 0 1 1 1.06-1.06l5 5a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 1 1-1.06-1.06l3.72-3.72H3.75A.75.75 0 0 1 3 10Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
