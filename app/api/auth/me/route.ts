import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { findUserById } from "@/lib/db";
import { safeUser } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ authenticated: false });
  if (session.role === "admin") return NextResponse.json({ authenticated: true, role: "admin" });
  const user = await findUserById(session.sub);
  if (!user) return NextResponse.json({ authenticated: false });
  return NextResponse.json({ authenticated: true, role: "user", user: safeUser(user) });
}
