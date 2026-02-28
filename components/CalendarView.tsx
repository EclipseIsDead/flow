"use client";

import { useApp } from "@/context/AppContext";
import {
  getFocusDate,
  getWeekDays,
  buildTaskMap,
  dateKey,
  todayKey,
  fmt12,
  fmtRange,
  durMins,
  fmtDur,
  DAY_NAMES,
  MONTH_NAMES,
  MONTH_SHORT,
} from "@/lib/utils";
import type { Task } from "@/types";

// ── Shared check for cal chips ────────────────────────────────────

function ChipCheck({ task }: { task: Task }) {
  const { actions } = useApp();
  return (
    <button
      className={`cc-check${task.done ? " cc-check--done" : ""}`}
      onClick={(e) => { e.stopPropagation(); actions.toggleTask(task.id); }}
      aria-label={task.done ? "Mark incomplete" : "Mark complete"}
    >
      {task.done ? "✓" : ""}
    </button>
  );
}

// ── Cal nav bar ───────────────────────────────────────────────────

function CalNav() {
  const { state, actions } = useApp();
  const { calMode, calOffset } = state;
  const focus = getFocusDate(calMode, calOffset);

  let label: string;
  if (calMode === "day") {
    const dk = dateKey(focus);
    label = `${DAY_NAMES[focus.getDay()]}, ${MONTH_SHORT[focus.getMonth()]} ${focus.getDate()}${dk === todayKey() ? " · today" : ""}`;
  } else if (calMode === "week") {
    const days = getWeekDays(focus);
    const s = days[0], e = days[6];
    label = `${MONTH_SHORT[s.getMonth()]} ${s.getDate()} – ${s.getMonth() !== e.getMonth() ? MONTH_SHORT[e.getMonth()] + " " : ""}${e.getDate()}`;
  } else {
    label = `${MONTH_NAMES[focus.getMonth()]} ${focus.getFullYear()}`;
  }

  return (
    <div className="cal-nav">
      <button className="cal-nav-btn" onClick={() => actions.nudgeCalOffset(-1)}>‹</button>
      <div className="cal-nav-label">{label}</div>
      <button className="cal-nav-btn" onClick={() => actions.nudgeCalOffset(1)}>›</button>
      <button className="cal-today-btn" onClick={() => { actions.setCalOffset(0); actions.setSelectedMonthDay(null); }}>
        today
      </button>
    </div>
  );
}

// ── Day view ──────────────────────────────────────────────────────

function DayView() {
  const { state, actions } = useApp();
  const focus = getFocusDate("day", state.calOffset);
  const dk = dateKey(focus);

  const dayTasks = state.tasks
    .filter((t) => t.date === dk)
    .sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return a.startTime.localeCompare(b.startTime);
    });

  const untimed = dayTasks.filter((t) => !t.startTime);
  const timed = dayTasks.filter((t) => t.startTime);

  const hoursSet = new Set([7,8,9,10,11,12,13,14,15,16,17,18,19,20,21]);
  timed.forEach((t) => hoursSet.add(parseInt(t.startTime!.split(":")[0])));
  const hours = Array.from(hoursSet).sort((a, b) => a - b);

  return (
    <div className="day-view">
      {untimed.length > 0 && (
        <div className="day-unscheduled">
          <div className="day-unscheduled-label">UNSCHEDULED</div>
          {untimed.map((t) => {
            const subDone = t.subtasks.filter((s) => s.done).length;
            return (
              <div key={t.id} className={`day-block${t.done ? " day-block--done" : ""}`} onClick={() => actions.openDetail(t.id)}>
                <div className={`day-block-title${t.done ? " day-block-title--done" : ""}`}>{t.title}</div>
                {t.subtasks.length > 0 && <div className="day-block-dur">{subDone}/{t.subtasks.length} subtasks</div>}
              </div>
            );
          })}
        </div>
      )}

      {dayTasks.length === 0 && <div className="day-empty">— nothing here —</div>}

      {hours.map((h) => {
        const hTasks = timed.filter((t) => parseInt(t.startTime!.split(":")[0]) === h);
        return (
          <div className="day-hour-row" key={h}>
            <div className="day-hour-time">{fmt12(`${String(h).padStart(2,"0")}:00`)}</div>
            <div className="day-hour-slot">
              {hTasks.map((t) => {
                const dur = durMins(t.startTime, t.endTime);
                const subDone = t.subtasks.filter((s) => s.done).length;
                return (
                  <div key={t.id} className={`day-block day-block--timed${t.done ? " day-block--done" : ""}`} onClick={() => actions.openDetail(t.id)}>
                    <div className="day-block-time">{fmtRange(t.startTime, t.endTime)}{dur ? ` · ${fmtDur(dur)}` : ""}</div>
                    <div className={`day-block-title${t.done ? " day-block-title--done" : ""}`}>{t.title}</div>
                    {t.subtasks.length > 0 && <div className="day-block-dur">{subDone}/{t.subtasks.length} subtasks</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Week view ─────────────────────────────────────────────────────

function WeekView() {
  const { state, actions } = useApp();
  const focus = getFocusDate("week", state.calOffset);
  const weekDays = getWeekDays(focus);
  const tmap = buildTaskMap(state.tasks);
  const tdk = todayKey();

  return (
    <div className="week-view">
      {weekDays.map((d) => {
        const dk = dateKey(d);
        const isToday = dk === tdk;
        const dayTasks = tmap[dk] ?? [];
        const pending = dayTasks.filter((t) => !t.done).length;

        return (
          <div className="week-day-block" key={dk}>
            <div className="wdb-header">
              <span className="wdb-name">{DAY_NAMES[d.getDay()].toUpperCase()}</span>
              <span className={`wdb-num${isToday ? " wdb-num--today" : ""}`}>{d.getDate()}</span>
              {pending > 0 && <span className="wdb-count">{pending}</span>}
              <button className="wdb-add" onClick={(e) => { e.stopPropagation(); actions.openSheet({ prefillDate: dk }); }}>+</button>
            </div>
            <div className="wdb-tasks">
              {dayTasks.length === 0 ? (
                <div className="wdb-empty">—</div>
              ) : (
                dayTasks.map((t) => {
                  const subDone = t.subtasks.filter((s) => s.done).length;
                  return (
                    <div key={t.id} className={`cal-chip${t.startTime ? " cal-chip--timed" : ""}${t.done ? " cal-chip--done" : ""}`} onClick={() => actions.openDetail(t.id)}>
                      <span className="cc-time">{fmtRange(t.startTime, t.endTime)}</span>
                      <span className={`cc-title${t.done ? " cc-title--done" : ""}`}>{t.title}</span>
                      {t.subtasks.length > 0 && <span className="cc-sub">{subDone}/{t.subtasks.length}</span>}
                      <ChipCheck task={t} />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Month view ────────────────────────────────────────────────────

function MonthDayPanel({ dayKey }: { dayKey: string }) {
  const { state, actions } = useApp();
  const dayTasks = state.tasks
    .filter((t) => t.date === dayKey)
    .sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return a.startTime.localeCompare(b.startTime);
    });
  if (!dayTasks.length) return null;

  return (
    <div className="month-day-panel month-day-panel--open">
      <div className="mdp-header">{dayKey}</div>
      {dayTasks.map((t) => (
        <div key={t.id} className="mdp-row" onClick={() => actions.openDetail(t.id)}>
          <button
            className={`check-btn${t.done ? " check-btn--done" : ""}`}
            style={{ width: 14, height: 14, fontSize: 9 }}
            onClick={(e) => { e.stopPropagation(); actions.toggleTask(t.id); }}
          >
            {t.done ? "✓" : ""}
          </button>
          <span className={`mdp-title${t.done ? " mdp-title--done" : ""}`}>{t.title}</span>
          {t.startTime && <span className="mdp-time">{fmtRange(t.startTime, t.endTime)}</span>}
        </div>
      ))}
    </div>
  );
}

function MonthView() {
  const { state, actions } = useApp();
  const focus = getFocusDate("month", state.calOffset);
  const year = focus.getFullYear();
  const month = focus.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const tmap = buildTaskMap(state.tasks);
  const tdk = todayKey();
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;

  return (
    <>
      <div className="month-view">
        <div className="month-grid">
          {["S","M","T","W","T","F","S"].map((n, i) => (
            <div className="month-wday" key={i}>{n}</div>
          ))}
          {Array.from({ length: totalCells }, (_, i) => {
            const d = new Date(year, month, i - firstDow + 1);
            const dk = dateKey(d);
            const isOther = d.getMonth() !== month;
            const isToday = dk === tdk;
            const isSelected = dk === state.selectedMonthDay;
            const dayTasks = tmap[dk] ?? [];

            return (
              <div
                key={dk}
                className={["month-day", isToday ? "month-day--today" : "", isOther ? "month-day--other" : "", isSelected ? "month-day--selected" : ""].filter(Boolean).join(" ")}
                onClick={() => actions.setSelectedMonthDay(isSelected ? null : dk)}
              >
                <div className="month-day-num">{d.getDate()}</div>
                <div className="month-day-dots">
                  {dayTasks.slice(0, 3).map((t) => (
                    <div key={t.id} className={["month-dot", t.startTime ? "month-dot--timed" : "", t.done ? "month-dot--done" : ""].filter(Boolean).join(" ")}>
                      {t.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && <div className="month-more">+{dayTasks.length - 3}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {state.selectedMonthDay && <MonthDayPanel dayKey={state.selectedMonthDay} />}
    </>
  );
}

// ── CalendarView ──────────────────────────────────────────────────

export default function CalendarView() {
  const { state } = useApp();
  return (
    <>
      <CalNav />
      <div className="cal-body">
        {state.calMode === "day"   && <DayView />}
        {state.calMode === "week"  && <WeekView />}
        {state.calMode === "month" && <MonthView />}
      </div>
    </>
  );
}
