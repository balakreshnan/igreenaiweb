import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createSession, hashPassword } from "@/lib/auth";
import { updateDatabase } from "@/lib/db";
import { safeUser, type AccountType, type UserRecord } from "@/lib/types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const displayName = String(body.displayName || "").trim().slice(0, 80);
    const email = String(body.email || "").trim().toLowerCase().slice(0, 160);
    const password = String(body.password || "");
    const accountType = String(body.accountType || "personal") as AccountType;
    const organization = String(body.organization || "").trim().slice(0, 120);
    const city = String(body.city || "").trim().slice(0, 100);
    const allowed = ["personal", "business", "corporate"];

    if (displayName.length < 2 || !emailPattern.test(email) || password.length < 8 || !allowed.includes(accountType)) {
      return NextResponse.json({ error: "Please provide a valid name, email, account type, and an 8+ character password." }, { status: 400 });
    }

    const { salt, hash } = hashPassword(password);
    const user = await updateDatabase((db) => {
      if (db.users.some((item) => item.email === email)) throw new Error("EMAIL_EXISTS");
      const record: UserRecord = {
        id: randomUUID(),
        displayName,
        email,
        passwordHash: hash,
        passwordSalt: salt,
        accountType,
        organization: organization || undefined,
        city: city || undefined,
        goals: [],
        impacts: [],
        createdAt: new Date().toISOString(),
      };
      db.users.push(record);
      return safeUser(record);
    });

    await createSession(user.id, "user");
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_EXISTS") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    console.error("Registration failed", error);
    return NextResponse.json({ error: "We couldn't create your account. Please try again." }, { status: 500 });
  }
}
