"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { normalizeTasks } from "@/lib/tasks";
import type { Task } from "@/types";

const API_URL = "/api/tasks";
const LOCAL_TASKS_KEY = "flow:tasks:v1";
const SAVE_DELAY_MS = 600;

interface TasksResponse {
  tasks: unknown;
}

function loadLocalTasks(): Task[] {
  if (typeof window === "undefined") return [];

  try {
    const rawTasks = window.localStorage.getItem(LOCAL_TASKS_KEY);
    return rawTasks ? normalizeTasks(JSON.parse(rawTasks)) : [];
  } catch {
    try {
      window.localStorage.removeItem(LOCAL_TASKS_KEY);
    } catch {
      // Ignore browsers that block all localStorage access.
    }
    return [];
  }
}

function saveLocalTasks(tasks: Task[]): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
  } catch {
    // Remote sync can still succeed if browser storage is unavailable.
  }
}

async function fetchTasks(signal: AbortSignal): Promise<Task[]> {
  const response = await fetch(API_URL, { cache: "no-store", signal });
  if (!response.ok)
    throw new Error(`Failed to load tasks (${response.status})`);

  const payload = (await response.json()) as TasksResponse;
  return normalizeTasks(payload.tasks);
}

async function persistTasks(tasks: Task[]): Promise<void> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tasks }),
  });

  if (!response.ok)
    throw new Error(`Failed to save tasks (${response.status})`);
}

export default function TaskSync() {
  const { state, actions } = useApp();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function hydrateTasks() {
      actions.setSyncState("loading");

      const localTasks = loadLocalTasks();
      if (localTasks.length > 0) {
        actions.setTasks(localTasks);
      }

      try {
        const remoteTasks = await fetchTasks(controller.signal);
        if (cancelled) return;

        const shouldKeepLocalTasks =
          localTasks.length > 0 && remoteTasks.length === 0;
        const tasks = shouldKeepLocalTasks ? localTasks : remoteTasks;

        actions.setTasks(tasks);
        saveLocalTasks(tasks);

        if (shouldKeepLocalTasks) {
          await persistTasks(localTasks);
        }

        if (!cancelled) actions.setSyncState("synced");
      } catch {
        if (!cancelled && !controller.signal.aborted) {
          actions.setSyncState(localTasks.length > 0 ? "local" : "error");
        }
      } finally {
        if (!cancelled) hydrated.current = true;
      }
    }

    hydrateTasks();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [actions]);

  useEffect(() => {
    if (!hydrated.current) return;

    saveLocalTasks(state.tasks);
    actions.setSyncState("syncing");

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persistTasks(state.tasks)
        .then(() => actions.setSyncState("synced"))
        .catch(() => actions.setSyncState("local"));
    }, SAVE_DELAY_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state.tasks, actions]);

  return null;
}
