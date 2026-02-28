import type { Task } from "@/types";

// ── Date helpers ──────────────────────────────────────────────────

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return dateKey(d);
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Time formatting ───────────────────────────────────────────────

/** "14:30" → "2:30p" */
export function fmt12(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "p" : "a";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${ampm}`;
}

/** "09:00" + "10:30" → "9:00a–10:30a" */
export function fmtRange(start: string | null, end: string | null): string {
  if (!start) return "";
  return end ? `${fmt12(start)}–${fmt12(end)}` : fmt12(start);
}

/** Returns duration in minutes, or null if not computable */
export function durMins(
  start: string | null,
  end: string | null
): number | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  return mins > 0 ? mins : null;
}

/** 90 → "1h30m", 60 → "1h", 45 → "45m" */
export function fmtDur(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h${m}m`;
}

// ── Task sorting ──────────────────────────────────────────────────

/**
 * Sort key: dated tasks by date+startTime, undated tasks last (alpha).
 */
export function taskSortKey(t: Task): string {
  if (!t.date) return `z_${t.title.toLowerCase()}`;
  return `${t.date}_${t.startTime ?? "23:59"}`;
}

/**
 * Sort tasks for the list view: pending first, sorted chronologically,
 * then done tasks at the bottom.
 */
export function sortTasksForList(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const ka = taskSortKey(a);
    const kb = taskSortKey(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

/**
 * Sort tasks within a day by startTime (untimed last).
 */
export function sortTasksForDay(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (!a.startTime && !b.startTime) return 0;
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return a.startTime.localeCompare(b.startTime);
  });
}

/**
 * Build a map of dateKey → sorted Task[] for calendar views.
 */
export function buildTaskMap(tasks: Task[]): Record<string, Task[]> {
  const map: Record<string, Task[]> = {};
  for (const t of tasks) {
    if (!t.date) continue;
    if (!map[t.date]) map[t.date] = [];
    map[t.date].push(t);
  }
  for (const key of Object.keys(map)) {
    map[key] = sortTasksForDay(map[key]);
  }
  return map;
}

// ── Calendar navigation ───────────────────────────────────────────

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Get the focus date given calMode + offset from today */
export function getFocusDate(
  mode: "day" | "week" | "month",
  offset: number
): Date {
  const d = today();
  if (mode === "day") d.setDate(d.getDate() + offset);
  else if (mode === "week") d.setDate(d.getDate() + offset * 7);
  else d.setMonth(d.getMonth() + offset);
  return d;
}

/** Get the Sunday-starting week containing `d` */
export function getWeekDays(d: Date): Date[] {
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

// ── Misc ──────────────────────────────────────────────────────────

export function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
