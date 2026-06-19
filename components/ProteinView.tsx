"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ProteinDay } from "@/types";
import {
  DEFAULT_PROTEIN_GOAL_GRAMS,
  getProteinDay,
  normalizeProteinDays,
  upsertProteinDay,
} from "@/lib/protein";
import { dateKey, DAY_NAMES, MONTH_SHORT, parseDate, todayKey } from "@/lib/utils";

const API_URL = "/api/protein";
const LOCAL_PROTEIN_KEY = "flow:protein:v1";
const SAVE_DELAY_MS = 600;
const QUICK_ADD_GRAMS = [10, 20, 25, 30, 40, 50];

type RemoteStore = "supabase" | "memory";
type ProteinSyncState = "loading" | "saving" | "synced" | "local" | "error";

interface ProteinResponse {
  days: unknown;
  store?: RemoteStore;
}

interface ProteinSnapshot {
  days: ProteinDay[];
  store: RemoteStore | null;
}

function isDurableStore(store: RemoteStore | null): boolean {
  return store === "supabase";
}

function loadLocalProteinDays(): ProteinDay[] {
  if (typeof window === "undefined") return [];

  try {
    const rawDays = window.localStorage.getItem(LOCAL_PROTEIN_KEY);
    return rawDays ? normalizeProteinDays(JSON.parse(rawDays)) : [];
  } catch {
    try {
      window.localStorage.removeItem(LOCAL_PROTEIN_KEY);
    } catch {
      // Ignore browsers that block all localStorage access.
    }
    return [];
  }
}

function saveLocalProteinDays(days: ProteinDay[]): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      LOCAL_PROTEIN_KEY,
      JSON.stringify(normalizeProteinDays(days)),
    );
  } catch {
    // Remote sync can still succeed if browser storage is unavailable.
  }
}

async function fetchProteinDays(signal: AbortSignal): Promise<ProteinSnapshot> {
  const response = await fetch(API_URL, { cache: "no-store", signal });
  if (!response.ok)
    throw new Error(`Failed to load protein days (${response.status})`);

  const payload = (await response.json()) as ProteinResponse;
  return {
    days: normalizeProteinDays(payload.days),
    store: payload.store ?? null,
  };
}

async function persistProteinDays(days: ProteinDay[]): Promise<RemoteStore | null> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ days: normalizeProteinDays(days) }),
  });

  if (!response.ok)
    throw new Error(`Failed to save protein days (${response.status})`);

  const payload = (await response.json()) as Partial<ProteinResponse>;
  return payload.store ?? null;
}

function formatDateLabel(dayKey: string): string {
  const day = parseDate(dayKey);
  return `${DAY_NAMES[day.getDay()]}, ${MONTH_SHORT[day.getMonth()]} ${day.getDate()}`;
}

function shiftDate(dayKey: string, delta: number): string {
  const day = parseDate(dayKey);
  day.setDate(day.getDate() + delta);
  return dateKey(day);
}

function toNumber(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed);
}

export default function ProteinView() {
  const [days, setDays] = useState<ProteinDay[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [entryGrams, setEntryGrams] = useState("");
  const [goalInput, setGoalInput] = useState(String(DEFAULT_PROTEIN_GOAL_GRAMS));
  const [syncState, setSyncState] = useState<ProteinSyncState>("loading");

  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteStore = useRef<RemoteStore | null>(null);

  const currentDay = useMemo(
    () => getProteinDay(days, selectedDate),
    [days, selectedDate],
  );

  const recentDays = useMemo(() => {
    const daysToShow: ProteinDay[] = [];
    for (let offset = 0; offset < 7; offset += 1) {
      daysToShow.push(getProteinDay(days, shiftDate(todayKey(), -offset)));
    }
    return daysToShow;
  }, [days]);

  const progress = Math.min(100, Math.round((currentDay.grams / currentDay.goalGrams) * 100));
  const remaining = Math.max(0, currentDay.goalGrams - currentDay.grams);

  useEffect(() => {
    setGoalInput(String(currentDay.goalGrams));
  }, [currentDay.goalGrams, selectedDate]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function hydrateProteinDays() {
      setSyncState("loading");

      const localDays = loadLocalProteinDays();
      if (localDays.length > 0) {
        setDays(localDays);
      }

      try {
        const snapshot = await fetchProteinDays(controller.signal);
        if (cancelled) return;

        remoteStore.current = snapshot.store;

        const shouldKeepLocalDays = localDays.length > 0 && snapshot.days.length === 0;
        const nextDays = shouldKeepLocalDays ? localDays : snapshot.days;

        setDays(nextDays);
        saveLocalProteinDays(nextDays);

        if (shouldKeepLocalDays && isDurableStore(snapshot.store)) {
          remoteStore.current = await persistProteinDays(localDays);
        }

        if (!cancelled) {
          setSyncState(isDurableStore(remoteStore.current) ? "synced" : "local");
        }
      } catch {
        if (!cancelled && !controller.signal.aborted) {
          setSyncState(localDays.length > 0 ? "local" : "error");
        }
      } finally {
        if (!cancelled) hydrated.current = true;
      }
    }

    hydrateProteinDays();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;

    saveLocalProteinDays(days);

    if (remoteStore.current === "memory") {
      setSyncState("local");
      return;
    }

    setSyncState("saving");

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persistProteinDays(days)
        .then((store) => {
          remoteStore.current = store;
          setSyncState(isDurableStore(store) ? "synced" : "local");
        })
        .catch(() => setSyncState("local"));
    }, SAVE_DELAY_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [days]);

  function updateSelectedDay(values: Partial<Pick<ProteinDay, "grams" | "goalGrams">>) {
    setDays((previous) => upsertProteinDay(previous, selectedDate, values));
  }

  function addProtein(amount: number) {
    updateSelectedDay({ grams: currentDay.grams + amount });
  }

  function submitEntry() {
    const amount = toNumber(entryGrams);
    if (!amount) return;

    addProtein(amount);
    setEntryGrams("");
  }

  function saveGoal() {
    const goal = toNumber(goalInput);
    if (!goal) {
      setGoalInput(String(currentDay.goalGrams));
      return;
    }

    updateSelectedDay({ goalGrams: goal });
  }

  return (
    <div className="protein-view">
      <div className="protein-header">
        <div>
          <div className="protein-kicker">protein</div>
          <div className="protein-date">{formatDateLabel(selectedDate)}</div>
        </div>
        <div className={`protein-sync protein-sync--${syncState}`}>{syncState}</div>
      </div>

      <div className="protein-nav">
        <button className="protein-nav-btn" onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}>
          ‹
        </button>
        <input
          className="protein-date-input"
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value || todayKey())}
        />
        <button className="protein-nav-btn" onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}>
          ›
        </button>
        <button className="protein-today-btn" onClick={() => setSelectedDate(todayKey())}>
          today
        </button>
      </div>

      <div className="protein-card">
        <div className="protein-total-row">
          <div>
            <span className="protein-total">{currentDay.grams}</span>
            <span className="protein-unit">g</span>
          </div>
          <div className="protein-goal">
            / {currentDay.goalGrams}g goal
          </div>
        </div>
        <div className="protein-progress">
          <div className="protein-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="protein-remaining">
          {remaining === 0 ? "goal hit" : `${remaining}g remaining`}
        </div>
      </div>

      <div className="protein-entry-row">
        <input
          className="protein-input"
          type="number"
          min="1"
          inputMode="numeric"
          placeholder="grams"
          value={entryGrams}
          onChange={(event) => setEntryGrams(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && submitEntry()}
        />
        <button className="protein-add-btn" onClick={submitEntry}>
          + add
        </button>
      </div>

      <div className="protein-quick-row">
        {QUICK_ADD_GRAMS.map((grams) => (
          <button key={grams} className="protein-chip" onClick={() => addProtein(grams)}>
            +{grams}g
          </button>
        ))}
      </div>

      <div className="protein-settings-row">
        <label className="protein-label" htmlFor="protein-goal">
          daily goal
        </label>
        <input
          id="protein-goal"
          className="protein-goal-input"
          type="number"
          min="1"
          inputMode="numeric"
          value={goalInput}
          onChange={(event) => setGoalInput(event.target.value)}
          onBlur={saveGoal}
          onKeyDown={(event) => event.key === "Enter" && saveGoal()}
        />
        <span className="protein-goal-unit">g</span>
      </div>

      <div className="protein-history">
        <div className="protein-history-title">last 7 days</div>
        {recentDays.map((day) => {
          const dayProgress = Math.min(100, Math.round((day.grams / day.goalGrams) * 100));
          return (
            <button
              key={day.date}
              className={`protein-history-row${day.date === selectedDate ? " protein-history-row--active" : ""}`}
              onClick={() => setSelectedDate(day.date)}
            >
              <span>{formatDateLabel(day.date)}</span>
              <span>{day.grams}/{day.goalGrams}g</span>
              <span className="protein-history-bar">
                <span style={{ width: `${dayProgress}%` }} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
