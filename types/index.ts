export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  date: string | null;      // "YYYY-MM-DD"
  startTime: string | null; // "HH:MM" 24h
  endTime: string | null;   // "HH:MM" 24h
  done: boolean;
  subtasks: Subtask[];
  createdAt: number;
}

export type CalMode = "day" | "week" | "month";
export type Pane = "list" | "cal";

export interface TaskFormValues {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
}
