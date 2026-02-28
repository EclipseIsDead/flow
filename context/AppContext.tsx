"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type Dispatch,
  type ReactNode,
} from "react";
import type { Task, Subtask, CalMode, Pane, TaskFormValues } from "@/types";
import { newId } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────

export type SyncState = "idle" | "loading" | "syncing" | "synced" | "error";

export interface SheetState {
  open: boolean;
  editId: string | null;
  prefillDate?: string;
}

export interface AppState {
  tasks: Task[];
  syncState: SyncState;
  pane: Pane;
  calMode: CalMode;
  calOffset: number;
  selectedMonthDay: string | null;
  detailId: string | null;
  sheet: SheetState;
}

// ── Actions ───────────────────────────────────────────────────────

export type Action =
  // Data
  | { type: "SET_TASKS"; tasks: Task[] }
  | { type: "SET_SYNC"; state: SyncState }
  | { type: "ADD_TASK"; task: Task }
  | { type: "UPDATE_TASK"; id: string; values: TaskFormValues }
  | { type: "DELETE_TASK"; id: string }
  | { type: "TOGGLE_TASK"; id: string }
  | { type: "ADD_SUBTASK"; taskId: string; sub: Subtask }
  | { type: "TOGGLE_SUBTASK"; taskId: string; subId: string }
  | { type: "DELETE_SUBTASK"; taskId: string; subId: string }
  // UI
  | { type: "SET_PANE"; pane: Pane }
  | { type: "SET_CAL_MODE"; mode: CalMode }
  | { type: "SET_CAL_OFFSET"; offset: number }
  | { type: "NUDGE_CAL_OFFSET"; delta: number }
  | { type: "SET_SELECTED_MONTH_DAY"; day: string | null }
  | { type: "OPEN_DETAIL"; id: string }
  | { type: "CLOSE_DETAIL" }
  | { type: "OPEN_SHEET"; editId?: string; prefillDate?: string }
  | { type: "CLOSE_SHEET" };

// ── Initial state ─────────────────────────────────────────────────

const initialState: AppState = {
  tasks: [],
  syncState: "idle",
  pane: "list",
  calMode: "day",
  calOffset: 0,
  selectedMonthDay: null,
  detailId: null,
  sheet: { open: false, editId: null },
};

// ── Reducer ───────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    // ── Data ──
    case "SET_TASKS":
      return { ...state, tasks: action.tasks };

    case "SET_SYNC":
      return { ...state, syncState: action.state };

    case "ADD_TASK":
      return { ...state, tasks: [...state.tasks, action.task] };

    case "UPDATE_TASK":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id !== action.id
            ? t
            : {
                ...t,
                title: action.values.title.trim(),
                date: action.values.date || null,
                startTime: action.values.startTime || null,
                endTime: action.values.endTime || null,
              },
        ),
      };

    case "DELETE_TASK":
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };

    case "TOGGLE_TASK":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, done: !t.done } : t,
        ),
      };

    case "ADD_SUBTASK":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id !== action.taskId
            ? t
            : { ...t, subtasks: [...t.subtasks, action.sub] },
        ),
      };

    case "TOGGLE_SUBTASK":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id !== action.taskId
            ? t
            : {
                ...t,
                subtasks: t.subtasks.map((s) =>
                  s.id === action.subId ? { ...s, done: !s.done } : s,
                ),
              },
        ),
      };

    case "DELETE_SUBTASK":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id !== action.taskId
            ? t
            : {
                ...t,
                subtasks: t.subtasks.filter((s) => s.id !== action.subId),
              },
        ),
      };

    // ── UI ──
    case "SET_PANE":
      return { ...state, pane: action.pane };

    case "SET_CAL_MODE":
      return {
        ...state,
        calMode: action.mode,
        calOffset: 0,
        selectedMonthDay: null,
      };

    case "SET_CAL_OFFSET":
      return { ...state, calOffset: action.offset };

    case "NUDGE_CAL_OFFSET":
      return {
        ...state,
        calOffset: state.calOffset + action.delta,
        selectedMonthDay: null,
      };

    case "SET_SELECTED_MONTH_DAY":
      return { ...state, selectedMonthDay: action.day };

    case "OPEN_DETAIL":
      return { ...state, detailId: action.id };

    case "CLOSE_DETAIL":
      return { ...state, detailId: null };

    case "OPEN_SHEET":
      return {
        ...state,
        sheet: {
          open: true,
          editId: action.editId ?? null,
          prefillDate: action.prefillDate,
        },
      };

    case "CLOSE_SHEET":
      return { ...state, sheet: { open: false, editId: null } };

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  // Convenience action creators (avoids spelling out action objects everywhere)
  actions: ReturnType<typeof makeActions>;
}

function makeActions(dispatch: Dispatch<Action>) {
  return {
    setTasks: (tasks: Task[]) => dispatch({ type: "SET_TASKS", tasks }),
    setSyncState: (s: SyncState) => dispatch({ type: "SET_SYNC", state: s }),

    addTask: (values: TaskFormValues): Task => {
      const task: Task = {
        id: newId(),
        title: values.title.trim(),
        date: values.date || null,
        startTime: values.startTime || null,
        endTime: values.endTime || null,
        done: false,
        subtasks: [],
        createdAt: Date.now(),
      };
      dispatch({ type: "ADD_TASK", task });
      return task;
    },

    updateTask: (id: string, values: TaskFormValues) =>
      dispatch({ type: "UPDATE_TASK", id, values }),

    deleteTask: (id: string) => dispatch({ type: "DELETE_TASK", id }),
    toggleTask: (id: string) => dispatch({ type: "TOGGLE_TASK", id }),

    addSubtask: (taskId: string, title: string) => {
      const sub: Subtask = { id: newId(), title: title.trim(), done: false };
      dispatch({ type: "ADD_SUBTASK", taskId, sub });
    },

    toggleSubtask: (taskId: string, subId: string) =>
      dispatch({ type: "TOGGLE_SUBTASK", taskId, subId }),

    deleteSubtask: (taskId: string, subId: string) =>
      dispatch({ type: "DELETE_SUBTASK", taskId, subId }),

    setPane: (pane: Pane) => dispatch({ type: "SET_PANE", pane }),
    setCalMode: (mode: CalMode) => dispatch({ type: "SET_CAL_MODE", mode }),
    setCalOffset: (offset: number) =>
      dispatch({ type: "SET_CAL_OFFSET", offset }),
    nudgeCalOffset: (delta: number) =>
      dispatch({ type: "NUDGE_CAL_OFFSET", delta }),
    setSelectedMonthDay: (day: string | null) =>
      dispatch({ type: "SET_SELECTED_MONTH_DAY", day }),
    openDetail: (id: string) => dispatch({ type: "OPEN_DETAIL", id }),
    closeDetail: () => dispatch({ type: "CLOSE_DETAIL" }),
    openSheet: (opts: { editId?: string; prefillDate?: string } = {}) =>
      dispatch({ type: "OPEN_SHEET", ...opts }),
    closeSheet: () => dispatch({ type: "CLOSE_SHEET" }),
  };
}

const AppContext = createContext<AppContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const actions = useCallback(() => makeActions(dispatch), [dispatch])();

  return (
    <AppContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </AppContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
