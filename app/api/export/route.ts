import { getSession } from "@/lib/auth";
import { readDatabase } from "@/lib/db";

function csv(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "user") return new Response("Unauthorized", { status: 401 });
  const db = await readDatabase();
  const user = db.users.find((item) => item.id === session.sub);
  if (!user) return new Response("Not found", { status: 404 });
  const header = ["Date", "Category", "Activity", "Quantity", "Unit", "Estimated kg CO2e saved", "Note"];
  const rows = user.impacts.map((item) => [item.date, item.category, item.action, item.quantity, item.unit, item.co2e, item.note || ""]);
  const output = [header, ...rows].map((row) => row.map(csv).join(",")).join("\r\n");
  return new Response(output, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="igreen-impact-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
