import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/auth";
import { updateDatabase } from "@/lib/db";
import { safeUser, type Impact } from "@/lib/types";

const factors: Record<Impact["category"], { factor: number; unit: string }> = {
  transport: { factor: 0.21, unit: "km avoided" },
  energy: { factor: 0.39, unit: "kWh saved" },
  food: { factor: 1.8, unit: "plant-based meals" },
  waste: { factor: 0.46, unit: "kg diverted" },
  water: { factor: 0.0003, unit: "liters saved" },
};

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
    if (!factors[category] || !Number.isFinite(quantity) || quantity <= 0 || quantity > 100000 || action.length < 2) {
      return NextResponse.json({ error: "Please enter a valid activity and positive amount." }, { status: 400 });
    }

    const impact: Impact = {
      id: randomUUID(),
      category,
      action,
      quantity,
      unit: factors[category].unit,
      co2e: Number((quantity * factors[category].factor).toFixed(2)),
      date,
      note: note || undefined,
      createdAt: new Date().toISOString(),
    };
    const user = await updateDatabase((db) => {
      const record = db.users.find((item) => item.id === session.sub);
      if (!record) throw new Error("USER_NOT_FOUND");
      record.impacts.unshift(impact);
      return safeUser(record);
    });
    return NextResponse.json({ impact, user }, { status: 201 });
  } catch (error) {
    console.error("Impact creation failed", error);
    return NextResponse.json({ error: "Unable to save this activity." }, { status: 500 });
  }
}
