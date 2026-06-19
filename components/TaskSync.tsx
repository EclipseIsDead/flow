"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { normalizeTasks } from "@/lib/tasks";
import type { Task } from "@/types";

const API_URL = "/api/tasks";
const LOCAL_TASKS_KEY = "flow:tasks:v1";
const SAVE_DELAY_MS = 600;

type RemoteStore = "supabase" | "memory";

interface TasksResponse {
  tasks: unknown;
  store?: RemoteStore;
}

interface TaskSnapshot {
  tasks: Task[];
  store: RemoteStore | null;
}

function isDurableStore(store: RemoteStore | null): boolean {
  return store === "supabase";
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

async function fetchTasks(signal: AbortSignal): Promise<TaskSnapshot> {
  const response = await fetch(API_URL, { cache: "no-store", signal });
  if (!response.ok)
    throw new Error(`Failed to load tasks (${response.status})`);

  const payload = (await response.json()) as TasksResponse;
  return {
    tasks: normalizeTasks(payload.tasks),
    store: payload.store ?? null,
  };
}

async function persistTasks(tasks: Task[]): Promise<RemoteStore | null> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tasks }),
  });

  if (!response.ok)
    throw new Error(`Failed to save tasks (${response.status})`);

  const payload = (await response.json()) as Partial<TasksResponse>;
  return payload.store ?? null;
}

export default function TaskSync() {
  const { state, actions } = useApp();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);
  const remoteStore = useRef<RemoteStore | null>(null);

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
        const snapshot = await fetchTasks(controller.signal);
        if (cancelled) return;

        remoteStore.current = snapshot.store;

        const shouldKeepLocalTasks =
          localTasks.length > 0 && snapshot.tasks.length === 0;
        const tasks = shouldKeepLocalTasks ? localTasks : snapshot.tasks;

        actions.setTasks(tasks);
        saveLocalTasks(tasks);

        if (shouldKeepLocalTasks && isDurableStore(snapshot.store)) {
          remoteStore.current = await persistTasks(localTasks);
        }

        if (!cancelled) {
          actions.setSyncState(
            isDurableStore(remoteStore.current) ? "synced" : "local",
          );
        }
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

    if (remoteStore.current === "memory") {
      actions.setSyncState("local");
      return;
    }

    actions.setSyncState("syncing");

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persistTasks(state.tasks)
        .then((store) => {
          remoteStore.current = store;
          actions.setSyncState(isDurableStore(store) ? "synced" : "local");
        })
        .catch(() => actions.setSyncState("local"));
    }, SAVE_DELAY_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state.tasks, actions]);

  return null;
}
