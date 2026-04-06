import { NextRequest, NextResponse } from "next/server";
import { getLatestHeight, getBlockRange } from "@/app/lib/aleo-client";

export const dynamic = "force-dynamic";

const MAX_BLOCKS = 15;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const program = searchParams.get("program")?.trim() || undefined;

    const latest = await getLatestHeight();
    const start = Math.max(0, latest - MAX_BLOCKS);
    const blocks = await getBlockRange(start, latest);

    const all: { txHash: string; blockHeight: number; timestamp: string; txType: string; programName: string | null }[] = [];
    for (const b of blocks) {
      for (const tx of b.transactions) {
        if (program && tx.programName !== program) continue;
        all.push({
          txHash: tx.id,
          blockHeight: b.height,
          timestamp: b.timestamp.toISOString(),
          txType: tx.type,
          programName: tx.programName,
        });
      }
    }
    all.sort((a, b) => b.blockHeight - a.blockHeight || 0);
    const transactions = all.slice(0, limit);

    return NextResponse.json({ transactions, total: all.length, page: 1, limit });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/transactions]", errorMessage);
    return NextResponse.json(
      { error: "Failed to fetch transactions", details: errorMessage },
      { status: 500 }
    );
  }
}
