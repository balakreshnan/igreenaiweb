import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateDatabase } from "@/lib/db";
import { recommendGoals } from "@/lib/goals";
import { safeUser, type GoalAnswers } from "@/lib/types";

const allowed = {
  focus: ["climate", "cost", "wellbeing", "community"],
  pace: ["starter", "steady", "leader"],
  setting: ["rent", "own", "workplace"],
  transport: ["car", "mixed", "low-carbon", "remote"],
  food: ["omnivore", "flexitarian", "plant-forward"],
  barrier: ["time", "cost", "knowledge", "support"],
} as const;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "user") return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const body = await request.json() as Partial<GoalAnswers>;
    const valid = Object.entries(allowed).every(([key, values]) => values.includes(String(body[key as keyof GoalAnswers]) as never));
    if (!valid) return NextResponse.json({ error: "Please answer every question." }, { status: 400 });
    const answers = body as GoalAnswers;
    const user = await updateDatabase((db) => {
      const record = db.users.find((item) => item.id === session.sub);
      if (!record) throw new Error("USER_NOT_FOUND");
      const generated = recommendGoals(answers, record.accountType);
      record.goals = generated.map((item) => item.title);
      record.goalAssessment = { answers, recommendations: generated, completedAt: new Date().toISOString() };
      return safeUser(record);
    });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Goal assessment failed", error);
    return NextResponse.json({ error: "Unable to save your recommendations." }, { status: 500 });
  }
}
