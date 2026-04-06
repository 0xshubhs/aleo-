import { NextResponse } from "next/server";
import { getCommittee } from "@/app/lib/aleo-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const committee = await getCommittee();
    let members = committee?.members ?? [];
    if (!members.length) {
      const BASE = process.env.ALEO_API_BASE || "https://api.explorer.provable.com/v1/mainnet";
      const res = await fetch(`${BASE}/committee/latest`, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { members?: Record<string, unknown> };
        if (data.members && typeof data.members === "object" && !Array.isArray(data.members)) {
          members = Object.keys(data.members).map((address) => ({ address }));
        }
      }
    }
    const validators = members
      .filter((m) => m?.address && String(m.address).length > 0)
      .map((m) => ({ address: String(m!.address), blocksProposed: 0, lastActive: null as string | null }));
    return NextResponse.json({ validators });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/validators]", errorMessage);
    return NextResponse.json(
      { error: "Failed to fetch validators", details: errorMessage, validators: [] },
      { status: 500 }
    );
  }
}
