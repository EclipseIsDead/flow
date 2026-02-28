"use client";

import { useEffect, useRef, useCallback } from "react";
import { AppProvider, useApp } from "@/context/AppContext";
import type { Task } from "@/types";
import ListView from "./ListView";
import CalendarView from "./CalendarView";
import AddSheet from "./AddSheet";
import DetailSheet from "./DetailSheet";

// ── Sync ─────────────────────────────────────────────────────────

function SyncManager() {
  const { state, actions } = useApp();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  // Load on mount
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
        initialized.current = true;
      })
      .catch(() => {
        actions.setSyncState("error");
        initialized.current = true;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save on task changes (debounced, skip initial load)
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

// ── Topbar ───────────────────────────────────────────────────────

function SyncIndicator() {
  const { state } = useApp();
  const labels: Record<string, string> = {
    idle: "--", loading: "loading", syncing: "saving",
    synced: "synced", error: "offline",
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

// ── Swipeable views ──────────────────────────────────────────────

function SwipeableViews() {
  const { state, actions } = useApp();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const animating = useRef(false);

  const goToPane = useCallback(
    (idx: number, animate = true) => {
      const track = trackRef.current;
      if (!track) return;
      if (animate) {
        animating.current = true;
        track.classList.add("views-track--animated");
        setTimeout(() => {
          animating.current = false;
          track.classList.remove("views-track--animated");
        }, 320);
      }
      track.style.transform = `translateX(${idx === 0 ? "0%" : "-50%"})`;
      actions.setPane(idx === 0 ? "list" : "cal");
    },
    [actions]
  );

  useEffect(() => {
    goToPane(state.pane === "list" ? 0 : 1, false);
  }, [state.pane, goToPane]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current || animating.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 44) {
      if (dx < 0 && state.pane === "list") goToPane(1);
      else if (dx > 0 && state.pane === "cal") goToPane(0);
    }
  };

  return (
    <div className="views-wrap" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div ref={trackRef} className="views-track">
        <div className="view-pane"><ListView /></div>
        <div className="view-pane"><CalendarView /></div>
      </div>
      <div className="view-dots">
        <div className={`vd${state.pane === "list" ? " vd--active" : ""}`} />
        <div className={`vd${state.pane === "cal" ? " vd--active" : ""}`} />
      </div>
    </div>
  );
}

// ── FAB ──────────────────────────────────────────────────────────

function Fab() {
  const { state, actions } = useApp();
  return (
    <button
      className={`fab${state.sheet.open ? " fab--open" : ""}`}
      onClick={() => state.sheet.open ? actions.closeSheet() : actions.openSheet()}
      aria-label={state.sheet.open ? "Cancel" : "Add task"}
    >
      +
    </button>
  );
}

// ── Inner app (needs context) ─────────────────────────────────────

function Inner() {
  return (
    <>
      <SyncManager />
      <div id="app">
        <header className="topbar">
          <div className="topbar-logo">
            <span className="topbar-prompt">$</span>
            <span className="topbar-title">flow</span>
            <span className="topbar-cursor" aria-hidden />
          </div>
          <SyncIndicator />
          <CalModeToggle />
        </header>
        <SwipeableViews />
      </div>
      <Fab />
      <AddSheet />
      <DetailSheet />
    </>
  );
}

// ── Root export (provides context) ───────────────────────────────

export default function FlowApp() {
  return (
    <AppProvider>
      <Inner />
    </AppProvider>
  );
}
