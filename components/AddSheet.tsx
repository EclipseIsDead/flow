"use client";

import { useRef, useEffect } from "react";
import { useApp } from "@/context/AppContext";

export default function AddSheet() {
  const { state, actions } = useApp();
  const { open, editId, prefillDate } = state.sheet;

  const titleRef = useRef<HTMLInputElement>(null);
  const dateRef  = useRef<HTMLInputElement>(null);
  const startRef = useRef<HTMLInputElement>(null);
  const endRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editId) {
      const t = state.tasks.find((t) => t.id === editId);
      if (t) {
        if (titleRef.current) titleRef.current.value = t.title;
        if (dateRef.current)  dateRef.current.value  = t.date ?? "";
        if (startRef.current) startRef.current.value = t.startTime ?? "";
        if (endRef.current)   endRef.current.value   = t.endTime ?? "";
      }
    } else {
      if (titleRef.current) titleRef.current.value = "";
      if (dateRef.current)  dateRef.current.value  = prefillDate ?? "";
      if (startRef.current) startRef.current.value = "";
      if (endRef.current)   endRef.current.value   = "";
    }
    setTimeout(() => titleRef.current?.focus(), 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function submit() {
    const title = titleRef.current?.value.trim() ?? "";
    if (!title) return;
    const values = {
      title,
      date:      dateRef.current?.value  ?? "",
      startTime: startRef.current?.value ?? "",
      endTime:   endRef.current?.value   ?? "",
    };
    if (editId) {
      actions.updateTask(editId, values);
    } else {
      actions.addTask(values);
    }
    actions.closeSheet();
  }

  return (
    <>
      <div className={`sheet-overlay${open ? " sheet-overlay--open" : ""}`} onClick={actions.closeSheet} />
      <div className={`sheet${open ? " sheet--open" : ""}`}>
        <div className="sheet-handle" />
        <div className="sheet-cmd-row">
          <span className="sheet-cmd">task.{editId ? "update" : "create"}</span>{"({ }"}
        </div>

        <div className="sheet-field">
          <label className="sheet-label">title</label>
          <input ref={titleRef} className="sheet-input" placeholder="What needs to happen?" autoComplete="off" onKeyDown={(e) => e.key === "Enter" && submit()} />
        </div>

        <div className="sheet-field">
          <label className="sheet-label">date</label>
          <input ref={dateRef} className="sheet-input" type="date" />
        </div>

        <div className="sheet-row2">
          <div className="sheet-field">
            <label className="sheet-label">start time</label>
            <input ref={startRef} className="sheet-input" type="time" />
          </div>
          <div className="sheet-field">
            <label className="sheet-label">end time</label>
            <input ref={endRef} className="sheet-input" type="time" />
          </div>
        </div>

        <div className="sheet-actions">
          <button className="sheet-cancel" onClick={actions.closeSheet}>esc</button>
          <button className="sheet-submit" onClick={submit}>→ {editId ? "update" : "add"}</button>
        </div>
      </div>
    </>
  );
}
