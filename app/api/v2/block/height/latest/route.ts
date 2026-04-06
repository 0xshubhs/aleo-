import { NextResponse } from "next/server";
import { getLatestHeightV2 } from "@/app/lib/aleo-v2";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const height = await getLatestHeightV2();
    if (height == null) {
      return NextResponse.json(
        { error: "Failed to fetch latest height from Provable v2" },
        { status: 503 }
      );
    }
    return NextResponse.json({ height });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/v2/block/height/latest]", errorMessage);
    return NextResponse.json(
      { error: "Failed to fetch latest height", details: errorMessage },
      { status: 500 }
    );
  }
}
