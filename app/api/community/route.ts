import { NextResponse } from "next/server";
import { readDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await readDatabase();
    return NextResponse.json(
      { members: db.users.length },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("Community count failed", error);
    return NextResponse.json({ members: 0 }, { status: 503 });
  }
}
