import { get, put } from "@vercel/blob";
import type { Database } from "./types";

const DATA_PATH = "private/igreen-data.json";
const emptyDatabase = (): Database => ({
  version: 1,
  createdAt: new Date().toISOString(),
  users: [],
});

declare global {
  // Development fallback is intentionally memory-only: no personal data file is created locally.
  var __igreenMemoryDb: Database | undefined;
  var __igreenWriteQueue: Promise<void> | undefined;
}

export async function readDatabase(): Promise<Database> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    globalThis.__igreenMemoryDb ??= emptyDatabase();
    return structuredClone(globalThis.__igreenMemoryDb);
  }

  const result = await get(DATA_PATH, { access: "private" });
  if (!result || !result.stream) return emptyDatabase();
  const text = await new Response(result.stream).text();
  return JSON.parse(text) as Database;
}

export async function writeDatabase(data: Database): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    globalThis.__igreenMemoryDb = structuredClone(data);
    return;
  }

  await put(DATA_PATH, JSON.stringify(data, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function updateDatabase<T>(mutate: (db: Database) => T | Promise<T>): Promise<T> {
  let result!: T;
  const prior = globalThis.__igreenWriteQueue ?? Promise.resolve();
  const next = prior.then(async () => {
    const db = await readDatabase();
    result = await mutate(db);
    await writeDatabase(db);
  });
  globalThis.__igreenWriteQueue = next.catch(() => undefined);
  await next;
  return result;
}
