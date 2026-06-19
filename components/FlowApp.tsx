"use client";

import { useRef } from "react";
import { AppProvider, useApp, type SyncState } from "@/context/AppContext";
import type { Pane, ViewMode } from "@/types";
import ListView from "./ListView";
import CalendarView from "./CalendarView";
import ProteinView from "./ProteinView";
import AddSheet from "./AddSheet";
import DetailSheet from "./DetailSheet";
import TaskSync from "./TaskSync";

const PANES: Pane[] = ["list", "cal", "protein"];

function SyncIndicator() {
  const { state } = useApp();
  const labels: Record<SyncState, string> = {
    idle: "--",
    loading: "loading",
    syncing: "saving",
    synced: "synced",
    local: "local",
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
      {mode.kind === "list" && <ListView />}
      {mode.kind === "cal" && <CalendarView />}
      {mode.kind === "protein" && <ProteinView />}
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

        const currentIndex = PANES.indexOf(state.pane);
        const nextPane = PANES[currentIndex + (dx < 0 ? 1 : -1)];
        if (nextPane) actions.setPane(nextPane);
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
      {PANES.map((pane) => (
        <button
          key={pane}
          className={`vd${state.pane === pane ? " vd--active" : ""}`}
          onClick={() => actions.setPane(pane)}
          aria-label={`${pane} view`}
        />
      ))}
    </div>
  );
}

function Fab() {
  const { state, actions } = useApp();
  if (state.pane === "protein") return null;

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
      : state.pane === "cal"
        ? { kind: "cal", calMode: state.calMode, calOffset: state.calOffset }
        : { kind: "protein" };

  return (
    <div className="app-root">
      <TaskSync />
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
