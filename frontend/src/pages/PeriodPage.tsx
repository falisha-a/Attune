import { useEffect, useMemo, useState } from "react";
import { api, todayISO, type PeriodLog } from "../api";
import { PERIOD_SYMPTOMS } from "../constants";

const HISTORY_PREVIEW = 3;
const DEFAULT_LEN = 28;
const TOAST_MS = 2000;

/** Client-side phase so the circle updates even if summary is slow/odd. */
function localPhase(
  lastStart: string | null,
  cycleLen: number,
  today: string,
): { day: number; phase: string } | null {
  if (!lastStart) return null;
  const start = new Date(`${lastStart}T12:00:00`);
  const now = new Date(`${today}T12:00:00`);
  let delta = Math.round(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (delta < 0) delta = 0;
  const day = (delta % cycleLen) + 1;
  const menstrualEnd = Math.max(1, Math.round((5 * cycleLen) / 28));
  const ovStart = Math.max(menstrualEnd + 1, cycleLen - 14 - 1);
  const ovEnd = Math.min(cycleLen - 1, cycleLen - 14 + 1);
  let phase = "luteal";
  if (day <= menstrualEnd) phase = "menstrual";
  else if (day < ovStart) phase = "follicular";
  else if (day <= ovEnd) phase = "ovulation";
  return { day, phase };
}

export function PeriodPage() {
  const [history, setHistory] = useState<PeriodLog[]>([]);
  const [cycleDay, setCycleDay] = useState<number | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const [cycleLength, setCycleLength] = useState(DEFAULT_LEN);
  const [usingDefaultLength, setUsingDefaultLength] = useState(true);
  const [flow, setFlow] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const today = todayISO();

  const openPeriod = useMemo(() => {
    return (
      history.find((p) => !p.end_date && p.start_date <= today) ?? null
    );
  }, [history, today]);

  useEffect(() => {
    if (!openPeriod) return;
    setFlow(openPeriod.flow ?? "");
    setSymptoms(openPeriod.symptoms ?? []);
  }, [openPeriod?.id]);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [message]);

  useEffect(() => {
    if (!sheetOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeSheet();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  function closeSheet() {
    setSheetOpen(false);
    setPickerOpen(false);
  }

  function openSheet() {
    setError(null);
    setSheetOpen(true);
  }

  function applyPhase(
    lastStart: string | null,
    length: number,
    fromApi?: {
      available: boolean;
      cycle_day: number | null;
      phase: string | null;
    },
  ) {
    if (fromApi?.available && fromApi.cycle_day != null && fromApi.phase) {
      setCycleDay(fromApi.cycle_day);
      setPhase(fromApi.phase);
      return;
    }
    const local = localPhase(lastStart, length, today);
    if (local) {
      setCycleDay(local.day);
      setPhase(local.phase);
    } else {
      setCycleDay(null);
      setPhase(null);
    }
  }

  async function refresh() {
    const [periods, home, user] = await Promise.all([
      api.listPeriods(),
      api.homeSummary(),
      api.getUser(),
    ]);
    setHistory(periods);

    const length =
      user.cycle_length_days ?? home.phase.cycle_length_days ?? DEFAULT_LEN;
    setCycleLength(length);
    setUsingDefaultLength(
      !user.cycle_length_days || user.cycle_length_days === DEFAULT_LEN,
    );

    const lastStart =
      user.last_period_start ??
      home.phase.last_period_start ??
      periods[0]?.start_date ??
      null;

    applyPhase(lastStart, length, home.phase);
  }

  useEffect(() => {
    refresh().catch((e: Error) => setError(e.message));
  }, []);

  const ring = useMemo(() => {
    const size = 260;
    const stroke = 16;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const progress =
      cycleDay != null && cycleLength > 0
        ? Math.min(1, cycleDay / cycleLength)
        : 0;
    return { size, stroke, r, c, offset: c * (1 - progress) };
  }, [cycleDay, cycleLength]);

  const daysToNext =
    cycleDay != null && cycleLength > 0
      ? Math.max(0, cycleLength - cycleDay)
      : null;

  const visibleHistory = showAllHistory
    ? history
    : history.slice(0, HISTORY_PREVIEW);

  function formatShortDate(iso: string) {
    const d = new Date(`${iso}T12:00:00`);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  function periodStatusLabel(startIso: string) {
    if (startIso === today) return "Started today";
    return `On period since ${formatShortDate(startIso)}`;
  }

  function formatRange(p: PeriodLog) {
    const startLabel = formatShortDate(p.start_date);
    if (!p.end_date) return `${startLabel} – now`;
    const end = new Date(`${p.end_date}T12:00:00`);
    const start = new Date(`${p.start_date}T12:00:00`);
    const endLabel = formatShortDate(p.end_date);
    const days =
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return `${startLabel} – ${endLabel} · ${days}d`;
  }

  function toggleSymptom(s: string) {
    setSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  async function periodStartedToday() {
    setBusy(true);
    setError(null);
    try {
      const created = await api.addPeriod({
        start_date: today,
        flow: null,
        symptoms: [],
        cramps: false,
        bloating: false,
      });
      applyPhase(created.start_date, cycleLength || DEFAULT_LEN);
      setFlow("");
      setSymptoms([]);
      setPickerOpen(false);
      await refresh();
      openSheet();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not log start");
    } finally {
      setBusy(false);
    }
  }

  async function periodEndedToday() {
    if (!openPeriod) return;
    setBusy(true);
    setError(null);
    try {
      await api.updatePeriod(openPeriod.id, {
        end_date: today,
        flow: flow || openPeriod.flow,
        symptoms,
      });
      setMessage("Period end logged");
      closeSheet();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not log end");
    } finally {
      setBusy(false);
    }
  }

  async function saveTodayLog() {
    if (!openPeriod) return;
    setBusy(true);
    setError(null);
    try {
      await api.updatePeriod(openPeriod.id, {
        flow: flow || openPeriod.flow,
        symptoms,
      });
      setMessage("Saved");
      closeSheet();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack period-page">
      <h1>Period</h1>
      {message && <p className="ok-text period-toast">{message}</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="period-ring-wrap large">
        <svg
          className="period-ring"
          width={ring.size}
          height={ring.size}
          viewBox={`0 0 ${ring.size} ${ring.size}`}
        >
          <circle
            cx={ring.size / 2}
            cy={ring.size / 2}
            r={ring.r}
            fill="none"
            stroke="rgba(31,122,102,0.2)"
            strokeWidth={ring.stroke}
          />
          <circle
            cx={ring.size / 2}
            cy={ring.size / 2}
            r={ring.r}
            fill="none"
            stroke="#1f7a66"
            strokeWidth={ring.stroke}
            strokeLinecap="round"
            strokeDasharray={ring.c}
            strokeDashoffset={ring.offset}
            transform={`rotate(-90 ${ring.size / 2} ${ring.size / 2})`}
          />
        </svg>
        <div className="period-ring-center">
          {cycleDay != null && phase ? (
            <>
              <span className="period-kicker">Cycle day</span>
              <span className="period-day">{cycleDay}</span>
              <span className="period-phase cap">{phase}</span>
              {usingDefaultLength && (
                <span className="period-next">28-day cycle</span>
              )}
              {daysToNext != null && (
                <span className="period-next">
                  {daysToNext === 0
                    ? "Next period expected soon"
                    : `${daysToNext}d to next period`}
                </span>
              )}
            </>
          ) : (
            <span className="period-phase muted">
              Log a period start to see your day
            </span>
          )}
        </div>
      </div>

      <section className="period-surface stack">
        {!openPeriod ? (
          <div className="period-start-block">
            <button type="button" disabled={busy} onClick={periodStartedToday}>
              Period started today
            </button>
            <p className="wire-note period-start-hint">
              Tap to begin, then log flow and how you feel
            </p>
          </div>
        ) : (
          <div className="period-main-actions stack">
            <p className="period-status">
              {periodStatusLabel(openPeriod.start_date)}
            </p>
            <button type="button" onClick={openSheet}>
              Log today
            </button>
          </div>
        )}
      </section>

      <section className="period-surface">
        <h2>Past periods</h2>
        {history.length === 0 ? (
          <p className="wire-note">No periods logged yet</p>
        ) : (
          <>
            <ul className="period-history-list">
              {visibleHistory.map((p) => (
                <li key={p.id} className="period-history-item">
                  <span>{formatRange(p)}</span>
                  {(p.flow || (p.symptoms && p.symptoms.length > 0)) && (
                    <span className="period-history-meta">
                      {[p.flow, ...(p.symptoms ?? [])]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {history.length > HISTORY_PREVIEW && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowAllHistory((v) => !v)}
              >
                {showAllHistory
                  ? "Show less"
                  : `Show all (${history.length})`}
              </button>
            )}
          </>
        )}
      </section>

      {sheetOpen && openPeriod && (
        <div className="period-sheet-root">
          <button
            type="button"
            className="period-sheet-backdrop"
            aria-label="Close log sheet"
            onClick={closeSheet}
          />
          <div
            className="period-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="period-sheet-title"
          >
            <div className="period-sheet-head">
              <div>
                <h2 id="period-sheet-title">Log today</h2>
                <p className="period-status">
                  {periodStatusLabel(openPeriod.start_date)}
                </p>
              </div>
              <button
                type="button"
                className="period-sheet-close"
                onClick={closeSheet}
              >
                Done
              </button>
            </div>

            <div className="period-sheet-body stack">
              <label>
                Flow today
                <select
                  value={flow}
                  onChange={(e) => setFlow(e.target.value)}
                >
                  <option value="">Select…</option>
                  <option value="light">Light</option>
                  <option value="medium">Medium</option>
                  <option value="heavy">Heavy</option>
                </select>
              </label>

              <div className="symptom-block">
                <p className="symptom-block-label">How you&apos;re feeling</p>
                <div className="symptom-row">
                  {symptoms.map((s) => (
                    <span key={s} className="chip on">
                      {s}
                      <button
                        type="button"
                        className="chip-x"
                        aria-label={`Remove ${s}`}
                        onClick={() => toggleSymptom(s)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    className="symptom-add"
                    aria-label="Add how you're feeling"
                    onClick={() => setPickerOpen((v) => !v)}
                  >
                    +
                  </button>
                </div>

                {pickerOpen && (
                  <div className="symptom-picker">
                    <div className="chip-row">
                      {PERIOD_SYMPTOMS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={
                            symptoms.includes(s) ? "chip on" : "chip"
                          }
                          onClick={() => toggleSymptom(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn-secondary symptom-picker-done"
                      onClick={() => setPickerOpen(false)}
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>

              <div className="period-log-actions">
                <button type="button" disabled={busy} onClick={saveTodayLog}>
                  Save today’s log
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={busy}
                  onClick={periodEndedToday}
                >
                  Period ended today
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
