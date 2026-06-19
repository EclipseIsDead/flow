import postgres from "postgres";

export type StoreKind = "supabase" | "memory";

export interface SupabaseRestConfig {
  url: string;
  key: string;
}

let sqlClient: ReturnType<typeof postgres> | null = null;

function getDatabaseUrl(): string | null {
  return (
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    null
  );
}

export function getSupabaseRestConfig(): SupabaseRestConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) return null;

  return {
    url: url.replace(/\/$/, ""),
    key,
  };
}

export function getSqlClient() {
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

export function hasSupabaseConfig(): boolean {
  return Boolean(getSqlClient() || getSupabaseRestConfig());
}

export function getStoreKind(): StoreKind {
  return hasSupabaseConfig() ? "supabase" : "memory";
}

export function supabaseHeaders(key: string): HeadersInit {
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
  };
}

export async function assertRestResponse(response: Response, action: string) {
  if (response.ok) return;

  const details = await response.text().catch(() => "");
  throw new Error(
    `Supabase ${action} failed (${response.status})${details ? `: ${details}` : ""}`,
  );
}
