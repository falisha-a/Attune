import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api, type User } from "../api";
import { ACTIVITY_LEVELS, ETHNICITY_OPTIONS } from "../constants";

const DISCLAIMER =
  "Attune is for personal tracking and reflection. It is not medical advice and does not diagnose or treat conditions.";

type Props = {
  user: User;
  onSaved: () => void | Promise<void>;
};

export function SettingsPage({ user, onSaved }: Props) {
  const [heightIn, setHeightIn] = useState(String(user.height_in ?? ""));
  const [weightLb, setWeightLb] = useState(String(user.weight_lb ?? ""));
  const [age, setAge] = useState(String(user.age ?? ""));
  const [activity, setActivity] = useState(user.activity_level ?? "");
  const [ethnicity, setEthnicity] = useState(user.ethnicity ?? "");
  const [ethnicityOther, setEthnicityOther] = useState(
    user.ethnicity_other ?? "",
  );
  const [cycleLength, setCycleLength] = useState(
    String(user.cycle_length_days ?? ""),
  );
  const [lastPeriod, setLastPeriod] = useState(user.last_period_start ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.updateUser({
        height_in: heightIn ? Number(heightIn) : null,
        weight_lb: weightLb ? Number(weightLb) : null,
        age: age ? Number(age) : null,
        activity_level: activity || null,
        ethnicity: ethnicity || null,
        ethnicity_other:
          ethnicity === "Another race, ethnicity, or origin"
            ? ethnicityOther || null
            : null,
        cycle_length_days: cycleLength ? Number(cycleLength) : null,
        last_period_start: lastPeriod || null,
      });
      setMessage("Profile saved");
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function logWeight() {
    setError(null);
    if (!weightLb) {
      setError("Enter a weight first");
      return;
    }
    try {
      await api.addWeight({ weight_lb: Number(weightLb) });
      setMessage("Weight logged (maintenance will use this)");
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Weight log failed");
    }
  }

  return (
    <form className="stack" onSubmit={saveProfile}>
      <h1>Settings</h1>
      {message && <p className="ok-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}

      <section className="wire-box">
        <h2>Profile</h2>
        <label>
          Height (in)
          <input
            type="number"
            value={heightIn}
            onChange={(e) => setHeightIn(e.target.value)}
          />
        </label>
        <label>
          Weight (lb)
          <input
            type="number"
            value={weightLb}
            onChange={(e) => setWeightLb(e.target.value)}
          />
        </label>
        <button type="button" onClick={logWeight}>
          Save weight log
        </button>
        <label>
          Age
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </label>
        <label>
          Activity level
          <select
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
          >
            <option value="">Select…</option>
            {ACTIVITY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ethnicity
          <select
            value={ethnicity}
            onChange={(e) => setEthnicity(e.target.value)}
          >
            <option value="">Not set</option>
            {ETHNICITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
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
        <label>
          Cycle length (optional)
          <input
            type="number"
            value={cycleLength}
            onChange={(e) => setCycleLength(e.target.value)}
          />
        </label>
        <label>
          Last period start (optional)
          <input
            type="date"
            value={lastPeriod}
            onChange={(e) => setLastPeriod(e.target.value)}
          />
        </label>
        <button type="submit">Save profile</button>
      </section>

      <section className="wire-box">
        <h2>Insights</h2>
        <Link to="/overview" className="btn-secondary" style={{ display: "inline-block" }}>
          Open Insights overview
        </Link>
      </section>

      <section className="wire-box">
        <h2>Disclaimer</h2>
        <p>{DISCLAIMER}</p>
      </section>
    </form>
  );
}
