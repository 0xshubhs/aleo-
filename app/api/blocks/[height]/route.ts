import { NextRequest, NextResponse } from "next/server";
import { getBlockByHeight } from "@/app/lib/aleo-client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ height: string }> }
) {
  try {
    const { height: heightParam } = await params;
    const height = parseInt(heightParam, 10);
    if (Number.isNaN(height) || height < 0) {
      return NextResponse.json({ error: "Invalid block height" }, { status: 400 });
    }
    const block = await getBlockByHeight(height);
    const transactions = block.transactions.map((tx) => ({
      txHash: tx.id,
      timestamp: block.timestamp.toISOString(),
      txType: tx.type,
      programName: tx.programName,
    }));
    return NextResponse.json({
      height: block.height,
      hash: block.hash,
      timestamp: block.timestamp.toISOString(),
      txCount: block.transactions.length,
      proposer: block.proposer,
      transactions,
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/blocks/[height]]", errorMessage);
    return NextResponse.json(
      { error: "Block not found", details: errorMessage },
      { status: 404 }
    );
  }
}
