import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Set DATABASE_URL_UNPOOLED or DATABASE_URL before applying the schema.");
}

const schemaUrl = new URL("./schema.sql", import.meta.url);
const schema = await readFile(schemaUrl, "utf8");
const statements = schema
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

const sql = neon(connectionString);
for (const statement of statements) {
  await sql.query(statement);
}

const tables = await sql.query(
  `SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN ('community_users', 'sustainability_impacts', 'goal_assessments')
   ORDER BY table_name`,
);

console.log(`Schema ready: ${tables.map((row) => row.table_name).join(", ")}`);
