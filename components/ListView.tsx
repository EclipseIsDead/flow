"use client";

import { useApp } from "@/context/AppContext";
import {
  sortTasksForList,
  todayKey,
  parseDate,
  fmtRange,
  durMins,
  fmtDur,
  DAY_NAMES,
  MONTH_SHORT,
} from "@/lib/utils";
import type { Task } from "@/types";

function CheckBtn({
  done,
  small,
  onClick,
}: {
  done: boolean;
  small?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      className={`check-btn${done ? " check-btn--done" : ""}`}
      style={small ? { width: 14, height: 14, fontSize: 9 } : undefined}
      onClick={onClick}
      aria-label={done ? "Mark incomplete" : "Mark complete"}
    >
      {done ? "✓" : ""}
    </button>
  );
}

function GroupHeader({ dateKey }: { dateKey: string }) {
  const isUndated = dateKey === "__undated";
  const isToday = dateKey === todayKey();
  let label: string;
  if (isUndated) {
    label = "unscheduled";
  } else {
    const d = parseDate(dateKey);
    label = `${DAY_NAMES[d.getDay()].toUpperCase()}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}${isToday ? " · TODAY" : ""}`;
  }
  return (
    <div className="list-group-hdr">
      <span className={`list-group-dot${isToday ? " list-group-dot--today" : ""}`} />
      {label}
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const { actions } = useApp();
  const sub = task.subtasks;
  const subDone = sub.filter((s) => s.done).length;
  const dur = durMins(task.startTime, task.endTime);

  return (
    <div className="task-row" onClick={() => actions.openDetail(task.id)}>
      <CheckBtn
        done={task.done}
        onClick={(e) => { e.stopPropagation(); actions.toggleTask(task.id); }}
      />
      <div className="task-body">
        <div className={`task-title${task.done ? " task-title--done" : ""}`}>
          {task.title}
        </div>
        <div className="task-meta">
          {task.startTime && (
            <span className="task-meta-time">
              {fmtRange(task.startTime, task.endTime)}
            </span>
          )}
          {dur && <span className="task-meta-dur">{fmtDur(dur)}</span>}
          {sub.length > 0 && (
            <span className="task-meta-sub">{subDone}/{sub.length}</span>
          )}
          {!task.date && <span className="task-meta-unsched">no date</span>}
        </div>
      </div>
    </div>
  );
}

export default function ListView() {
  const { state } = useApp();
  const { tasks } = state;
  const pending = tasks.filter((t) => !t.done).length;
  const sorted = sortTasksForList(tasks);

  const groups: { key: string; tasks: Task[] }[] = [];
  let lastKey: string | null = null;
  for (const t of sorted) {
    const gk = t.date ?? "__undated";
    if (gk !== lastKey) {
      groups.push({ key: gk, tasks: [] });
      lastKey = gk;
    }
    groups[groups.length - 1].tasks.push(t);
  }

  return (
    <>
      <div className="list-header">
        <span className="list-header-label">list</span>
        <span className="list-header-count">{pending} pending</span>
      </div>
      <div className="list-scroll">
        {tasks.length === 0 ? (
          <div className="empty-list">
            <span className="empty-prompt">$</span> no tasks yet
            <br />
            <span style={{ color: "var(--dim)" }}>tap + to create</span>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.key}>
              <GroupHeader dateKey={g.key} />
              {g.tasks.map((t) => <TaskRow key={t.id} task={t} />)}
            </div>
          ))
        )}
      </div>
    </>
  );
}
