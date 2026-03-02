"use client";

import { useEffect, useRef } from "react";
import { AppProvider, useApp } from "@/context/AppContext";
import type { Task, ViewMode } from "@/types";
import ListView from "./ListView";
import CalendarView from "./CalendarView";
import AddSheet from "./AddSheet";
import DetailSheet from "./DetailSheet";

function SyncManager() {
  const { state, actions } = useApp();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    actions.setSyncState("loading");
    fetch("/api/tasks")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<{ tasks: Task[] }>;
      })
      .then(({ tasks }) => {
        actions.setTasks(tasks);
        actions.setSyncState("synced");
      })
      .catch(() => actions.setSyncState("error"))
      .finally(() => {
        initialized.current = true;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    actions.setSyncState("syncing");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tasks: state.tasks }),
      })
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          actions.setSyncState("synced");
        })
        .catch(() => actions.setSyncState("error"));
    }, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tasks]);

  return null;
}

function SyncIndicator() {
  const { state } = useApp();
  const labels: Record<string, string> = {
    idle: "--",
    loading: "loading",
    syncing: "saving",
    synced: "synced",
    error: "offline",
  };
  return (
    <div className="sync">
      <div className={`sync-dot sync-dot--${state.syncState}`} />
      <span className="sync-label">{labels[state.syncState] ?? "--"}</span>
    </div>
  );
}

function CalModeToggle() {
  const { state, actions } = useApp();
  if (state.pane !== "cal") return null;
  return (
    <div className="cal-mode-btns">
      {(["day", "week", "month"] as const).map((m) => (
        <button
          key={m}
          className={`cm-btn${state.calMode === m ? " cm-btn--active" : ""}`}
          onClick={() => actions.setCalMode(m)}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

function MainView({ mode }: { mode: ViewMode }) {
  return (
    <div className="main-view">
      {mode.kind === "list" ? <ListView /> : <CalendarView />}
    </div>
  );
}

function SwipeRegion({ children }: { children: React.ReactNode }) {
  const { state, actions } = useApp();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const isSwiping = useRef(false);

  return (
    <div
      className="swipe-region"
      onTouchStart={(e) => {
        touchStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        isSwiping.current = false;
      }}
      onTouchMove={(e) => {
        if (!touchStart.current) return;
        const dx = Math.abs(e.touches[0].clientX - touchStart.current.x);
        const dy = Math.abs(e.touches[0].clientY - touchStart.current.y);
        if (dx > dy && dx > 10) isSwiping.current = true;
      }}
      onTouchEnd={(e) => {
        if (!touchStart.current || !isSwiping.current) {
          touchStart.current = null;
          return;
        }
        const dx = e.changedTouches[0].clientX - touchStart.current.x;
        touchStart.current = null;
        isSwiping.current = false;
        if (Math.abs(dx) < 44) return;
        if (dx < 0 && state.pane === "list") actions.setPane("cal");
        else if (dx > 0 && state.pane === "cal") actions.setPane("list");
      }}
    >
      {children}
    </div>
  );
}

function ViewDots() {
  const { state, actions } = useApp();
  return (
    <div className="view-dots">
      <button
        className={`vd${state.pane === "list" ? " vd--active" : ""}`}
        onClick={() => actions.setPane("list")}
        aria-label="List view"
      />
      <button
        className={`vd${state.pane === "cal" ? " vd--active" : ""}`}
        onClick={() => actions.setPane("cal")}
        aria-label="Calendar view"
      />
    </div>
  );
}

function Fab() {
  const { state, actions } = useApp();
  return (
    <button
      className={`fab${state.sheet.open ? " fab--open" : ""}`}
      onClick={() =>
        state.sheet.open ? actions.closeSheet() : actions.openSheet()
      }
      aria-label={state.sheet.open ? "Cancel" : "Add task"}
    >
      +
    </button>
  );
}

function Inner() {
  const { state } = useApp();

  const viewMode: ViewMode =
    state.pane === "list"
      ? { kind: "list" }
      : { kind: "cal", calMode: state.calMode, calOffset: state.calOffset };

  return (
    <div className="app-root">
      <SyncManager />
      <header className="topbar">
        <div className="topbar-logo">
          <span className="topbar-prompt">$</span>
          <span className="topbar-title">flow</span>
          <span className="topbar-cursor" aria-hidden />
        </div>
        <SyncIndicator />
        <CalModeToggle />
      </header>
      <SwipeRegion>
        <MainView mode={viewMode} />
        <ViewDots />
      </SwipeRegion>
      <Fab />
      <AddSheet />
      <DetailSheet />
    </div>
  );
}

export default function FlowApp() {
  return (
    <AppProvider>
      <Inner />
    </AppProvider>
  );
}
