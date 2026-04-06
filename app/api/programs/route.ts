import { NextRequest, NextResponse } from "next/server";
import { getProgram, getProgramMappingNames } from "@/app/lib/aleo-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json(
        { error: "Missing program id. Use ?id=credits.aleo" },
        { status: 400 }
      );
    }
    const [program, mappings] = await Promise.all([
      getProgram(id),
      getProgramMappingNames(id),
    ]);
    if (!program && mappings.length === 0) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }
    return NextResponse.json({ program: program ?? null, mappings });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/programs]", errorMessage);
    return NextResponse.json(
      { error: "Failed to fetch program", details: errorMessage },
      { status: 500 }
    );
  }
}
