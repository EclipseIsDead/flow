import { createClient } from "@vercel/kv";
import { NextResponse } from "next/server";
import type { Task } from "@/types";

const TASKS_KEY = "flow:tasks";

const kv = createClient({
  url: process.env.REDIS_URL!,
  token: process.env.KV_REST_API_TOKEN || "",
});

export async function GET() {
  try {
    const tasks = await kv.get<Task[]>(TASKS_KEY);
    return NextResponse.json({ tasks: tasks ?? [] });
  } catch (err) {
    console.error("[GET /api/tasks]", err);
    return NextResponse.json(
      { error: "Failed to load tasks" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tasks: Task[] = body.tasks;

    if (!Array.isArray(tasks)) {
      return NextResponse.json(
        { error: "tasks must be an array" },
        { status: 400 },
      );
    }

    if (tasks.length > 0) {
      console.log("Incoming task date check:", tasks[0].date);
    }

    await kv.set(TASKS_KEY, JSON.stringify(tasks));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/tasks]", err);
    return NextResponse.json(
      { error: "Failed to save tasks" },
      { status: 500 },
    );
  }
}
