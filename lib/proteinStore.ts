import type { ProteinDay } from "@/types";
import { normalizeProteinDays } from "@/lib/protein";
import {
  assertRestResponse,
  getSqlClient,
  getStoreKind,
  getSupabaseRestConfig,
  supabaseHeaders,
  type StoreKind,
} from "@/lib/supabaseStore";

const TABLE_NAME = "flow_protein_days";

let schemaReady: Promise<void> | null = null;
let memoryProteinDays: ProteinDay[] = [];

async function ensurePostgresSchema() {
  const sql = getSqlClient();
  if (!sql) return;

  await sql`
    create table if not exists public.flow_protein_days (
      date text primary key,
      grams integer not null default 0,
      goal_grams integer not null default 150,
      updated_at timestamptz not null default now()
    )
  `;
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = ensurePostgresSchema();
  }

  await schemaReady;
}

export function getProteinStoreKind(): StoreKind {
  return getStoreKind();
}

async function loadProteinDaysFromPostgres(): Promise<ProteinDay[]> {
  const sql = getSqlClient();
  if (!sql) return [];

  await ensureSchema();

  const rows = (await sql`
    select
      date,
      grams,
      goal_grams as "goalGrams",
      extract(epoch from updated_at) * 1000 as "updatedAt"
    from public.flow_protein_days
    order by date desc
  `) as Array<{
    date: string;
    grams: number;
    goalGrams: number;
    updatedAt: number | string;
  }>;

  return normalizeProteinDays(
    rows.map((row) => ({ ...row, updatedAt: Number(row.updatedAt) })),
  );
}

async function saveProteinDaysToPostgres(days: ProteinDay[]): Promise<void> {
  const sql = getSqlClient();
  if (!sql) return;

  const normalizedDays = normalizeProteinDays(days);
  await ensureSchema();

  await sql.begin(async (transaction) => {
    for (const day of normalizedDays) {
      await transaction`
        insert into public.flow_protein_days (date, grams, goal_grams, updated_at)
        values (
          ${day.date},
          ${day.grams},
          ${day.goalGrams},
          to_timestamp(${day.updatedAt / 1000})
        )
        on conflict (date) do update
          set grams = excluded.grams,
              goal_grams = excluded.goal_grams,
              updated_at = excluded.updated_at
      `;
    }
  });
}

async function loadProteinDaysFromSupabaseRest(): Promise<ProteinDay[]> {
  const config = getSupabaseRestConfig();
  if (!config) return [];

  const response = await fetch(
    `${config.url}/rest/v1/${TABLE_NAME}?select=date,grams,goal_grams,updated_at&order=date.desc`,
    {
      headers: supabaseHeaders(config.key),
      cache: "no-store",
    },
  );

  await assertRestResponse(response, "load protein days");

  const rows = (await response.json()) as Array<{
    date: string;
    grams: number;
    goal_grams: number;
    updated_at: string;
  }>;

  return normalizeProteinDays(rows);
}

async function saveProteinDaysToSupabaseRest(days: ProteinDay[]): Promise<void> {
  const config = getSupabaseRestConfig();
  if (!config) return;

  const normalizedDays = normalizeProteinDays(days);
  if (normalizedDays.length === 0) return;

  const response = await fetch(
    `${config.url}/rest/v1/${TABLE_NAME}?on_conflict=date`,
    {
      method: "POST",
      headers: {
        ...supabaseHeaders(config.key),
        prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(
        normalizedDays.map((day) => ({
          date: day.date,
          grams: day.grams,
          goal_grams: day.goalGrams,
          updated_at: new Date(day.updatedAt).toISOString(),
        })),
      ),
    },
  );

  await assertRestResponse(response, "save protein days");
}

export async function loadProteinDays(): Promise<ProteinDay[]> {
  if (getSqlClient()) {
    return loadProteinDaysFromPostgres();
  }

  if (getSupabaseRestConfig()) {
    return loadProteinDaysFromSupabaseRest();
  }

  return normalizeProteinDays(memoryProteinDays);
}

export async function saveProteinDays(days: ProteinDay[]): Promise<void> {
  if (getSqlClient()) {
    await saveProteinDaysToPostgres(days);
    return;
  }

  if (getSupabaseRestConfig()) {
    await saveProteinDaysToSupabaseRest(days);
    return;
  }

  memoryProteinDays = normalizeProteinDays(days);
}
