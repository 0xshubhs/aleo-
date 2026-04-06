import { NextResponse } from "next/server";
import { getTransactionMetricsDailyV2 } from "@/app/lib/aleo-v2";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const txPerDay = await getTransactionMetricsDailyV2();
    return NextResponse.json({ txPerDay });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/v2/metrics/transactions]", errorMessage);
    return NextResponse.json(
      {
        error: "Failed to fetch transaction metrics from Provable v2",
        details: errorMessage,
      },
      { status: 503 }
    );
  }
}
