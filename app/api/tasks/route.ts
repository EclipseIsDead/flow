import { createClient } from "redis";
import { NextResponse } from "next/server";
import type { Task } from "@/types";

const TASKS_KEY = "flow:tasks";

const client = createClient({
  url: process.env.REDIS_URL,
});

client.on("error", (err) => console.error("Redis Client Error", err));

async function getRedis() {
  if (!client.isOpen) await client.connect();
  return client;
}

export async function GET() {
  try {
    const redis = await getRedis();
    const data = await redis.get(TASKS_KEY);
    const tasks = data ? JSON.parse(data) : [];
    return NextResponse.json({ tasks });
  } catch (err) {
    console.error("[GET /api/tasks]", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const redis = await getRedis();
    const body = await request.json();
    const tasks: Task[] = body.tasks;

    if (!Array.isArray(tasks)) {
      return NextResponse.json(
        { error: "Invalid tasks array" },
        { status: 400 },
      );
    }

    await redis.set(TASKS_KEY, JSON.stringify(tasks));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/tasks]", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
