import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  api,
  todayISO,
  type FoodEntry,
  type HomeSummary,
  type SleepLog,
} from "../api";

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

function greetingForNow(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

type CheckItem = {
  to: string;
  label: string;
  done: boolean;
  detail: string;
};

export function HomePage() {
  const location = useLocation();
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [openSleep, setOpenSleep] = useState<SleepLog | null>(null);
  const [calorieSeries, setCalorieSeries] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const today = todayISO();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, foods, open] = await Promise.all([
          api.homeSummary(),
          api.listFoods(),
          api.openSleep(),
        ]);
        const days = lastNDates(7);
        const series = days.map((day) =>
          foods
            .filter((f: FoodEntry) => f.logged_on === day)
            .reduce((sum, f) => sum + f.calories, 0),
        );
        if (!cancelled) {
          setSummary(s);
          setOpenSleep(open);
          setCalorieSeries(series);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load home");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.key]);

  const maxCal = useMemo(
    () => Math.max(1, ...calorieSeries),
    [calorieSeries],
  );

  const checks = useMemo((): CheckItem[] => {
    if (!summary) return [];

    const moodDone = Boolean(summary.todays_mood);
    const moodDetail = moodDone
      ? `Logged · ${summary.todays_mood!.overall}/5`
      : "Not logged yet";

    let sleepDone = false;
    let sleepDetail = "Not logged yet";
    if (openSleep) {
      sleepDone = true;
      sleepDetail = "Sleeping now";
    } else if (summary.last_sleep?.wake_time) {
      const wakeDay = localDateISO(new Date(summary.last_sleep.wake_time));
      if (wakeDay === today) {
        sleepDone = true;
        const hrs = summary.last_sleep.duration_hours;
        sleepDetail =
          hrs != null ? `${hrs} hours last night` : "Logged last night";
      } else {
        sleepDetail = "No sleep logged for today yet";
      }
    }

    const foodDone = summary.calories_today > 0;
    const foodDetail = foodDone
      ? `${Math.round(summary.calories_today)} kcal so far`
      : "Nothing logged yet";

    return [
      { to: "/mood", label: "Mood", done: moodDone, detail: moodDetail },
      { to: "/sleep", label: "Sleep", done: sleepDone, detail: sleepDetail },
      { to: "/eat", label: "Food", done: foodDone, detail: foodDetail },
    ];
  }, [summary, openSleep, today]);

  if (error) return <p className="error-text">{error}</p>;
  if (!summary) return <p>Loading home…</p>;

  const goal = summary.maintenance.available
    ? summary.maintenance.maintenance!
    : null;
  const eaten = summary.calories_today;
  const pct =
    goal && goal > 0 ? Math.min(100, Math.round((eaten / goal) * 100)) : null;
  const openCount = checks.filter((c) => !c.done).length;

  return (
    <div className="stack">
      <header className="home-hero">
        <p className="home-greeting">{greetingForNow()}</p>
        <h1>Home</h1>
        <p className="wire-note home-date">{formatShortDate(today)}</p>
      </header>

      <section className="wire-box home-checkin">
        <div className="section-head">
          <h2>Today&apos;s check-in</h2>
          <span className="wire-note">
            {openCount === 0 ? "All caught up" : `${openCount} still open`}
          </span>
        </div>
        <ul className="home-check-list">
          {checks.map((c) => (
            <li key={c.to}>
              <Link to={c.to} className="home-check-row">
                <span
                  className={
                    c.done ? "home-check-mark done" : "home-check-mark"
                  }
                  aria-hidden
                >
                  {c.done ? "✓" : "○"}
                </span>
                <span className="home-check-copy">
                  <span className="home-check-label">{c.label}</span>
                  <span className="wire-note">{c.detail}</span>
                </span>
                <span className="home-check-go">{c.done ? "View" : "Log"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="wire-box home-calories home-calories-compact">
        <div className="section-head">
          <h2>Calories</h2>
          <Link className="text-link" to="/eat">
            Log food
          </Link>
        </div>
        <p className="calorie-count calorie-count-compact">
          {Math.round(eaten)}
          {goal != null ? (
            <span className="calorie-goal"> / {goal} kcal</span>
          ) : (
            <span className="calorie-goal"> kcal</span>
          )}
        </p>
        {pct != null ? (
          <div
            className="progress-track"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        ) : null}
        {pct != null && (
          <p className="wire-note progress-caption">{pct}% of maintenance</p>
        )}

        <div className="sparkline sparkline-compact" aria-hidden>
          {calorieSeries.map((v, i) => (
            <div
              key={i}
              className="spark-bar"
              style={{ height: `${Math.max(6, (v / maxCal) * 100)}%` }}
              title={`${v} kcal`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
