import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type AiMessage } from "../api";
import "./AiPanel.css";

type ChatBubble = { role: "user" | "assistant"; text: string };

function shortChatError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("quota") || lower.includes("429") || lower.includes("rate")) {
    return "Gemini free-tier quota is used up. Wait a bit, then try again.";
  }
  if (raw.length > 160) return `${raw.slice(0, 157)}…`;
  return raw;
}

function toBubbles(rows: AiMessage[]): ChatBubble[] {
  return rows.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    text: m.content,
  }));
}

export function AiPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [tier, setTier] = useState<string | null>(null);
  const [cycles, setCycles] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatBubble[]>([
    {
      role: "assistant",
      text: "Ask about your logged patterns — sleep, food, mood, or cycle context.",
    },
  ]);

  useEffect(() => {
    if (!open) return;
    Promise.all([api.aiTier(), api.aiHistory()])
      .then(([t, history]) => {
        setTier(t.tier);
        setCycles(t.cycles_logged);
        if (history.messages.length > 0) {
          setMessages(toBubbles(history.messages));
        }
      })
      .catch(() => {
        /* optional chrome */
      });
  }, [open]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setBusy(true);
    try {
      const res = await api.aiChat(text);
      setTier(res.tier);
      setCycles(res.cycles_logged);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.reply },
      ]);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Chat failed";
      const nice = shortChatError(raw);
      setError(nice);
      setMessages((prev) => [...prev, { role: "assistant", text: nice }]);
    } finally {
      setBusy(false);
    }
  }

  const blocked = tier === "blocked";

  return (
    <>
      <button
        type="button"
        className="ai-fab"
        aria-label="Open insights chat"
        title="Insights chat"
        onClick={() => setOpen(true)}
      >
        AI
      </button>

      {open && (
        <div className="ai-panel" role="dialog" aria-label="Insights chat">
          <div className="ai-panel-header">
            <strong>Insights</strong>
            <button type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          <div className="ai-panel-body">
            <p className="wire-note">
              {tier
                ? `Tier: ${tier}${cycles != null ? ` · ${cycles} cycles logged` : ""}`
                : "Loading confidence tier…"}
              {" · "}
              <Link to="/overview">Overview</Link>
            </p>
            {error && <p className="error-text">{error}</p>}
            <div className="ai-messages">
              {messages.map((m, i) => (
                <div
                  key={`${m.role}-${i}`}
                  className={
                    m.role === "user" ? "ai-bubble ai-bubble-user" : "ai-bubble"
                  }
                >
                  {m.text}
                </div>
              ))}
            </div>
            <form className="ai-compose" onSubmit={onSend}>
              <input
                type="text"
                placeholder={
                  blocked
                    ? "Log more periods to unlock insights…"
                    : "Ask a question…"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={busy}
              />
              <button type="submit" disabled={busy || !input.trim()}>
                {busy ? "…" : "Send"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
