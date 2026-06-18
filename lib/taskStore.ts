import { kv } from "@vercel/kv";
import { createClient } from "redis";
import type { Task } from "@/types";
import { normalizeTasks } from "@/lib/tasks";

export type TaskStoreKind = "vercel-kv" | "redis" | "memory";

const TASKS_KEY = "flow:tasks";

let redisClient: ReturnType<typeof createClient> | null = null;
let memoryTasks: Task[] = [];

function hasVercelKvEnv(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function hasRedisEnv(): boolean {
  return Boolean(process.env.REDIS_URL);
}

export function getTaskStoreKind(): TaskStoreKind {
  if (hasVercelKvEnv()) return "vercel-kv";
  if (hasRedisEnv()) return "redis";
  return "memory";
}

async function getRedisClient() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  if (!redisClient) {
    redisClient = createClient({ url: redisUrl });
    redisClient.on("error", (error) => {
      console.error("[task-store] Redis client error", error);
    });
  }

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  return redisClient;
}

export async function loadTasks(): Promise<Task[]> {
  const storeKind = getTaskStoreKind();

  if (storeKind === "vercel-kv") {
    const storedTasks = await kv.get<unknown>(TASKS_KEY);
    return normalizeTasks(storedTasks);
  }

  if (storeKind === "redis") {
    const redis = await getRedisClient();
    const storedTasks = await redis?.get(TASKS_KEY);
    return normalizeTasks(storedTasks ? JSON.parse(storedTasks) : []);
  }

  return normalizeTasks(memoryTasks);
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  const normalizedTasks = normalizeTasks(tasks);
  const storeKind = getTaskStoreKind();

  if (storeKind === "vercel-kv") {
    await kv.set(TASKS_KEY, normalizedTasks);
    return;
  }

  if (storeKind === "redis") {
    const redis = await getRedisClient();
    await redis?.set(TASKS_KEY, JSON.stringify(normalizedTasks));
    return;
  }

  memoryTasks = normalizedTasks;
}
