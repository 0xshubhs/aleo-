import { NextResponse } from "next/server";
import { getLatestHashV2 } from "@/app/lib/aleo-v2";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hash = await getLatestHashV2();
    if (!hash) {
      return NextResponse.json(
        { error: "Failed to fetch latest hash from Provable v2" },
        { status: 503 }
      );
    }
    return NextResponse.json({ hash });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/v2/block/hash/latest]", errorMessage);
    return NextResponse.json(
      { error: "Failed to fetch latest hash", details: errorMessage },
      { status: 500 }
    );
  }
}
