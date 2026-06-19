export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  date: string | null; // "YYYY-MM-DD"
  startTime: string | null; // "HH:MM" 24h
  endTime: string | null; // "HH:MM" 24h
  done: boolean;
  subtasks: Subtask[];
  createdAt: number;
}

export type CalMode = "day" | "week" | "month";
export type Pane = "list" | "cal" | "protein";

export interface ProteinDay {
  date: string; // "YYYY-MM-DD"
  grams: number;
  goalGrams: number;
  updatedAt: number;
}

export interface TaskFormValues {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
}

export type ViewMode =
  | { kind: "list" }
  | { kind: "cal"; calMode: CalMode; calOffset: number }
  | { kind: "protein" };
