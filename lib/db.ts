import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { GoalAssessment, Impact, UserRecord } from "./types";

type SqlRow = Record<string, unknown>;

const USER_SELECT = `
  SELECT
    u.id,
    u.email,
    u.display_name,
    u.password_hash,
    u.password_salt,
    u.account_type,
    u.organization,
    u.city,
    u.goals,
    u.created_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', i.id,
            'category', i.category,
            'action', i.action,
            'quantity', i.quantity,
            'unit', i.unit,
            'co2e', i.co2e,
            'date', i.action_date,
            'note', i.note,
            'createdAt', i.created_at
          ) ORDER BY i.created_at DESC
        )
        FROM sustainability_impacts i
        WHERE i.user_id = u.id
      ),
      '[]'::jsonb
    ) AS impacts,
    ga.answers AS goal_answers,
    ga.recommendations AS goal_recommendations,
    ga.completed_at AS goal_completed_at
  FROM community_users u
  LEFT JOIN goal_assessments ga ON ga.user_id = u.id
`;

let cachedSql: NeonQueryFunction<false, false> | undefined;

export class DatabaseConfigurationError extends Error {
  constructor() {
    super("Neon Postgres is not configured. Add DATABASE_URL to this deployment.");
    this.name = "DatabaseConfigurationError";
  }
}

export class DuplicateEmailError extends Error {
  constructor() {
    super("EMAIL_EXISTS");
    this.name = "DuplicateEmailError";
  }
}

function databaseUrl() {
  const value = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!value) throw new DatabaseConfigurationError();
  return value;
}

function sql() {
  cachedSql ??= neon(databaseUrl());
  return cachedSql;
}

function timestamp(value: unknown) {
  return new Date(String(value)).toISOString();
}

function mapImpact(value: unknown): Impact {
  const row = value as SqlRow;
  return {
    id: String(row.id),
    category: String(row.category) as Impact["category"],
    action: String(row.action),
    quantity: Number(row.quantity),
    unit: String(row.unit),
    co2e: Number(row.co2e),
    date: String(row.date).slice(0, 10),
    note: row.note ? String(row.note) : undefined,
    createdAt: timestamp(row.createdAt),
  };
}

function mapUser(row: SqlRow): UserRecord {
  const goals = Array.isArray(row.goals) ? row.goals.map(String) : [];
  const impacts = Array.isArray(row.impacts) ? row.impacts.map(mapImpact) : [];
  const goalAssessment: GoalAssessment | undefined = row.goal_answers && row.goal_recommendations && row.goal_completed_at
    ? {
        answers: row.goal_answers as GoalAssessment["answers"],
        recommendations: row.goal_recommendations as GoalAssessment["recommendations"],
        completedAt: timestamp(row.goal_completed_at),
      }
    : undefined;

  return {
    id: String(row.id),
    email: String(row.email),
    displayName: String(row.display_name),
    passwordHash: String(row.password_hash),
    passwordSalt: String(row.password_salt),
    accountType: String(row.account_type) as UserRecord["accountType"],
    organization: row.organization ? String(row.organization) : undefined,
    city: row.city ? String(row.city) : undefined,
    goals,
    goalAssessment,
    createdAt: timestamp(row.created_at),
    impacts,
  };
}

function isUniqueViolation(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}

export async function createUser(record: UserRecord): Promise<UserRecord> {
  try {
    await sql().query(
      `INSERT INTO community_users (
        id, email, display_name, password_hash, password_salt, account_type,
        organization, city, goals, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)`,
      [
        record.id,
        record.email,
        record.displayName,
        record.passwordHash,
        record.passwordSalt,
        record.accountType,
        record.organization ?? null,
        record.city ?? null,
        JSON.stringify(record.goals),
        record.createdAt,
      ],
    );
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateEmailError();
    throw error;
  }

  return record;
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const rows = await sql().query(`${USER_SELECT} WHERE lower(u.email) = lower($1) LIMIT 1`, [email]);
  return rows[0] ? mapUser(rows[0] as SqlRow) : null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const rows = await sql().query(`${USER_SELECT} WHERE u.id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapUser(rows[0] as SqlRow) : null;
}

export async function listUsers(): Promise<UserRecord[]> {
  const rows = await sql().query(`${USER_SELECT} ORDER BY u.created_at DESC`);
  return rows.map((row) => mapUser(row as SqlRow));
}

export async function countUsers(): Promise<number> {
  const rows = await sql().query("SELECT count(*)::integer AS count FROM community_users");
  return Number((rows[0] as SqlRow | undefined)?.count ?? 0);
}

export async function addImpact(userId: string, impact: Impact): Promise<UserRecord> {
  try {
    await sql().query(
      `INSERT INTO sustainability_impacts (
        id, user_id, category, action, quantity, unit, co2e, action_date, note, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        impact.id,
        userId,
        impact.category,
        impact.action,
        impact.quantity,
        impact.unit,
        impact.co2e,
        impact.date,
        impact.note ?? null,
        impact.createdAt,
      ],
    );
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23503") {
      throw new Error("USER_NOT_FOUND");
    }
    throw error;
  }

  const user = await findUserById(userId);
  if (!user) throw new Error("USER_NOT_FOUND");
  return user;
}

export async function saveGoalAssessment(userId: string, assessment: GoalAssessment): Promise<UserRecord> {
  const goals = assessment.recommendations.map((item) => item.title);
  const rows = await sql().query(
    `WITH updated_user AS (
      UPDATE community_users
      SET goals = $2::jsonb
      WHERE id = $1
      RETURNING id
    )
    INSERT INTO goal_assessments (user_id, answers, recommendations, completed_at)
    SELECT id, $3::jsonb, $4::jsonb, $5 FROM updated_user
    ON CONFLICT (user_id) DO UPDATE SET
      answers = EXCLUDED.answers,
      recommendations = EXCLUDED.recommendations,
      completed_at = EXCLUDED.completed_at
    RETURNING user_id`,
    [
      userId,
      JSON.stringify(goals),
      JSON.stringify(assessment.answers),
      JSON.stringify(assessment.recommendations),
      assessment.completedAt,
    ],
  );
  if (!rows[0]) throw new Error("USER_NOT_FOUND");

  const user = await findUserById(userId);
  if (!user) throw new Error("USER_NOT_FOUND");
  return user;
}
