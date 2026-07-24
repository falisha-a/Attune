import { type FormEvent, useEffect, useState } from "react";
import { api, toLocalInputValue, type SleepLog } from "../api";

function clockHour(d: Date): string {
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h} ${ampm}`;
}

function weekdayClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
  return `${weekday} ${clockHour(d)}`;
}

/** e.g. "Sleeping since Monday 5 PM" */
function formatSleepingSince(iso: string): string {
  const label = weekdayClock(iso);
  return label ? `Sleeping since ${label}` : "Sleeping";
}

/** e.g. "Monday 5 PM · woke 5 PM" */
function formatSleepSpan(bedIso: string, wakeIso: string | null): string {
  const start = weekdayClock(bedIso);
  if (!start) return "";
  if (!wakeIso) return start;
  const wake = new Date(wakeIso);
  if (Number.isNaN(wake.getTime())) return start;
  const bed = new Date(bedIso);
  const sameDay =
    bed.getFullYear() === wake.getFullYear() &&
    bed.getMonth() === wake.getMonth() &&
    bed.getDate() === wake.getDate();
  const wakeLabel = sameDay
    ? clockHour(wake)
    : `${wake.toLocaleDateString(undefined, { weekday: "long" })} ${clockHour(wake)}`;
  return `${start} · woke ${wakeLabel}`;
}

export function SleepPage() {
  const [open, setOpen] = useState<SleepLog | null>(null);
  const [history, setHistory] = useState<SleepLog[]>([]);
  const [lastSaved, setLastSaved] = useState<SleepLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [bedtime, setBedtime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [o, list] = await Promise.all([api.openSleep(), api.listSleep()]);
    setOpen(o);
    const closed = list.filter((s) => !s.is_open);
    setHistory(closed.slice(0, 8));
    if (o) setBedtime(toLocalInputValue(o.bedtime));
  }

  useEffect(() => {
    refresh().catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), 60_000);
    return () => window.clearTimeout(t);
  }, [message]);

  async function onPrimaryTap() {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      if (!open) {
        await api.startSleep({ bedtime: new Date().toISOString() });
        setLastSaved(null);
        setMessage("Sleep started");
        await refresh();
      } else {
        // One tap ends sleep immediately (persisted wake = now)
        const saved = await api.wakeSleep({
          wake_time: new Date().toISOString(),
          description: null,
        });
        setLastSaved(saved);
        setMessage(
          saved.duration_hours != null
            ? `Logged ${saved.duration_hours}h sleep`
            : "Sleep logged",
        );
        await refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function saveManual(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!bedtime || !wakeTime) {
      setError("Bedtime and wake time required");
      return;
    }
    try {
      const saved = await api.manualSleep({
        bedtime: new Date(bedtime).toISOString(),
        wake_time: new Date(wakeTime).toISOString(),
        description: manualDesc || null,
      });
      setLastSaved(saved);
      setMessage("Manual sleep saved");
      setManualDesc("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  const asleep = Boolean(open);

  return (
    <div className="stack sleep-page">
      <h1>Sleep</h1>
      {message && <p className="ok-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="sleep-hero">
        <button
          type="button"
          className={`sleep-big-btn ${asleep ? "asleep" : ""}`}
          onClick={onPrimaryTap}
          disabled={busy}
          title={asleep ? "Tap when you wake up" : "Tap when you go to sleep"}
        >
          <span className="sleep-big-label">
            {asleep ? "I'm awake" : "Going to sleep"}
          </span>
        </button>
      </div>

      {asleep && open && (
        <p className="wire-note sleep-status">
          {formatSleepingSince(open.bedtime)}
        </p>
      )}

      {lastSaved && !asleep && (
        <section className="wire-box">
          <h2>Last sleep</h2>
          <p>
            {lastSaved.duration_hours != null
              ? `${lastSaved.duration_hours} hours`
              : "Saved"}
          </p>
          <p className="wire-note">
            {formatSleepSpan(lastSaved.bedtime, lastSaved.wake_time)}
          </p>
        </section>
      )}

      <button
        type="button"
        className="chip"
        onClick={() => setShowDetails((v) => !v)}
      >
        {showDetails ? "Hide details" : "Adjust times / manual log"}
      </button>

      {showDetails && (
        <>
          {!open && (
            <form className="wire-box stack" onSubmit={saveManual}>
              <h2>Manual log</h2>
              <label>
                Bedtime
                <input
                  type="datetime-local"
                  value={bedtime}
                  onChange={(e) => setBedtime(e.target.value)}
                />
              </label>
              <label>
                Wake time
                <input
                  type="datetime-local"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                />
              </label>
              <label>
                Description
                <textarea
                  rows={2}
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                />
              </label>
              <button type="submit">Save manual entry</button>
            </form>
          )}

          <section className="wire-box">
            <h2>Recent</h2>
            <ul>
              {history.length === 0 && (
                <li className="wire-note">No sleep logs yet</li>
              )}
              {history.map((s) => (
                <li key={s.id}>
                  {s.duration_hours != null ? `${s.duration_hours}h` : "—"} —{" "}
                  {formatSleepSpan(s.bedtime, s.wake_time)}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
