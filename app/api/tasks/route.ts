import { NextResponse } from "next/server";
import { getTaskStoreKind, loadTasks, saveTasks } from "@/lib/taskStore";
import { normalizeTasks } from "@/lib/tasks";

export const dynamic = "force-dynamic";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");

  return NextResponse.json(body, { ...init, headers });
}

async function readTasksFromRequest(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    tasks?: unknown;
  } | null;

  if (!Array.isArray(body?.tasks)) {
    return null;
  }

  return normalizeTasks(body.tasks);
}

export async function GET() {
  try {
    const tasks = await loadTasks();
    return jsonResponse({ tasks, store: getTaskStoreKind() });
  } catch (error) {
    console.error("[GET /api/tasks]", error);
    return jsonResponse({ error: "Failed to load tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tasks = await readTasksFromRequest(request);

    if (!tasks) {
      return jsonResponse({ error: "Invalid tasks array" }, { status: 400 });
    }

    await saveTasks(tasks);

    return jsonResponse({ ok: true, store: getTaskStoreKind() });
  } catch (error) {
    console.error("[POST /api/tasks]", error);
    return jsonResponse({ error: "Failed to save tasks" }, { status: 500 });
  }
}
