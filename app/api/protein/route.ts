import { NextResponse } from "next/server";
import {
  getProteinStoreKind,
  loadProteinDays,
  saveProteinDays,
} from "@/lib/proteinStore";
import { normalizeProteinDays } from "@/lib/protein";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");

  return NextResponse.json(body, { ...init, headers });
}

async function readProteinDaysFromRequest(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    days?: unknown;
  } | null;

  if (!Array.isArray(body?.days)) {
    return null;
  }

  return normalizeProteinDays(body.days);
}

export async function GET() {
  try {
    const days = await loadProteinDays();
    return jsonResponse({ days, store: getProteinStoreKind() });
  } catch (error) {
    console.error("[GET /api/protein]", error);
    return jsonResponse(
      { error: "Failed to load protein days" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const days = await readProteinDaysFromRequest(request);

    if (!days) {
      return jsonResponse({ error: "Invalid protein days array" }, { status: 400 });
    }

    await saveProteinDays(days);

    return jsonResponse({ ok: true, store: getProteinStoreKind() });
  } catch (error) {
    console.error("[POST /api/protein]", error);
    return jsonResponse(
      { error: "Failed to save protein days" },
      { status: 500 },
    );
  }
}
