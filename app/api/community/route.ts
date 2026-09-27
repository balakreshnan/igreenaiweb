import { NextResponse } from "next/server";
import { countUsers } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const members = await countUsers();
    return NextResponse.json(
      { members },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Community count failed", error);
    return NextResponse.json({ members: 0 }, { status: 503 });
  }
}
