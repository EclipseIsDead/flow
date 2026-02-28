"use client";

import { useRef } from "react";
import { useApp } from "@/context/AppContext";
import { fmtRange, durMins, fmtDur } from "@/lib/utils";

export default function DetailSheet() {
  const { state, actions } = useApp();
  const subInputRef = useRef<HTMLInputElement>(null);

  const task = state.detailId
    ? (state.tasks.find((t) => t.id === state.detailId) ?? null)
    : null;
  const isOpen = !!task;

  function handleAddSubtask() {
    const val = subInputRef.current?.value.trim();
    if (!val || !state.detailId) return;
    actions.addSubtask(state.detailId, val);
    if (subInputRef.current) subInputRef.current.value = "";
  }

  function handleEdit() {
    if (!state.detailId) return;
    const id = state.detailId;
    actions.closeDetail();
    setTimeout(() => actions.openSheet({ editId: id }), 220);
  }

  function handleDelete() {
    if (!state.detailId) return;
    actions.deleteTask(state.detailId);
    actions.closeDetail();
  }

  const dur = task ? durMins(task.startTime, task.endTime) : null;

  return (
    <>
      <div
        className={`detail-overlay${isOpen ? " detail-overlay--open" : ""}`}
        onClick={actions.closeDetail}
      />
      <div className={`detail-sheet${isOpen ? " detail-sheet--open" : ""}`}>
        <div className="sheet-handle" />
        {task && (
          <>
            <div className="detail-title">{task.title}</div>

            <div className="detail-meta">
              {!task.date && (
                <span className="detail-chip detail-chip--nodate">
                  unscheduled
                </span>
              )}
              {task.date && (
                <span className="detail-chip detail-chip--date">
                  {task.date}
                </span>
              )}
              {task.startTime && (
                <span className="detail-chip detail-chip--time">
                  {fmtRange(task.startTime, task.endTime)}
                </span>
              )}
              {dur && <span className="detail-chip">{fmtDur(dur)}</span>}
            </div>

            <div className="detail-sec">subtasks</div>

            {task.subtasks.length === 0 ? (
              <div className="detail-empty-subs">no subtasks</div>
            ) : (
              <div className="detail-subs">
                {task.subtasks.map((sub) => (
                  <div className="detail-sub" key={sub.id}>
                    <button
                      className={`check-btn${sub.done ? " check-btn--done" : ""}`}
                      style={{ width: 14, height: 14, fontSize: 9 }}
                      onClick={() => actions.toggleSubtask(task.id, sub.id)}
                    >
                      {sub.done ? "✓" : ""}
                    </button>
                    <span
                      className={`detail-sub-title${sub.done ? " detail-sub-title--done" : ""}`}
                    >
                      {sub.title}
                    </span>
                    <button
                      className="detail-sub-del"
                      onClick={() => actions.deleteSubtask(task.id, sub.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="detail-add-row">
              <input
                ref={subInputRef}
                className="detail-add-input"
                placeholder="+ subtask"
                onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
              />
              <button className="detail-add-btn" onClick={handleAddSubtask}>
                add
              </button>
            </div>

            <div className="detail-actions">
              <button className="detail-del" onClick={handleDelete}>
                rm
              </button>
              <button className="detail-edit" onClick={handleEdit}>
                edit
              </button>
              <button className="detail-close" onClick={actions.closeDetail}>
                done
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
