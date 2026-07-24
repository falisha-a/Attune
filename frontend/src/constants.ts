export const MEAL_TYPES = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snacks" },
] as const;

export type MealTypeId = (typeof MEAL_TYPES)[number]["id"];

export const ACTIVITY_LEVELS = [
  "Sedentary",
  "Light",
  "Moderate",
  "Active",
  "Very active",
] as const;

/** Category names only in UI (ethnicity A). Risk notes are for AI context later — not shown here. */
export const ETHNICITY_OPTIONS = [
  "American Indian or Alaska Native",
  "Asian",
  "East Asian (Chinese, Japanese, Korean)",
  "South Asian (Indian, Pakistani)",
  "Southeast Asian (Filipino, Vietnamese)",
  "Black or African American",
  "Hispanic or Latino (Mexican, Puerto Rican, Cuban, Central/South American)",
  "Middle Eastern or North African (MENA)",
  "Native Hawaiian or Other Pacific Islander",
  "White (European, Caucasian)",
  "Another race, ethnicity, or origin",
  "Prefer not to say",
] as const;

/** Full pool (history / fallback). Word cloud uses MOOD_WORDS_BY_RATING. */
export const MOOD_WORDS = [
  "fatigued",
  "anxious",
  "calm",
  "energetic",
  "confident",
  "happy",
  "focused",
  "foggy",
  "irritable",
  "sad",
  "restless",
  "motivated",
  "overwhelmed",
  "grateful",
  "hopeful",
  "playful",
  "proud",
  "loved",
  "relaxed",
] as const;

/**
 * Words shown after rating 1–5. Draft from existing pool — owner can edit.
 * Overlap across levels is intentional.
 */
export const MOOD_WORDS_BY_RATING: Record<1 | 2 | 3 | 4 | 5, readonly string[]> =
  {
    1: [
      "sad",
      "fatigued",
      "anxious",
      "overwhelmed",
      "irritable",
      "foggy",
      "restless",
      "hopeful",
    ],
    2: [
      "fatigued",
      "anxious",
      "foggy",
      "irritable",
      "restless",
      "overwhelmed",
      "sad",
      "calm",
    ],
    3: [
      "calm",
      "focused",
      "foggy",
      "restless",
      "fatigued",
      "hopeful",
      "relaxed",
      "motivated",
      "anxious",
    ],
    4: [
      "happy",
      "calm",
      "focused",
      "motivated",
      "grateful",
      "confident",
      "relaxed",
      "energetic",
      "hopeful",
    ],
    5: [
      "happy",
      "energetic",
      "confident",
      "playful",
      "proud",
      "loved",
      "grateful",
      "motivated",
      "relaxed",
      "hopeful",
    ],
  };

export const PERIOD_SYMPTOMS = [
  "cramps",
  "bloating",
  "headache",
  "fatigue",
  "backache",
  "nausea",
  "tender breasts",
  "acne",
  "appetite change",
] as const;

