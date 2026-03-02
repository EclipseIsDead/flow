"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";

interface FormValues {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
}

const EMPTY: FormValues = { title: "", date: "", startTime: "", endTime: "" };

export default function AddSheet() {
  const { state, actions } = useApp();
  const { open, editId, prefillDate } = state.sheet;

  const [form, setForm] = useState<FormValues>(EMPTY);

  useEffect(() => {
    if (!open) return;

    if (editId) {
      const t = state.tasks.find((t) => t.id === editId);
      if (t) {
        setForm({
          title: t.title,
          date: t.date ?? "",
          startTime: t.startTime ?? "",
          endTime: t.endTime ?? "",
        });
      }
    } else {
      setForm({ ...EMPTY, date: prefillDate ?? "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function set(field: keyof FormValues) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function submit() {
    if (!form.title.trim()) return;
    if (editId) {
      actions.updateTask(editId, form);
    } else {
      actions.addTask(form);
    }
    actions.closeSheet();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") submit();
  }

  const isEdit = !!editId;

  return (
    <>
      <div
        className={`sheet-overlay${open ? " sheet-overlay--open" : ""}`}
        onClick={actions.closeSheet}
      />
      <div className={`sheet${open ? " sheet--open" : ""}`}>
        <div className="sheet-handle" />
        <div className="sheet-cmd-row">
          <span className="sheet-cmd">task.{isEdit ? "update" : "create"}</span>
          {"({ }"}
        </div>

        <div className="sheet-field">
          <label className="sheet-label" htmlFor="inp-title">
            title
          </label>
          <input
            id="inp-title"
            className="sheet-input"
            placeholder="What needs to happen?"
            autoComplete="off"
            value={form.title}
            onChange={set("title")}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="sheet-field">
          <label className="sheet-label" htmlFor="inp-date">
            date
          </label>
          <input
            id="inp-date"
            className="sheet-input"
            type="date"
            value={form.date}
            onChange={set("date")}
          />
        </div>

        <div className="sheet-row2">
          <div className="sheet-field">
            <label className="sheet-label" htmlFor="inp-start">
              start time
            </label>
            <input
              id="inp-start"
              className="sheet-input"
              type="time"
              value={form.startTime}
              onChange={set("startTime")}
            />
          </div>
          <div className="sheet-field">
            <label className="sheet-label" htmlFor="inp-end">
              end time
            </label>
            <input
              id="inp-end"
              className="sheet-input"
              type="time"
              value={form.endTime}
              onChange={set("endTime")}
            />
          </div>
        </div>

        <div className="sheet-actions">
          <button className="sheet-cancel" onClick={actions.closeSheet}>
            esc
          </button>
          <button className="sheet-submit" onClick={submit}>
            → {isEdit ? "update" : "add"}
          </button>
        </div>
      </div>
    </>
  );
}
