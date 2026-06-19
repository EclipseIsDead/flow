import type { Subtask, Task, TaskFormValues } from "@/types";
import { dateKey, newId, todayKey } from "@/lib/utils";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DEFAULT_TASK_START_TIME = "09:00";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readTimestamp(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : Date.now();
}

export function normalizeDateKey(value: unknown): string | null {
  const candidate = readString(value);
  if (!DATE_KEY_RE.test(candidate)) return null;

  const [year, month, day] = candidate.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return dateKey(parsed) === candidate ? candidate : null;
}

export function normalizeTime(value: unknown): string | null {
  const candidate = readString(value);
  return TIME_RE.test(candidate) ? candidate : null;
}

export function taskFieldsFromForm(
  values: TaskFormValues,
): Pick<Task, "title" | "date" | "startTime" | "endTime"> {
  return {
    title: values.title.trim(),
    date: normalizeDateKey(values.date) ?? todayKey(),
    startTime: normalizeTime(values.startTime) ?? DEFAULT_TASK_START_TIME,
    endTime: normalizeTime(values.endTime),
  };
}

export function createTask(values: TaskFormValues): Task {
  return {
    id: newId(),
    ...taskFieldsFromForm(values),
    done: false,
    subtasks: [],
    createdAt: Date.now(),
  };
}

export function createSubtask(title: string): Subtask | null {
  const cleanTitle = title.trim();
  if (!cleanTitle) return null;

  return {
    id: newId(),
    title: cleanTitle,
    done: false,
  };
}

function normalizeSubtask(value: unknown): Subtask | null {
  if (!isRecord(value)) return null;

  const title = readString(value.title);
  if (!title) return null;

  return {
    id: readString(value.id) || newId(),
    title,
    done: value.done === true,
  };
}

export function normalizeTask(value: unknown): Task | null {
  if (!isRecord(value)) return null;

  const title = readString(value.title);
  if (!title) return null;

  const subtasks = Array.isArray(value.subtasks)
    ? value.subtasks.flatMap((subtask) => {
        const normalized = normalizeSubtask(subtask);
        return normalized ? [normalized] : [];
      })
    : [];

  return {
    id: readString(value.id) || newId(),
    title,
    date: normalizeDateKey(value.date) ?? todayKey(),
    startTime: normalizeTime(value.startTime) ?? DEFAULT_TASK_START_TIME,
    endTime: normalizeTime(value.endTime),
    done: value.done === true,
    subtasks,
    createdAt: readTimestamp(value.createdAt),
  };
}

export function normalizeTasks(value: unknown): Task[] {
  if (!Array.isArray(value)) return [];

  const seenIds = new Set<string>();

  return value.flatMap((taskLike) => {
    const task = normalizeTask(taskLike);
    if (!task) return [];

    if (seenIds.has(task.id)) {
      task.id = newId();
    }

    seenIds.add(task.id);
    return [task];
  });
}
