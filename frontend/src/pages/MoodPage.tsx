import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { MoodFace } from "../components/MoodFace";
import { api, todayISO, type MoodLog } from "../api";
import { MOOD_WORDS_BY_RATING } from "../constants";

type Step = "rate" | "words" | "history";
type Rating = 1 | 2 | 3 | 4 | 5;
type SlideDir = "forward" | "back";
type CloudSlot = { left: number; top: number };
type CustomChip = { id: string; word: string; left: number; top: number };
type DraftBubble = { left: number; top: number; text: string };

const LONG_PRESS_MS = 520;
const LONG_PRESS_MOVE_PX = 12;
const CUSTOM_WORD_MAX = 22;

function localDateISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function lastNDates(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    out.push(localDateISO(x));
  }
  return out;
}

function weekdayShort(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
  });
}

function asRating(n: number): Rating {
  if (n <= 1) return 1;
  if (n >= 5) return 5;
  return n as Rating;
}

/**
 * Hand-placed wide cloud silhouettes (owner-approved draft).
 * Longer words prefer center slots, but only if they fit without overlap.
 */
const CLOUD_LAYOUTS: Record<number, CloudSlot[]> = {
  8: [
    { left: 34, top: 22 },
    { left: 64, top: 26 },
    { left: 16, top: 48 },
    { left: 44, top: 44 },
    { left: 74, top: 50 },
    { left: 30, top: 72 },
    { left: 56, top: 76 },
    { left: 82, top: 70 },
  ],
  9: [
    { left: 30, top: 20 },
    { left: 54, top: 16 },
    { left: 78, top: 24 },
    { left: 14, top: 46 },
    { left: 40, top: 50 },
    { left: 66, top: 44 },
    { left: 88, top: 52 },
    { left: 32, top: 74 },
    { left: 62, top: 78 },
  ],
  10: [
    { left: 28, top: 18 },
    { left: 52, top: 14 },
    { left: 76, top: 20 },
    { left: 12, top: 42 },
    { left: 38, top: 48 },
    { left: 62, top: 40 },
    { left: 86, top: 46 },
    { left: 24, top: 70 },
    { left: 50, top: 76 },
    { left: 76, top: 68 },
  ],
};

function estimateChipWidth(word: string) {
  return Math.max(56, word.length * 7.4 + 30);
}

function cloudSlotsFor(words: readonly string[]): CloudSlot[] {
  const n = words.length;
  const layout =
    CLOUD_LAYOUTS[n] ??
    Array.from({ length: n }, (_, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      return {
        left: 50 + Math.cos(angle) * 34,
        top: 50 + Math.sin(angle) * 28,
      };
    });

  const W = 384;
  const H = 200;
  const GAP = 12;
  const CHIP_H = 34;

  const byCenter = layout
    .map((slot, index) => ({
      index,
      slot,
      edge: Math.abs(slot.left - 50) * 1.15 + Math.abs(slot.top - 50),
    }))
    .sort((a, b) => a.edge - b.edge);

  const byLength = words
    .map((word, index) => ({ word, index }))
    .sort((a, b) => b.word.length - a.word.length);

  const used = new Set<number>();
  const placed: { cx: number; cy: number; w: number }[] = [];
  const out: CloudSlot[] = Array.from({ length: n }, () => ({
    left: 50,
    top: 50,
  }));

  for (const { word, index } of byLength) {
    const w = estimateChipWidth(word);
    let chosen = -1;

    for (const cand of byCenter) {
      if (used.has(cand.index)) continue;
      const cx = (cand.slot.left / 100) * W;
      const cy = (cand.slot.top / 100) * H;
      const overlaps = placed.some(
        (p) =>
          Math.abs(cx - p.cx) < (w + p.w) / 2 + GAP &&
          Math.abs(cy - p.cy) < CHIP_H + GAP,
      );
      if (!overlaps) {
        chosen = cand.index;
        placed.push({ cx, cy, w });
        break;
      }
    }

    if (chosen < 0) {
      chosen = byCenter.find((c) => !used.has(c.index))?.index ?? 0;
      const slot = layout[chosen];
      placed.push({
        cx: (slot.left / 100) * W,
        cy: (slot.top / 100) * H,
        w,
      });
    }

    used.add(chosen);
    out[index] = layout[chosen];
  }

  return out;
}

export function MoodPage() {
  const [step, setStep] = useState<Step>("rate");
  const [overall, setOverall] = useState(3);
  const [selected, setSelected] = useState<string[]>([]);
  const [customChips, setCustomChips] = useState<CustomChip[]>([]);
  const [draft, setDraft] = useState<DraftBubble | null>(null);
  const [moods, setMoods] = useState<MoodLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [slideDir, setSlideDir] = useState<SlideDir>("forward");
  const [slideKey, setSlideKey] = useState(0);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const pressTimer = useRef<number | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const draftInputRef = useRef<HTMLInputElement | null>(null);

  const today = todayISO();
  const cloudWords = MOOD_WORDS_BY_RATING[asRating(overall)];
  const slots = useMemo(() => cloudSlotsFor(cloudWords), [cloudWords]);

  function goTo(next: Step, dir: SlideDir) {
    setSlideDir(dir);
    setSlideKey((k) => k + 1);
    setStep(next);
  }

  function clearPressTimer() {
    if (pressTimer.current != null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressOrigin.current = null;
  }

  function resetWordDraft() {
    setSelected([]);
    setCustomChips([]);
    setDraft(null);
    clearPressTimer();
  }

  function canStartLongPress(target: EventTarget | null) {
    if (!(target instanceof Element)) return false;
    if (target.closest(".mood-cloud-word")) return false;
    if (target.closest(".mood-word-bubble")) return false;
    if (target.closest("input, textarea, button")) return false;
    return Boolean(target.closest(".mood-cloud-stage"));
  }

  function openDraftAt(clientX: number, clientY: number) {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const left = ((clientX - rect.left) / rect.width) * 100;
    const top = ((clientY - rect.top) / rect.height) * 100;
    setDraft({
      left: Math.min(88, Math.max(12, left)),
      top: Math.min(88, Math.max(12, top)),
      text: "",
    });
  }

  function commitDraft() {
    if (!draft) return;
    const word = draft.text.trim().replace(/\s+/g, " ");
    if (!word) {
      setDraft(null);
      return;
    }
    const clipped = word.slice(0, CUSTOM_WORD_MAX);
    const exists =
      cloudWords.some((w) => w.toLowerCase() === clipped.toLowerCase()) ||
      customChips.some((c) => c.word.toLowerCase() === clipped.toLowerCase());

    if (exists) {
      const match =
        cloudWords.find((w) => w.toLowerCase() === clipped.toLowerCase()) ??
        customChips.find((c) => c.word.toLowerCase() === clipped.toLowerCase())
          ?.word ??
        clipped;
      setSelected((prev) => (prev.includes(match) ? prev : [...prev, match]));
      setDraft(null);
      return;
    }

    const id = `custom-${Date.now()}`;
    setCustomChips((prev) => [
      ...prev,
      { id, word: clipped, left: draft.left, top: draft.top },
    ]);
    setSelected((prev) => [...prev, clipped]);
    setDraft(null);
  }

  function onStagePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 && e.pointerType !== "touch") return;
    if (!canStartLongPress(e.target)) return;
    if (draft) return;

    clearPressTimer();
    pressOrigin.current = { x: e.clientX, y: e.clientY };
    const { clientX, clientY } = e;
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null;
      pressOrigin.current = null;
      openDraftAt(clientX, clientY);
    }, LONG_PRESS_MS);
  }

  function onStagePointerMove(e: PointerEvent<HTMLDivElement>) {
    const origin = pressOrigin.current;
    if (!origin || pressTimer.current == null) return;
    const dx = e.clientX - origin.x;
    const dy = e.clientY - origin.y;
    if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_PX) clearPressTimer();
  }

  function onStagePointerUp() {
    clearPressTimer();
  }

  useEffect(() => {
    if (draft) draftInputRef.current?.focus();
  }, [draft]);

  async function refresh() {
    const list = await api.listMoods();
    setMoods(list);
    const todays = list.find((m) => m.logged_on === today);
    if (todays) setStep("history");
    else setStep("rate");
  }

  useEffect(() => {
    refresh().catch((e: Error) => setError(e.message));
  }, []);

  const week = useMemo(() => {
    return lastNDates(7).map((day) => ({
      day,
      log: moods.find((m) => m.logged_on === day),
    }));
  }, [moods]);

  const todays = moods.find((m) => m.logged_on === today);

  function toggleWord(word: string) {
    setSelected((prev) =>
      prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word],
    );
  }

  async function save(words: string[]) {
    setSaving(true);
    setError(null);
    try {
      await api.addMood({
        overall,
        words,
        note: null,
        logged_on: today,
      });
      resetWordDraft();
      const list = await api.listMoods();
      setMoods(list);
      goTo("history", "forward");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const slideClass =
    slideDir === "forward" ? "mood-slide-forward" : "mood-slide-back";

  if (step === "history") {
    return (
      <div className="stack mood-page">
        <div className="mood-top">
          <h1>Mood</h1>
          <button
            type="button"
            className="chip"
            onClick={() => {
              setOverall(todays?.overall ?? 3);
              resetWordDraft();
              goTo("rate", "back");
            }}
          >
            {todays ? "Update today" : "Log today"}
          </button>
        </div>
        {error && <p className="error-text">{error}</p>}

        <div key={slideKey} className={`stack ${slideClass}`}>
          {todays && (
            <section className="mood-prompt mood-today-card">
              <h2>Today</h2>
              <div className="mood-today-row">
                <MoodFace level={todays.overall} size={56} />
                {todays.words.length > 0 && (
                  <div className="mood-today-words" aria-label="Today's mood words">
                    {todays.words.map((word) => (
                      <span key={word} className="mood-today-chip">
                        {word}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="mood-prompt mood-history-week">
            <h2>Last 7 days</h2>
            <div className="mood-week">
              {week.map(({ day, log }) => (
                <div key={day} className="mood-day">
                  {log ? (
                    <span title={`${log.overall}/5`}>
                      <MoodFace level={log.overall} size={32} />
                    </span>
                  ) : (
                    <span className="mood-face-empty" title="No log">
                      ·
                    </span>
                  )}
                  <span className="mood-weekday">{weekdayShort(day)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (step === "words") {
    return (
      <div className="stack mood-page">
        <div className="mood-top">
          <h1>Mood</h1>
          <button
            type="button"
            className="text-skip"
            onClick={() => save([])}
            disabled={saving}
          >
            Skip
          </button>
        </div>
        {error && <p className="error-text">{error}</p>}
        <section
          key={slideKey}
          className={`mood-prompt mood-words-step ${slideClass}`}
        >
          <h2>Words that describe your day</h2>
          <div
            ref={stageRef}
            className="mood-cloud-stage"
            title="Press and hold empty space to add your own word"
            onPointerDown={onStagePointerDown}
            onPointerMove={onStagePointerMove}
            onPointerUp={onStagePointerUp}
            onPointerCancel={onStagePointerUp}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="mood-word-cloud" role="group" aria-label="Mood words">
              {cloudWords.map((word, i) => {
                const on = selected.includes(word);
                const slot = slots[i] ?? { left: 50, top: 50 };
                return (
                  <button
                    key={word}
                    type="button"
                    className={on ? "mood-cloud-word on" : "mood-cloud-word"}
                    aria-pressed={on}
                    style={{ left: `${slot.left}%`, top: `${slot.top}%` }}
                    onClick={() => toggleWord(word)}
                  >
                    {word}
                  </button>
                );
              })}
            </div>

            {customChips.map((chip, i) => {
              const on = selected.includes(chip.word);
              return (
                <button
                  key={chip.id}
                  type="button"
                  className={
                    on
                      ? "mood-cloud-word on mood-cloud-word-custom"
                      : "mood-cloud-word mood-cloud-word-custom"
                  }
                  aria-pressed={on}
                  style={
                    {
                      left: `${chip.left}%`,
                      top: `${chip.top}%`,
                      "--mood-drift-duration": `${9.2 + (i % 3) * 0.8}s`,
                      "--mood-drift-delay": `${-1.1 * (i + 1)}s`,
                    } as CSSProperties
                  }
                  onClick={() => toggleWord(chip.word)}
                >
                  {chip.word}
                </button>
              );
            })}

            {draft && (
              <form
                className="mood-word-bubble"
                style={{ left: `${draft.left}%`, top: `${draft.top}%` }}
                onSubmit={(e) => {
                  e.preventDefault();
                  commitDraft();
                }}
              >
                <input
                  ref={draftInputRef}
                  className="mood-word-bubble-input"
                  value={draft.text}
                  maxLength={CUSTOM_WORD_MAX}
                  placeholder="your word"
                  aria-label="Add your own mood word"
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, text: e.target.value } : d))
                  }
                  onBlur={() => commitDraft()}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setDraft(null);
                    }
                  }}
                />
              </form>
            )}
          </div>
          <button type="button" disabled={saving} onClick={() => save(selected)}>
            {saving ? "Saving…" : "Save"}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="stack mood-page">
      <h1>Mood</h1>
      {error && <p className="error-text">{error}</p>}
      <section key={slideKey} className={`mood-prompt mood-rate ${slideClass}`}>
        <h2>What was your mood for today?</h2>
        <div className="mood-face-picker" role="radiogroup" aria-label="Mood rating">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={overall === level}
              aria-label={`${level} of 5`}
              className={
                overall === level ? "mood-face-option on" : "mood-face-option"
              }
              onClick={() => {
                setOverall(level);
                resetWordDraft();
              }}
            >
              <MoodFace level={level} size={44} />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            resetWordDraft();
            goTo("words", "forward");
          }}
        >
          Next
        </button>
      </section>
    </div>
  );
}
