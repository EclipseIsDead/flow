import postgres from "postgres";
import type { Task } from "@/types";
import { normalizeTasks } from "@/lib/tasks";

export type TaskStoreKind = "supabase" | "memory";

const TABLE_NAME = "flow_state";
const TASKS_ROW_ID = "tasks";

let sqlClient: ReturnType<typeof postgres> | null = null;
let schemaReady: Promise<void> | null = null;
let memoryTasks: Task[] = [];

function getDatabaseUrl(): string | null {
  return (
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    null
  );
}

function getSupabaseRestConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) return null;

  return {
    url: url.replace(/\/$/, ""),
    key,
  };
}

function hasSupabaseConfig(): boolean {
  return Boolean(getDatabaseUrl() || getSupabaseRestConfig());
}

export function getTaskStoreKind(): TaskStoreKind {
  return hasSupabaseConfig() ? "supabase" : "memory";
}

function getSqlClient() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return null;

  if (!sqlClient) {
    sqlClient = postgres(databaseUrl, {
      max: 1,
      prepare: false,
      ssl: "require",
    });
  }

  return sqlClient;
}

async function ensurePostgresSchema() {
  const sql = getSqlClient();
  if (!sql) return;

  await sql`
    create table if not exists public.flow_state (
      id text primary key,
      tasks jsonb not null default '[]'::jsonb,
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    insert into public.flow_state (id, tasks)
    values (${TASKS_ROW_ID}, ${JSON.stringify([])}::jsonb)
    on conflict (id) do nothing
  `;
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = ensurePostgresSchema();
  }

  await schemaReady;
}

async function loadTasksFromPostgres(): Promise<Task[]> {
  const sql = getSqlClient();
  if (!sql) return [];

  await ensureSchema();

  const rows = (await sql`
    select tasks
    from public.flow_state
    where id = ${TASKS_ROW_ID}
    limit 1
  `) as Array<{ tasks: unknown }>;

  return normalizeTasks(rows[0]?.tasks ?? []);
}

async function saveTasksToPostgres(tasks: Task[]): Promise<void> {
  const sql = getSqlClient();
  if (!sql) return;

  const normalizedTasks = normalizeTasks(tasks);
  await ensureSchema();

  await sql`
    insert into public.flow_state (id, tasks, updated_at)
    values (${TASKS_ROW_ID}, ${JSON.stringify(normalizedTasks)}::jsonb, now())
    on conflict (id) do update
      set tasks = excluded.tasks,
          updated_at = excluded.updated_at
  `;
}

function supabaseHeaders(key: string): HeadersInit {
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
  };
}

async function assertRestResponse(response: Response, action: string) {
  if (response.ok) return;

  const details = await response.text().catch(() => "");
  throw new Error(
    `Supabase ${action} failed (${response.status})${details ? `: ${details}` : ""}`,
  );
}

async function loadTasksFromSupabaseRest(): Promise<Task[]> {
  const config = getSupabaseRestConfig();
  if (!config) return [];

  const response = await fetch(
    `${config.url}/rest/v1/${TABLE_NAME}?id=eq.${TASKS_ROW_ID}&select=tasks&limit=1`,
    {
      headers: supabaseHeaders(config.key),
      cache: "no-store",
    },
  );

  await assertRestResponse(response, "load tasks");

  const rows = (await response.json()) as Array<{ tasks?: unknown }>;
  return normalizeTasks(rows[0]?.tasks ?? []);
}

async function saveTasksToSupabaseRest(tasks: Task[]): Promise<void> {
  const config = getSupabaseRestConfig();
  if (!config) return;

  const response = await fetch(
    `${config.url}/rest/v1/${TABLE_NAME}?on_conflict=id`,
    {
      method: "POST",
      headers: {
        ...supabaseHeaders(config.key),
        prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        id: TASKS_ROW_ID,
        tasks: normalizeTasks(tasks),
        updated_at: new Date().toISOString(),
      }),
    },
  );

  await assertRestResponse(response, "save tasks");
}

export async function loadTasks(): Promise<Task[]> {
  if (getSqlClient()) {
    return loadTasksFromPostgres();
  }

  if (getSupabaseRestConfig()) {
    return loadTasksFromSupabaseRest();
  }

  return normalizeTasks(memoryTasks);
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  if (getSqlClient()) {
    await saveTasksToPostgres(tasks);
    return;
  }

  if (getSupabaseRestConfig()) {
    await saveTasksToSupabaseRest(tasks);
    return;
  }

  memoryTasks = normalizeTasks(tasks);
}
