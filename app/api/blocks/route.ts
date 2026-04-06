import { NextRequest, NextResponse } from "next/server";
import { getLatestHeight, getBlockRange, getBlockByHeight } from "@/app/lib/aleo-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const heightParam = searchParams.get("height");

    if (heightParam) {
      const height = parseInt(heightParam, 10);
      if (isNaN(height) || height < 0) {
        return NextResponse.json({ error: "Invalid block height" }, { status: 400 });
      }
      const block = await getBlockByHeight(height);
      return NextResponse.json({
        blocks: [{
          height: block.height,
          hash: block.hash,
          timestamp: block.timestamp.toISOString(),
          txCount: block.transactions.length,
          proposer: block.proposer,
        }],
        total: 1,
        page: 1,
        limit: 1,
      });
    }

    const latest = await getLatestHeight();
    const start = Math.max(0, latest - page * limit + 1);
    const end = Math.max(0, latest - (page - 1) * limit);
    if (start > end) {
      return NextResponse.json({ blocks: [], total: latest, page, limit });
    }

    const blocks = await getBlockRange(start, end);
    const rows = blocks
      .map((b) => ({
        height: b.height,
        hash: b.hash,
        timestamp: b.timestamp.toISOString(),
        txCount: b.transactions.length,
        proposer: b.proposer,
      }))
      .sort((a, b) => b.height - a.height);

    return NextResponse.json({ blocks: rows, total: latest, page, limit });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/blocks]", errorMessage);
    return NextResponse.json(
      { error: "Failed to fetch blocks", details: errorMessage },
      { status: 500 }
    );
  }
}
