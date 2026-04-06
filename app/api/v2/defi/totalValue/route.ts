import { NextResponse } from "next/server";
import { getDeFiTVLV2 } from "@/app/lib/aleo-v2";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getDeFiTVLV2();
    return NextResponse.json(data);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/v2/defi/totalValue]", errorMessage);
    return NextResponse.json(
      { error: "Failed to fetch DeFi TVL", details: errorMessage },
      { status: 503 }
    );
  }
}
