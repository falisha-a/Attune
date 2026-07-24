const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type User = {
  id: number;
  height_in: number | null;
  weight_lb: number | null;
  age: number | null;
  activity_level: string | null;
  ethnicity: string | null;
  ethnicity_other: string | null;
  cycle_length_days: number | null;
  last_period_start: string | null;
  disclaimer_accepted: boolean;
  onboarded: boolean;
};

export type HomeSummary = {
  phase: {
    available: boolean;
    cycle_day: number | null;
    phase: string | null;
    cycle_length_days: number | null;
    last_period_start: string | null;
    using_default_length?: boolean;
  };
  calories_today: number;
  maintenance: {
    available: boolean;
    bmr: number | null;
    maintenance: number | null;
    activity_level: string | null;
  };
  last_sleep: SleepLog | null;
  todays_mood: MoodLog | null;
  cycles_logged: number;
  ai_confidence_tier: string;
};

export type FoodEntry = {
  id: number;
  logged_on: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_type: string;
};

export type FoodSearchPortion = {
  label: string;
  grams: number;
  is_default: boolean;
};

export type FoodSearchResult = {
  fdc_id: number | null;
  name: string;
  data_type: string | null;
  serving_hint: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  per_100g?: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  } | null;
  portions?: FoodSearchPortion[];
};

export type AiChatResponse = {
  tier: string;
  cycles_logged: number;
  reply: string;
};

export type AiMessage = {
  id: number;
  role: string;
  content: string;
  created_at: string;
};

export type AiHistory = {
  tier: string;
  cycles_logged: number;
  messages: AiMessage[];
};

export type SleepLog = {
  id: number;
  bedtime: string;
  wake_time: string | null;
  description: string | null;
  is_open: boolean;
  duration_hours: number | null;
};

export type PeriodLog = {
  id: number;
  start_date: string;
  end_date: string | null;
  flow: string | null;
  cramps: boolean;
  bloating: boolean;
  symptoms: string[];
};

export type MoodLog = {
  id: number;
  logged_on: string;
  overall: number;
  words: string[];
  note: string | null;
};

export type WeightLog = {
  id: number;
  logged_on: string;
  weight_lb: number;
};

export const api = {
  getUser: () => request<User>("/api/user"),
  updateUser: (body: Partial<User>) =>
    request<User>("/api/user", { method: "PUT", body: JSON.stringify(body) }),
  onboard: (body: Record<string, unknown>) =>
    request<User>("/api/onboarding", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  homeSummary: () => request<HomeSummary>("/api/home/summary"),
  listFoods: (day?: string) =>
    request<FoodEntry[]>(day ? `/api/foods?day=${day}` : "/api/foods"),
  searchFoods: (q: string) =>
    request<FoodSearchResult[]>(
      `/api/foods/search?q=${encodeURIComponent(q)}`,
    ),
  getFdcFood: (fdcId: number) =>
    request<FoodSearchResult>(`/api/foods/fdc/${fdcId}`),
  addFood: (body: Record<string, unknown>) =>
    request<FoodEntry>("/api/foods", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteFood: (id: number) =>
    request<{ ok: boolean }>(`/api/foods/${id}`, { method: "DELETE" }),
  aiChat: (message: string) =>
    request<AiChatResponse>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  aiTier: () =>
    request<{ cycles_logged: number; tier: string }>("/api/ai/tier"),
  aiHistory: () => request<AiHistory>("/api/ai/history"),
  clearAiHistory: () =>
    request<{ ok: boolean; deleted: number }>("/api/ai/history", {
      method: "DELETE",
    }),
  listSleep: () => request<SleepLog[]>("/api/sleep"),
  openSleep: () => request<SleepLog | null>("/api/sleep/open"),
  startSleep: (body: Record<string, unknown> = {}) =>
    request<SleepLog>("/api/sleep/start", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  wakeSleep: (body: Record<string, unknown>) =>
    request<SleepLog>("/api/sleep/wake", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  manualSleep: (body: Record<string, unknown>) =>
    request<SleepLog>("/api/sleep/manual", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listPeriods: () => request<PeriodLog[]>("/api/periods"),
  addPeriod: (body: Record<string, unknown>) =>
    request<PeriodLog>("/api/periods", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updatePeriod: (id: number, body: Record<string, unknown>) =>
    request<PeriodLog>(`/api/periods/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  listMoods: () => request<MoodLog[]>("/api/moods"),
  addMood: (body: Record<string, unknown>) =>
    request<MoodLog>("/api/moods", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listWeights: () => request<WeightLog[]>("/api/weights"),
  addWeight: (body: Record<string, unknown>) =>
    request<WeightLog>("/api/weights", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export function todayISO() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  // Local calendar date (NOT UTC) — avoids timezone day-shift bugs
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** datetime-local value from a Date or ISO string */
export function toLocalInputValue(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
