import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { bulkAddImpacts } from "@/lib/db";
import { buildImpact, impactFactors } from "@/lib/impacts";
import { safeUser, type Impact } from "@/lib/types";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 500;
const expectedHeaders = ["date", "category", "activity", "quantity", "note"];

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value) return String(value.text);
    if ("result" in value && value.result !== undefined) return String(value.result);
    if ("richText" in value) return value.richText.map((part) => part.text).join("");
  }
  return String(value);
}

function parseDate(value: ExcelJS.CellValue): string | null {
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number") {
    date = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
  } else {
    const text = cellText(value).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
    date = new Date(`${text}T12:00:00Z`);
  }
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "user") return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ error: "Choose the completed .xlsx activity template." }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "The workbook must be 5 MB or smaller." }, { status: 400 });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as never);
    const sheet = workbook.getWorksheet("Activities");
    if (!sheet) return NextResponse.json({ error: "The workbook must contain an Activities worksheet." }, { status: 400 });

    const headers = expectedHeaders.map((_, index) => sheet.getRow(7).getCell(index + 1).text.trim().toLowerCase());
    if (!expectedHeaders.every((header, index) => headers[index] === header)) {
      return NextResponse.json({ error: "The Activities headers were changed. Download a fresh template and try again." }, { status: 400 });
    }

    const impacts: Impact[] = [];
    const invalidRows: Array<{ row: number; error: string }> = [];
    const seen = new Set<string>();
    let duplicateRows = 0;
    let populatedRows = 0;

    for (let rowNumber = 8; rowNumber <= 507; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const raw = [1, 2, 3, 4, 5].map((column) => row.getCell(column).value);
      if (raw.every((value) => cellText(value).trim() === "")) continue;
      populatedRows += 1;
      if (populatedRows > MAX_ROWS) break;

      const date = parseDate(raw[0]);
      const category = cellText(raw[1]).trim().toLowerCase() as Impact["category"];
      const action = cellText(raw[2]).trim().slice(0, 120);
      const quantity = Number(cellText(raw[3]).trim());
      const note = cellText(raw[4]).trim().slice(0, 240);
      if (!date || !impactFactors[category] || action.length < 2 || !Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) {
        invalidRows.push({ row: rowNumber, error: "Use a valid date, category, activity, and positive quantity." });
        continue;
      }

      const duplicateKey = [date, category, action.toLowerCase(), quantity.toFixed(2)].join("|");
      if (seen.has(duplicateKey)) {
        duplicateRows += 1;
        continue;
      }
      seen.add(duplicateKey);
      impacts.push(buildImpact({ category, action, quantity, date, note: note || undefined, source: "bulk" }));
    }

    if (!populatedRows) return NextResponse.json({ error: "Add at least one activity to the Activities worksheet." }, { status: 400 });
    if (!impacts.length) {
      return NextResponse.json({ error: "No valid new activities were found.", invalidRows, duplicates: duplicateRows }, { status: 400 });
    }

    const result = await bulkAddImpacts(session.sub, impacts);
    const databaseDuplicates = impacts.length - result.inserted;
    return NextResponse.json({
      inserted: result.inserted,
      duplicates: duplicateRows + databaseDuplicates,
      invalid: invalidRows.length,
      invalidRows: invalidRows.slice(0, 20),
      user: safeUser(result.user),
    });
  } catch (error) {
    console.error("Activity import failed", error);
    return NextResponse.json({ error: "Unable to read this workbook. Download a fresh template and try again." }, { status: 400 });
  }
}
