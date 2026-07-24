---
name: attune-ui
description: >-
  Attune app UI/UX rules for Home, Sleep, Period, Mood, Eat, and navigation.
  Use when designing, redesigning, or implementing Attune frontend screens,
  layout, styling, or interaction flows — or when the user mentions Attune UI,
  Flo-like period circle, sleep button, mood walkthrough, or home check-in.
---

# Attune UI

Follow these product UI rules. Prefer asking the user over inventing new patterns.
When redesigning, iterate with the user. Keep CONTINUITY.md and FOR_FUTURE_AGENTS.md updated for chat handoff.

## Global

- Calm, light blue/green/near-white palette. Soft atmosphere OK. Avoid purple gradients, cream+terracotta serif clichés, Flo-style clutter/popups.
- Typography: expressive non-default fonts (current: Outfit + Figtree). Avoid Inter/Roboto/Arial/system stacks.
- Bottom nav: Sleep · Period · **Home** (center, circled/raised) · Eat · Mood. Settings = quiet top-right control (☰), not a heavy top bar.
- Hover/focus should feel responsive (light lift). Optional short `title` tooltips on nav. Do not copy another app wholesale; Mio is feel-inspiration only.
- Icons: simple placeholders until user Figma assets arrive; swap then.
- Ask before inventing labels, flows, or visual patterns not listed here.

## Home

**Keep**
- 7-day calorie chart/sparkline (can be compact / secondary)
- Today’s calories vs maintenance (prefer a **progress bar**, not only plain text)

**Layout (locked direction)**
- Primary: **Today’s check-in** — mood · sleep · food (done vs open), not a chip row
- Secondary: compact calorie strip + sparkline (Home is not a second Eat page)
- Soft greeting / date OK; no phase badge above the title

**Avoid / change**
- Do **not** put cycle phase text (“Day 17 · luteal”) above the Home title as a header badge
- Phase may appear quietly elsewhere later only if user asks
- “Today’s check-in” chip row feels wrong — use a quiet list instead
- Equal summary cards that feel like a generic dashboard — avoid

## Sleep

- Primary focus: **one large button**
  - First tap = going to sleep
  - Same button = I’m awake
- Supporting controls (editable times, manual log, description) are secondary, not competing with the big button
- Still enforce one open session; manual log remains available if they never tapped start

## Period

- Visual inspiration: **Flo-like circular** cycle UI (ring/circle as main focus)
- Keep logging: start/end, flow (light/medium/heavy), cramps, bloating
- Do not make Period the whole-app hero; Home stays non-period-first
- **Log sheet:** after **Period started today** (or **Log today**), open a slide-up sheet for flow / feelings / Save / Ended — do not swap a dense inline form under the ring
- Main screen stays calm: ring + status (`Started today` / `On period since 7/20`) + Log today
- Success toasts auto-dismiss (~2s)
- No white `wire-box` cards on Period (transparent surfaces)

## Mood

Two modes on the Mood tab:

1. **Log walkthrough**
   - Screen 1: “What was your mood for today?” — **tap one of five faces** (1–5), not a slider
   - No text labels / descriptions under the faces (faces only)
   - **Next** (and Save/Skip/Update) uses a **slide animation** between screens — not finger-drag swipe
   - Screen 2: **oval word cloud** (Qualtrics-like silhouette) — blue→green gradient chips, white text; roughly same chip size; hover/selected grow and **selected stays enlarged**
   - Layout: **hand-placed** slots in `MoodPage.tsx` (`CLOUD_LAYOUTS` for 8/9/10) — do **not** reintroduce auto-packers; longer words prefer **center** slots when they fit without overlap; don’t crush spacing again after owner approval
   - Walkthrough prompts + history review: **no white `wire-box` cards** for now (transparent `mood-prompt`) — experiment; may bring cards back
   - Word list depends on the **face rating** (`MOOD_WORDS_BY_RATING` in `constants.ts`)
   - No note field; **Skip** top-right; Save below cloud
   - **Custom word:** long-press empty space around/in the cloud stage → type-in bubble → Enter/blur adds chip (selected); tap chip to toggle; saves with mood words
2. **History view**
   - Last **7 days** of mood, each day shown with a soft Attune-colored face reflecting overall mood
   - After logging (or when already logged today), show this 7-day view as the main Mood surface
   - Faces: soft circle heads, cooler blue → greener by rating; pill eyes + mouth (not flat black / no yellow emoji)
   - Scale: 1 sad · 2 low · 3 neutral · 4 smile · 5 open grin
   - No Low/Good/etc. text under today’s face — face + selected words only
   - Extra gap between Today and Last 7 days

Word lists are draft subsets of the pool (edit with owner): fatigued, anxious, calm, energetic, confident, happy, focused, foggy, irritable, sad, restless, motivated, overwhelmed, grateful, hopeful, playful, proud, loved, relaxed.

## Eat

- Manual entry + quick-add recent remain
- Food DB search when that step is in progress
- Meal assignment: MyFitnessPal-style diary — each meal has **+ Add food** (search / quick-add / manual / portions open for that meal only)
- Today’s entries grouped by meal; USDA portion picker (scale from 100g); results short + scrollable
- Insights overview (`/overview`) only via Settings (not bottom nav); chat history persisted
- Totals vs maintenance should stay clear; can align visually with Home progress bar language

## AI panel

- Bottom-right circular entry; chat panel
- Confidence tiers are product logic (cycles 1–2 blocked, 3–5 hedged, 6+ confident) — UI should not fake confident insights early

## Process

1. If redesigning, summarize which screens will change and wait for user OK if anything is ambiguous.
2. Implement only requested screens; don’t “refresh” unrelated pages.
3. After visual changes, check mobile width and bottom-nav overlap.
