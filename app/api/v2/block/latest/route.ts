import { NextResponse } from "next/server";
import { getLatestBlockV2 } from "@/app/lib/aleo-v2";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const block = await getLatestBlockV2();
    if (!block) {
      return NextResponse.json(
        { error: "Failed to fetch latest block from Provable v2" },
        { status: 503 }
      );
    }
    return NextResponse.json(block);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/v2/block/latest]", errorMessage);
    return NextResponse.json(
      { error: "Failed to fetch latest block", details: errorMessage },
      { status: 500 }
    );
  }
}
