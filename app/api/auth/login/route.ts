import { NextResponse } from "next/server";
import { createSession, isAdminCredential, verifyPassword } from "@/lib/auth";
import { DatabaseConfigurationError, findUserByEmail } from "@/lib/db";
import { safeUser } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = String(body.identifier || "").trim().toLowerCase();
    const password = String(body.password || "");
    const adminMode = body.adminMode === true;

    if (adminMode) {
      if (!isAdminCredential(identifier, password)) {
        return NextResponse.json({ error: "Invalid administrator credentials." }, { status: 401 });
      }
      await createSession("admin", "admin");
      return NextResponse.json({ role: "admin" });
    }

    const user = await findUserByEmail(identifier);
    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    await createSession(user.id, "user");
    return NextResponse.json({ role: "user", user: safeUser(user) });
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return NextResponse.json(
        { error: "Sign-in is temporarily unavailable because Neon Postgres is not configured." },
        { status: 503 },
      );
    }
    console.error("Login failed", error);
    return NextResponse.json({ error: "Unable to sign in right now." }, { status: 500 });
  }
}
