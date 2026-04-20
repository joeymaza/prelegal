"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DocFields } from "../lib/doc-types";
import { ChatMessage, sendChatTurn } from "../lib/chat-api";

type ChatPanelProps = {
  docType: string;
  fields: DocFields;
  greeting: string;
  onPatch: (patch: Partial<DocFields>) => void;
};

export function ChatPanel({ docType, fields, greeting, onPatch }: ChatPanelProps) {
  const greetingMsg: ChatMessage = { role: "assistant", content: greeting };
  const [messages, setMessages] = useState<ChatMessage[]>([greetingMsg]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setSending(true);

    try {
      // Skip the synthetic greeting (index 0)
      const { reply, patch } = await sendChatTurn(history.slice(1), fieldsRef.current, docType);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      const filtered = Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v != null),
      );
      if (Object.keys(filtered).length > 0) {
        onPatch(filtered);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, messages, onPatch, docType]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-1 py-2" role="log" aria-label="Chat messages">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "text-white"
                  : "bg-slate-100 text-slate-800"
              }`}
              style={msg.role === "user" ? { backgroundColor: "#53629E" } : undefined}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-500">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200 pt-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 placeholder:text-slate-400"
            style={{ borderColor: "#87BAC3" }}
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={sending}
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !input.trim()}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: "#A3B087" }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
