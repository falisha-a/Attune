import { type FormEvent, useState } from "react";
import { api } from "../api";
import { ACTIVITY_LEVELS, ETHNICITY_OPTIONS } from "../constants";

const DISCLAIMER =
  "Attune is for personal tracking and reflection. It is not medical advice and does not diagnose or treat conditions.";

type Props = {
  onComplete: () => void | Promise<void>;
};

export function OnboardingPage({ onComplete }: Props) {
  const [disclaimerOk, setDisclaimerOk] = useState(false);
  const [ethnicity, setEthnicity] = useState("");
  const [ethnicityOther, setEthnicityOther] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weightLb, setWeightLb] = useState("");
  const [age, setAge] = useState("");
  const [activity, setActivity] = useState("");
  const [cycleLength, setCycleLength] = useState("");
  const [lastPeriod, setLastPeriod] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!disclaimerOk) return;
    setSaving(true);
    setError(null);
    try {
      await api.onboard({
        height_in: Number(heightIn),
        weight_lb: Number(weightLb),
        age: Number(age),
        activity_level: activity,
        ethnicity: ethnicity || null,
        ethnicity_other:
          ethnicity === "Another race, ethnicity, or origin"
            ? ethnicityOther || null
            : null,
        cycle_length_days: cycleLength ? Number(cycleLength) : null,
        last_period_start: lastPeriod || null,
        disclaimer_accepted: true,
      });
      await onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stack onboarding" onSubmit={handleSubmit}>
      <h1>Welcome to Attune</h1>

      <section className="wire-box">
        <h2>Basics</h2>
        <label>
          Height (in)
          <input
            type="number"
            required
            value={heightIn}
            onChange={(e) => setHeightIn(e.target.value)}
          />
        </label>
        <label>
          Weight (lb)
          <input
            type="number"
            required
            value={weightLb}
            onChange={(e) => setWeightLb(e.target.value)}
          />
        </label>
        <label>
          Age
          <input
            type="number"
            required
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </label>
        <label>
          Activity level
          <select
            required
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
          >
            <option value="" disabled>
              Select…
            </option>
            {ACTIVITY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="wire-box">
        <h2>Cycle (optional)</h2>
        <label>
          Average cycle length (days)
          <input
            type="number"
            value={cycleLength}
            onChange={(e) => setCycleLength(e.target.value)}
            placeholder="Defaults to 28 if blank"
          />
        </label>
        <label>
          Last period start
          <input
            type="date"
            value={lastPeriod}
            onChange={(e) => setLastPeriod(e.target.value)}
          />
        </label>
      </section>

      <section className="wire-box">
        <h2>Ethnicity (optional)</h2>
        <select
          value={ethnicity}
          onChange={(e) => setEthnicity(e.target.value)}
        >
          <option value="">Skip for now</option>
          {ETHNICITY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {ethnicity === "Another race, ethnicity, or origin" && (
          <label>
            Please specify
            <input
              type="text"
              value={ethnicityOther}
              onChange={(e) => setEthnicityOther(e.target.value)}
            />
          </label>
        )}
      </section>

      <section className="wire-box">
        <h2>Disclaimer</h2>
        <p>{DISCLAIMER}</p>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={disclaimerOk}
            onChange={(e) => setDisclaimerOk(e.target.checked)}
          />
          I understand
        </label>
      </section>

      {error && <p className="error-text">{error}</p>}

      <button type="submit" disabled={!disclaimerOk || saving}>
        {saving ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
