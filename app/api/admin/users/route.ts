import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { DatabaseConfigurationError, listUsers } from "@/lib/db";
import { safeUser } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  try {
    const users = await listUsers();
    return NextResponse.json({
      createdAt: users.length ? users.reduce((earliest, user) => user.createdAt < earliest ? user.createdAt : earliest, users[0].createdAt) : new Date().toISOString(),
      users: users.map(safeUser),
    });
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return NextResponse.json({ error: "Neon Postgres is not connected to this deployment." }, { status: 503 });
    }
    console.error("Admin member list failed", error);
    return NextResponse.json({ error: "Unable to load community members." }, { status: 500 });
  }
}
