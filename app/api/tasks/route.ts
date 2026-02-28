import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import type { Task } from "@/types";

const TASKS_KEY = "flow:tasks";

export async function GET() {
  try {
    const tasks = await kv.get<Task[]>(TASKS_KEY);
    return NextResponse.json({ tasks: tasks ?? [] });
  } catch (err) {
    console.error("[GET /api/tasks]", err);
    return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tasks: Task[] = body.tasks;

    if (!Array.isArray(tasks)) {
      return NextResponse.json(
        { error: "tasks must be an array" },
        { status: 400 }
      );
    }

    await kv.set(TASKS_KEY, tasks);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/tasks]", err);
    return NextResponse.json({ error: "Failed to save tasks" }, { status: 500 });
  }
}
