import type { ProteinDay } from "@/types";
import { dateKey } from "@/lib/utils";

export const DEFAULT_PROTEIN_GOAL_GRAMS = 150;

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_REASONABLE_GRAMS = 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string" || !DATE_KEY_RE.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return dateKey(parsed) === value ? value : null;
}

function normalizeWholeNumber(value: unknown, fallback: number): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return fallback;

  return Math.min(MAX_REASONABLE_GRAMS, Math.max(0, Math.round(numberValue)));
}

function readTimestamp(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return Date.now();
}

export function normalizeProteinDay(value: unknown): ProteinDay | null {
  if (!isRecord(value)) return null;

  const date = normalizeDate(value.date ?? value.date_key);
  if (!date) return null;

  return {
    date,
    grams: normalizeWholeNumber(value.grams, 0),
    goalGrams: normalizeWholeNumber(
      value.goalGrams ?? value.goal_grams,
      DEFAULT_PROTEIN_GOAL_GRAMS,
    ),
    updatedAt: readTimestamp(value.updatedAt ?? value.updated_at),
  };
}

export function normalizeProteinDays(value: unknown): ProteinDay[] {
  if (!Array.isArray(value)) return [];

  const byDate = new Map<string, ProteinDay>();

  for (const item of value) {
    const day = normalizeProteinDay(item);
    if (!day) continue;

    const current = byDate.get(day.date);
    if (!current || day.updatedAt >= current.updatedAt) {
      byDate.set(day.date, day);
    }
  }

  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export function getProteinDay(days: ProteinDay[], date: string): ProteinDay {
  return (
    days.find((day) => day.date === date) ?? {
      date,
      grams: 0,
      goalGrams: DEFAULT_PROTEIN_GOAL_GRAMS,
      updatedAt: Date.now(),
    }
  );
}

export function upsertProteinDay(
  days: ProteinDay[],
  date: string,
  values: Partial<Pick<ProteinDay, "grams" | "goalGrams">>,
): ProteinDay[] {
  const existing = getProteinDay(days, date);
  const next = normalizeProteinDay({
    ...existing,
    ...values,
    date,
    updatedAt: Date.now(),
  });

  if (!next) return days;

  return normalizeProteinDays([
    ...days.filter((day) => day.date !== date),
    next,
  ]);
}
