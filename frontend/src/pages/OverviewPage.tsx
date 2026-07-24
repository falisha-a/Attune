import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type AiMessage, type HomeSummary } from "../api";

export function OverviewPage() {
  const [tier, setTier] = useState<string | null>(null);
  const [cycles, setCycles] = useState<number | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [home, setHome] = useState<HomeSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [history, summary] = await Promise.all([
      api.aiHistory(),
      api.homeSummary(),
    ]);
    setTier(history.tier);
    setCycles(history.cycles_logged);
    setMessages(history.messages);
    setHome(summary);
  }

  useEffect(() => {
    refresh().catch((e: Error) => setError(e.message));
  }, []);

  async function clearHistory() {
    if (!window.confirm("Clear all Insights chat history?")) return;
    setBusy(true);
    setError(null);
    try {
      await api.clearAiHistory();
      setMessage("Chat history cleared");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clear failed");
    } finally {
      setBusy(false);
    }
  }

  const phaseLabel =
    home?.phase.available && home.phase.phase
      ? `Day ${home.phase.cycle_day} · ${home.phase.phase}`
      : "Phase unavailable";

  return (
    <div className="stack">
      <p className="wire-note">
        <Link to="/settings" className="linkish" style={{ marginLeft: 0 }}>
          ← Settings
        </Link>
      </p>
      <h1>Insights overview</h1>
      {message && <p className="ok-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}

      <section className="wire-box stack">
        <h2>Status</h2>
        <p className="wire-note">
          Tier: {tier ?? "…"}
          {cycles != null ? ` · ${cycles} cycles logged` : ""}
        </p>
        <p className="wire-note">{phaseLabel}</p>
        {home && (
          <p className="wire-note">
            Today: {Math.round(home.calories_today)} kcal
            {home.maintenance.available && home.maintenance.maintenance != null
              ? ` / ${home.maintenance.maintenance} maintenance`
              : ""}
          </p>
        )}
      </section>

      <section className="wire-box stack">
        <div className="eat-meal-heading">
          <h2>Chat history</h2>
          <button
            type="button"
            className="btn-secondary"
            disabled={busy || messages.length === 0}
            onClick={clearHistory}
          >
            Clear
          </button>
        </div>
        {messages.length === 0 ? (
          <p className="wire-note">No messages yet</p>
        ) : (
          <div className="overview-messages">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "ai-bubble ai-bubble-user"
                    : "ai-bubble"
                }
              >
                <span className="overview-role">
                  {m.role === "user" ? "You" : "Attune"}
                </span>
                <p>{m.content}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
