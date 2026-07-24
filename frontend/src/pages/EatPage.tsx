import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  api,
  todayISO,
  type FoodEntry,
  type FoodSearchPortion,
  type FoodSearchResult,
} from "../api";
import { MEAL_TYPES, type MealTypeId } from "../constants";

/** USDA names are verbose — keep up to two comma parts when useful. */
function shortenFoodName(name: string): string {
  const portionMatch = name.match(/\s*(\([^)]+\))\s*$/);
  const portion = portionMatch?.[1] ?? "";
  const base = portion ? name.slice(0, -portionMatch![0].length) : name;
  const parts = base
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return name.trim();
  let short = parts[0];
  if (parts.length > 1 && !parts[1].toLowerCase().startsWith("or ")) {
    const two = `${parts[0]}, ${parts[1]}`;
    if (two.length <= 48) short = two;
  }
  return portion ? `${short} ${portion}` : short;
}

function scaleFrom100g(
  per100: { calories: number; protein_g: number; carbs_g: number; fat_g: number },
  grams: number,
) {
  const f = grams / 100;
  return {
    calories: Math.round(per100.calories * f * 10) / 10,
    protein_g: Math.round(per100.protein_g * f * 10) / 10,
    carbs_g: Math.round(per100.carbs_g * f * 10) / 10,
    fat_g: Math.round(per100.fat_g * f * 10) / 10,
  };
}

/**
 * Food diary: meal sections with per-meal Add.
 * Search / quick-add / manual / portions open after tapping Add on a meal.
 */
export function EatPage() {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [allFoods, setAllFoods] = useState<FoodEntry[]>([]);
  const [maintenance, setMaintenance] = useState<number | null>(null);
  const [addingFor, setAddingFor] = useState<MealTypeId | null>(null);
  const [addTab, setAddTab] = useState<"search" | "manual">("search");
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [servingSize, setServingSize] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [lastSearchQ, setLastSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [picked, setPicked] = useState<FoodSearchResult | null>(null);
  const [portions, setPortions] = useState<FoodSearchPortion[]>([]);
  const [portionGrams, setPortionGrams] = useState(100);
  const [loadingPortions, setLoadingPortions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const today = todayISO();
  const mealLabel =
    MEAL_TYPES.find((m) => m.id === addingFor)?.label ?? "meal";

  async function refresh() {
    const [todayFoods, foods, home] = await Promise.all([
      api.listFoods(today),
      api.listFoods(),
      api.homeSummary(),
    ]);
    setEntries(todayFoods);
    setAllFoods(foods);
    setMaintenance(
      home.maintenance.available ? home.maintenance.maintenance : null,
    );
  }

  useEffect(() => {
    refresh().catch((e: Error) => setError(e.message));
  }, []);

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, f) => ({
        calories: acc.calories + f.calories,
        protein: acc.protein + f.protein_g,
        carbs: acc.carbs + f.carbs_g,
        fat: acc.fat + f.fat_g,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [entries]);

  const recentUnique = useMemo(() => {
    const seen = new Set<string>();
    const list: FoodEntry[] = [];
    for (const f of allFoods) {
      const key = f.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(f);
      if (list.length >= 6) break;
    }
    return list;
  }, [allFoods]);

  const byMeal = useMemo(() => {
    const groups: Record<MealTypeId, FoodEntry[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    for (const f of entries) {
      const key = (f.meal_type || "snack") as MealTypeId;
      if (key in groups) groups[key].push(f);
      else groups.snack.push(f);
    }
    return groups;
  }, [entries]);

  const scaledPreview = useMemo(() => {
    if (!picked) return null;
    const per100 = picked.per_100g ?? {
      calories: picked.calories,
      protein_g: picked.protein_g,
      carbs_g: picked.carbs_g,
      fat_g: picked.fat_g,
    };
    return scaleFrom100g(per100, portionGrams);
  }, [picked, portionGrams]);

  function resetAddPanel() {
    setSearchQ("");
    setLastSearchQ("");
    setSearchResults([]);
    setSearchAttempted(false);
    setPicked(null);
    setPortions([]);
    setPortionGrams(100);
    setQuantity(1);
    setName("");
    setServingSize("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setAddTab("search");
  }

  function openAdd(meal: MealTypeId) {
    setError(null);
    setMessage(null);
    resetAddPanel();
    setAddingFor(meal);
  }

  function closeAdd() {
    setAddingFor(null);
    resetAddPanel();
  }

  async function addEntry(payload: {
    name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    meal_type: MealTypeId;
    qty?: number;
  }) {
    setError(null);
    const qty = Math.max(1, payload.qty ?? quantity);
    const name =
      qty > 1 ? `${payload.name} ×${qty}` : payload.name;
    await api.addFood({
      name,
      calories: Math.round(payload.calories * qty * 10) / 10,
      protein_g: Math.round(payload.protein_g * qty * 10) / 10,
      carbs_g: Math.round(payload.carbs_g * qty * 10) / 10,
      fat_g: Math.round(payload.fat_g * qty * 10) / 10,
      meal_type: payload.meal_type,
      logged_on: today,
    });
    const label =
      MEAL_TYPES.find((m) => m.id === payload.meal_type)?.label ??
      payload.meal_type;
    setMessage(`Added to ${label}: ${name}`);
    await refresh();
    closeAdd();
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    if (!addingFor) return;
    const q = searchQ.trim();
    if (!q) return;
    setError(null);
    setMessage(null);
    setPicked(null);
    setLastSearchQ(q);
    setSearchAttempted(true);
    setSearching(true);
    setSearchResults([]);
    try {
      const results = await api.searchFoods(q);
      setSearchResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function selectHit(hit: FoodSearchResult) {
    setError(null);
    setLoadingPortions(true);
    try {
      let detail = hit;
      if (hit.fdc_id != null) {
        detail = await api.getFdcFood(hit.fdc_id);
      }
      const opts =
        detail.portions && detail.portions.length > 0
          ? detail.portions
          : [{ label: "100 g", grams: 100, is_default: true }];
      setPicked(detail);
      setPortions(opts);
      const def = opts.find((p) => p.is_default) ?? opts[0];
      setPortionGrams(def.grams);
      setSearchResults([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load portions");
    } finally {
      setLoadingPortions(false);
    }
  }

  async function confirmPortionAdd() {
    if (!picked || !scaledPreview || !addingFor) return;
    const portionLabel =
      portions.find((p) => p.grams === portionGrams)?.label ??
      `${portionGrams} g`;
    try {
      await addEntry({
        name: `${shortenFoodName(picked.name)} (${portionLabel})`,
        ...scaledPreview,
        meal_type: addingFor,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add failed");
    }
  }

  async function onManualSubmit(e: FormEvent) {
    e.preventDefault();
    if (!addingFor) return;
    const size = servingSize.trim();
    const labeled = size ? `${name.trim()} (${size})` : name.trim();
    try {
      await addEntry({
        name: labeled,
        calories: Number(calories) || 0,
        protein_g: Number(protein) || 0,
        carbs_g: Number(carbs) || 0,
        fat_g: Number(fat) || 0,
        meal_type: addingFor,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add failed");
    }
  }

  const pct =
    maintenance != null && maintenance > 0
      ? Math.min(100, Math.round((totals.calories / maintenance) * 100))
      : null;

  return (
    <div className="stack">
      <h1>Eat</h1>
      {message && <p className="ok-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}

      <section className="eat-surface home-calories home-calories-compact">
        <h2>Today</h2>
        <p className="calorie-count calorie-count-compact">
          {Math.round(totals.calories)}
          {maintenance != null ? (
            <span className="calorie-goal"> / {maintenance} kcal</span>
          ) : (
            <span className="calorie-goal"> kcal</span>
          )}
        </p>
        {pct != null ? (
          <div className="progress-track" role="progressbar" aria-valuenow={pct}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        ) : null}
        <p className="wire-note eat-macro-line">
          <span>Protein – {Math.round(totals.protein)} g</span>
          <span>Carbs – {Math.round(totals.carbs)} g</span>
          <span>Fat – {Math.round(totals.fat)} g</span>
        </p>
      </section>

      {addingFor ? (
        <section className="eat-surface stack eat-add-panel">
          <div className="section-head">
            <h2>Add to {mealLabel}</h2>
            <button type="button" className="text-link" onClick={closeAdd}>
              Done
            </button>
          </div>

          <div className="eat-add-tabs" role="tablist" aria-label="Add food method">
            <button
              type="button"
              role="tab"
              aria-selected={addTab === "search"}
              className={addTab === "search" ? "on" : undefined}
              onClick={() => setAddTab("search")}
            >
              Search
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={addTab === "manual"}
              className={addTab === "manual" ? "on" : undefined}
              onClick={() => setAddTab("manual")}
            >
              Manual
            </button>
          </div>

          {addTab === "search" && (
            <>
              <form className="eat-search-row" onSubmit={onSearch}>
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Search foods…"
                  aria-label="Search foods"
                  autoFocus
                />
                <button type="submit" disabled={searching || !searchQ.trim()}>
                  {searching ? "…" : "Search"}
                </button>
              </form>

              {searching && (
                <p className="wire-note eat-search-status">Searching…</p>
              )}

              {!searching &&
                searchAttempted &&
                !picked &&
                searchResults.length === 0 && (
                  <div className="eat-search-empty">
                    <p>
                      No foods found
                      {lastSearchQ ? ` for “${lastSearchQ}”` : ""}.
                    </p>
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => {
                        setAddTab("manual");
                        if (lastSearchQ) setName(lastSearchQ);
                      }}
                    >
                      Add manually instead
                    </button>
                  </div>
                )}

              {recentUnique.length > 0 && !picked && !searching && (
                <div className="eat-quick-add">
                  <p className="wire-note eat-quick-label">Quick-add</p>
                  <div className="chip-row">
                    {recentUnique.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className="chip"
                        onClick={() =>
                          addEntry({
                            name: f.name,
                            calories: f.calories,
                            protein_g: f.protein_g,
                            carbs_g: f.carbs_g,
                            fat_g: f.fat_g,
                            meal_type: addingFor,
                          }).catch((e: Error) => setError(e.message))
                        }
                      >
                        {f.name} ({Math.round(f.calories)})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loadingPortions && (
                <p className="wire-note">Loading portions…</p>
              )}

              {!searching && searchResults.length > 0 && !picked && (
                <ul className="food-search-list food-search-scroll">
                  {searchResults.map((hit) => (
                    <li key={hit.fdc_id ?? hit.name}>
                      <button
                        type="button"
                        className="linkish food-search-hit"
                        onClick={() => selectHit(hit)}
                      >
                        <span className="food-search-name">
                          {shortenFoodName(hit.name)}
                        </span>
                        <span className="wire-note">
                          {Math.round(hit.calories)} kcal / 100 g
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {picked && scaledPreview && (
                <div className="eat-portion-panel stack">
                  <p className="food-search-name">
                    {shortenFoodName(picked.name)}
                  </p>
                  <div className="eat-portion-fields">
                    <label>
                      Portion
                      <select
                        value={String(portionGrams)}
                        onChange={(e) =>
                          setPortionGrams(Number(e.target.value))
                        }
                      >
                        {portions.map((p) => (
                          <option
                            key={`${p.label}-${p.grams}`}
                            value={p.grams}
                          >
                            {p.label} ({p.grams} g)
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Servings
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={quantity}
                        onChange={(e) =>
                          setQuantity(
                            Math.max(
                              1,
                              Math.round(Number(e.target.value) || 1),
                            ),
                          )
                        }
                      />
                    </label>
                  </div>
                  <p className="wire-note eat-macro-line">
                    <span>
                      {Math.round(scaledPreview.calories * quantity)} kcal
                    </span>
                    <span>
                      Protein –{" "}
                      {Math.round(scaledPreview.protein_g * quantity)} g
                    </span>
                    <span>
                      Carbs – {Math.round(scaledPreview.carbs_g * quantity)} g
                    </span>
                    <span>
                      Fat – {Math.round(scaledPreview.fat_g * quantity)} g
                    </span>
                  </p>
                  <div className="eat-portion-actions">
                    <button type="button" onClick={confirmPortionAdd}>
                      Add to {mealLabel}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setPicked(null);
                        setPortions([]);
                      }}
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {addTab === "manual" && (
            <form className="stack" onSubmit={onManualSubmit}>
              <label>
                Name
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <div className="eat-portion-fields">
                <label>
                  1 serving is
                  <input
                    type="text"
                    value={servingSize}
                    placeholder="e.g. 1 cup, 100 g"
                    onChange={(e) => setServingSize(e.target.value)}
                  />
                </label>
                <label>
                  Servings
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(
                        Math.max(1, Math.round(Number(e.target.value) || 1)),
                      )
                    }
                  />
                </label>
              </div>
              <p className="wire-note">Macros below are for 1 serving</p>
              <div className="eat-macro-grid">
                <label>
                  Calories
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                  />
                </label>
                <label>
                  Protein (g)
                  <input
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                  />
                </label>
                <label>
                  Carbs (g)
                  <input
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                  />
                </label>
                <label>
                  Fat (g)
                  <input
                    type="number"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                  />
                </label>
              </div>
              <button type="submit">Add to {mealLabel}</button>
            </form>
          )}
        </section>
      ) : (
        <section className="eat-surface stack eat-diary">
          <h2>Food diary</h2>
          {MEAL_TYPES.map((m) => {
            const list = byMeal[m.id];
            const mealCals = list.reduce((s, f) => s + f.calories, 0);
            return (
              <div key={m.id} className="eat-meal-block">
                <div className="eat-meal-heading">
                  <h3>{m.label}</h3>
                  <span className="wire-note">
                    {list.length === 0 ? "–" : `${Math.round(mealCals)} kcal`}
                  </span>
                </div>
                {list.length === 0 ? (
                  <p className="wire-note eat-meal-empty">No items</p>
                ) : (
                  <ul className="eat-meal-list">
                    {list.map((f) => (
                      <li key={f.id}>
                        <span>
                          {shortenFoodName(f.name)} – {Math.round(f.calories)}{" "}
                          kcal
                        </span>
                        <button
                          type="button"
                          className="linkish"
                          onClick={() =>
                            api
                              .deleteFood(f.id)
                              .then(refresh)
                              .catch((e: Error) => setError(e.message))
                          }
                        >
                          delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  className="eat-meal-add"
                  onClick={() => openAdd(m.id)}
                >
                  + Add food
                </button>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
