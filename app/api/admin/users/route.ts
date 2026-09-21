import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readDatabase } from "@/lib/db";
import { safeUser } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const db = await readDatabase();
  return NextResponse.json({
    createdAt: db.createdAt,
    users: db.users.map(safeUser),
  });
}
