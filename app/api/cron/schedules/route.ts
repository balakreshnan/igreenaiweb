import { NextResponse } from "next/server";
import { populateDueActivities } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const inserted = await populateDueActivities();
    return NextResponse.json({ ok: true, inserted });
  } catch (error) {
    console.error("Scheduled activity population failed", error);
    return NextResponse.json({ error: "Schedule processing failed." }, { status: 500 });
  }
}
