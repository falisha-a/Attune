import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api, type User } from "./api";
import { AppLayout } from "./components/AppLayout";
import { EatPage } from "./pages/EatPage";
import { HomePage } from "./pages/HomePage";
import { MoodPage } from "./pages/MoodPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { OverviewPage } from "./pages/OverviewPage";
import { PeriodPage } from "./pages/PeriodPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SleepPage } from "./pages/SleepPage";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshUser() {
    const u = await api.getUser();
    setUser(u);
    return u;
  }

  useEffect(() => {
    refreshUser()
      .catch((e: Error) =>
        setError(
          e.message ||
            "Cannot reach API. Is the backend running on port 8000?",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="onboarding">
        <p>Loading Attune…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="onboarding">
        <h1>Backend not reachable</h1>
        <p className="wire-note">{error}</p>
        <p className="wire-note">
          In a terminal:{" "}
          <code>
            cd backend; .\.venv\Scripts\Activate.ps1; uvicorn app.main:app
            --reload --port 8000
          </code>
        </p>
        <button type="button" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  if (!user?.onboarded) {
    return (
      <OnboardingPage
        onComplete={async () => {
          await refreshUser();
        }}
      />
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/sleep" element={<SleepPage />} />
        <Route path="/period" element={<PeriodPage />} />
        <Route path="/eat" element={<EatPage />} />
        <Route path="/mood" element={<MoodPage />} />
        <Route
          path="/settings"
          element={
            <SettingsPage
              user={user}
              onSaved={async () => {
                await refreshUser();
              }}
            />
          }
        />
        <Route path="/overview" element={<OverviewPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
