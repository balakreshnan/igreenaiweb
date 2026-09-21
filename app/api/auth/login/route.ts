import { NextResponse } from "next/server";
import { createSession, isAdminCredential, verifyPassword } from "@/lib/auth";
import { readDatabase } from "@/lib/db";
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

    const db = await readDatabase();
    const user = db.users.find((item) => item.email === identifier);
    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    await createSession(user.id, "user");
    return NextResponse.json({ role: "user", user: safeUser(user) });
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Unable to sign in right now." }, { status: 500 });
  }
}
