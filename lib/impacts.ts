import { randomUUID } from "node:crypto";
import type { Impact } from "./types";

export const impactFactors: Record<Impact["category"], { factor: number; unit: string }> = {
  transport: { factor: 0.21, unit: "km avoided" },
  energy: { factor: 0.39, unit: "kWh saved" },
  food: { factor: 1.8, unit: "plant-based meals" },
  waste: { factor: 0.46, unit: "kg diverted" },
  water: { factor: 0.0003, unit: "liters saved" },
};

export function buildImpact(input: {
  category: Impact["category"];
  action: string;
  quantity: number;
  date: string;
  note?: string;
  source?: Impact["source"];
  scheduleId?: string;
}): Impact {
  const config = impactFactors[input.category];
  return {
    id: randomUUID(),
    category: input.category,
    action: input.action,
    quantity: input.quantity,
    unit: config.unit,
    co2e: Number((input.quantity * config.factor).toFixed(2)),
    date: input.date,
    note: input.note,
    source: input.source ?? "manual",
    scheduleId: input.scheduleId,
    createdAt: new Date().toISOString(),
  };
}
