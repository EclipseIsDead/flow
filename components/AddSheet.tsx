"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import type { Task, TaskFormValues } from "@/types";

const EMPTY_FORM: TaskFormValues = {
  title: "",
  date: "",
  startTime: "",
  endTime: "",
};

function formFromTask(task: Task): TaskFormValues {
  return {
    title: task.title,
    date: task.date ?? "",
    startTime: task.startTime ?? "",
    endTime: task.endTime ?? "",
  };
}

export default function AddSheet() {
  const { state, actions } = useApp();
  const { open, editId, prefillDate } = state.sheet;

  const [form, setForm] = useState<TaskFormValues>(EMPTY_FORM);
  const loadedFormKey = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      loadedFormKey.current = null;
      setForm(EMPTY_FORM);
      return;
    }

    const task = editId
      ? (state.tasks.find((candidate) => candidate.id === editId) ?? null)
      : null;

    if (editId && !task) return;

    const formKey = `${editId ?? "new"}:${prefillDate ?? ""}`;
    if (loadedFormKey.current === formKey) return;

    loadedFormKey.current = formKey;
    setForm(
      task ? formFromTask(task) : { ...EMPTY_FORM, date: prefillDate ?? "" },
    );
  }, [editId, open, prefillDate, state.tasks]);

  function setField(field: keyof TaskFormValues) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((previous) => ({ ...previous, [field]: event.target.value }));
    };
  }

  function submit() {
    const title = form.title.trim();
    if (!title) return;

    const submission = { ...form, title };

    if (editId) {
      actions.updateTask(editId, submission);
    } else {
      actions.addTask(submission);
    }

    actions.closeSheet();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") submit();
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
            onChange={setField("title")}
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
            onChange={setField("date")}
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
              onChange={setField("startTime")}
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
              onChange={setField("endTime")}
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
