import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readDatabase } from "@/lib/db";
import { safeUser } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ authenticated: false });
  if (session.role === "admin") return NextResponse.json({ authenticated: true, role: "admin" });
  const db = await readDatabase();
  const user = db.users.find((item) => item.id === session.sub);
  if (!user) return NextResponse.json({ authenticated: false });
  return NextResponse.json({ authenticated: true, role: "user", user: safeUser(user) });
}
