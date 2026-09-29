import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { addImpact, DuplicateImpactError } from "@/lib/db";
import { buildImpact, impactFactors } from "@/lib/impacts";
import { safeUser, type Impact } from "@/lib/types";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "user") return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const body = await request.json();
    const category = String(body.category) as Impact["category"];
    const quantity = Number(body.quantity);
    const action = String(body.action || "").trim().slice(0, 120);
    const date = String(body.date || new Date().toISOString().slice(0, 10));
    const note = String(body.note || "").trim().slice(0, 240);
    if (!impactFactors[category] || !Number.isFinite(quantity) || quantity <= 0 || quantity > 100000 || action.length < 2) {
      return NextResponse.json({ error: "Please enter a valid activity and positive amount." }, { status: 400 });
    }

    const impact = buildImpact({
      category,
      action,
      quantity,
      date,
      note: note || undefined,
    });
    const user = await addImpact(session.sub, impact);
    return NextResponse.json({ impact, user: safeUser(user) }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateImpactError) {
      return NextResponse.json({ error: "This activity is already in your log." }, { status: 409 });
    }
    console.error("Impact creation failed", error);
    return NextResponse.json({ error: "Unable to save this activity." }, { status: 500 });
  }
}
