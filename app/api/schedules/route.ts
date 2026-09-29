import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  createSchedule,
  deleteSchedule,
  DuplicateScheduleError,
  findUserById,
  setScheduleActive,
} from "@/lib/db";
import { impactFactors } from "@/lib/impacts";
import { safeUser, type ActivitySchedule, type Impact } from "@/lib/types";

const frequencies = ["daily", "weekly", "monthly"] as const;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

async function userSession() {
  const session = await getSession();
  return session?.role === "user" ? session : null;
}

export async function GET() {
  const session = await userSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const user = await findUserById(session.sub);
  if (!user) return NextResponse.json({ error: "Member not found." }, { status: 404 });
  return NextResponse.json({ user: safeUser(user) });
}

export async function POST(request: Request) {
  const session = await userSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const body = await request.json();
    const category = String(body.category) as Impact["category"];
    const action = String(body.action || "").trim().slice(0, 120);
    const quantity = Number(body.quantity);
    const frequency = String(body.frequency) as ActivitySchedule["frequency"];
    const startDate = String(body.startDate || "");
    const note = String(body.note || "").trim().slice(0, 240);
    const today = new Date().toISOString().slice(0, 10);

    if (
      !impactFactors[category] ||
      !frequencies.includes(frequency) ||
      action.length < 2 ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      quantity > 100000 ||
      !isoDatePattern.test(startDate) ||
      startDate < today
    ) {
      return NextResponse.json({ error: "Enter a valid activity, frequency, amount, and start date of today or later." }, { status: 400 });
    }

    const config = impactFactors[category];
    const schedule: ActivitySchedule = {
      id: randomUUID(),
      category,
      action,
      quantity,
      unit: config.unit,
      co2e: Number((quantity * config.factor).toFixed(2)),
      frequency,
      startDate,
      nextRunDate: startDate,
      note: note || undefined,
      active: true,
      createdAt: new Date().toISOString(),
    };
    const user = await createSchedule(session.sub, schedule);
    return NextResponse.json({ schedule, user: safeUser(user) }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateScheduleError) {
      return NextResponse.json({ error: "An identical schedule already exists." }, { status: 409 });
    }
    console.error("Schedule creation failed", error);
    return NextResponse.json({ error: "Unable to create this schedule." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await userSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const body = await request.json();
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "Schedule ID is required." }, { status: 400 });
    const user = await setScheduleActive(session.sub, id, body.active === true);
    return NextResponse.json({ user: safeUser(user) });
  } catch (error) {
    console.error("Schedule update failed", error);
    return NextResponse.json({ error: "Unable to update this schedule." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await userSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const body = await request.json();
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "Schedule ID is required." }, { status: 400 });
    const user = await deleteSchedule(session.sub, id);
    return NextResponse.json({ user: safeUser(user) });
  } catch (error) {
    console.error("Schedule deletion failed", error);
    return NextResponse.json({ error: "Unable to remove this schedule." }, { status: 500 });
  }
}
