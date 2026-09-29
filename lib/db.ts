import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { ActivitySchedule, GoalAssessment, Impact, UserRecord } from "./types";

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
            'source', i.source,
            'scheduleId', i.schedule_id,
            'createdAt', i.created_at
          ) ORDER BY i.created_at DESC
        )
        FROM sustainability_impacts i
        WHERE i.user_id = u.id
      ),
      '[]'::jsonb
    ) AS impacts,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', s.id,
            'category', s.category,
            'action', s.action,
            'quantity', s.quantity,
            'unit', s.unit,
            'co2e', s.co2e,
            'frequency', s.frequency,
            'startDate', s.start_date,
            'nextRunDate', s.next_run_date,
            'note', s.note,
            'active', s.active,
            'createdAt', s.created_at
          ) ORDER BY s.created_at DESC
        )
        FROM activity_schedules s
        WHERE s.user_id = u.id
      ),
      '[]'::jsonb
    ) AS schedules,
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

export class DuplicateImpactError extends Error {
  constructor() {
    super("IMPACT_EXISTS");
    this.name = "DuplicateImpactError";
  }
}

export class DuplicateScheduleError extends Error {
  constructor() {
    super("SCHEDULE_EXISTS");
    this.name = "DuplicateScheduleError";
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
    source: row.source ? String(row.source) as Impact["source"] : "manual",
    scheduleId: row.scheduleId ? String(row.scheduleId) : undefined,
    createdAt: timestamp(row.createdAt),
  };
}

function mapSchedule(value: unknown): ActivitySchedule {
  const row = value as SqlRow;
  return {
    id: String(row.id),
    category: String(row.category) as ActivitySchedule["category"],
    action: String(row.action),
    quantity: Number(row.quantity),
    unit: String(row.unit),
    co2e: Number(row.co2e),
    frequency: String(row.frequency) as ActivitySchedule["frequency"],
    startDate: String(row.startDate).slice(0, 10),
    nextRunDate: String(row.nextRunDate).slice(0, 10),
    note: row.note ? String(row.note) : undefined,
    active: Boolean(row.active),
    createdAt: timestamp(row.createdAt),
  };
}

function mapUser(row: SqlRow): UserRecord {
  const goals = Array.isArray(row.goals) ? row.goals.map(String) : [];
  const impacts = Array.isArray(row.impacts) ? row.impacts.map(mapImpact) : [];
  const schedules = Array.isArray(row.schedules) ? row.schedules.map(mapSchedule) : [];
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
    schedules,
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

export async function populateDueActivities(userId?: string): Promise<number> {
  const rows = await sql().query(
    `WITH due AS (
      SELECT
        s.id AS schedule_id,
        s.user_id,
        s.category,
        s.action,
        s.quantity,
        s.unit,
        s.co2e,
        s.note,
        occurrence::date AS occurrence_date
      FROM activity_schedules s
      CROSS JOIN LATERAL generate_series(
        s.next_run_date::timestamp,
        CURRENT_DATE::timestamp,
        CASE s.frequency
          WHEN 'daily' THEN interval '1 day'
          WHEN 'weekly' THEN interval '7 days'
          ELSE interval '1 month'
        END
      ) occurrence
      WHERE s.active = true
        AND s.next_run_date <= CURRENT_DATE
        AND ($1::uuid IS NULL OR s.user_id = $1::uuid)
    ),
    inserted AS (
      INSERT INTO sustainability_impacts (
        id, user_id, category, action, quantity, unit, co2e,
        action_date, note, source, schedule_id, created_at
      )
      SELECT
        gen_random_uuid(), user_id, category, action, quantity, unit, co2e,
        occurrence_date, note, 'schedule', schedule_id, now()
      FROM due
      ON CONFLICT DO NOTHING
      RETURNING id
    ),
    advanced AS (
      UPDATE activity_schedules schedule
      SET next_run_date = CASE schedule.frequency
        WHEN 'daily' THEN due_dates.last_date + 1
        WHEN 'weekly' THEN due_dates.last_date + 7
        ELSE (due_dates.last_date + interval '1 month')::date
      END
      FROM (
        SELECT schedule_id, max(occurrence_date) AS last_date
        FROM due
        GROUP BY schedule_id
      ) due_dates
      WHERE schedule.id = due_dates.schedule_id
      RETURNING schedule.id
    )
    SELECT (SELECT count(*)::integer FROM inserted) AS inserted_count`,
    [userId ?? null],
  );
  return Number((rows[0] as SqlRow | undefined)?.inserted_count ?? 0);
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const identity = await sql().query("SELECT id FROM community_users WHERE lower(email) = lower($1) LIMIT 1", [email]);
  if (!identity[0]) return null;
  await populateDueActivities(String((identity[0] as SqlRow).id));
  const rows = await sql().query(`${USER_SELECT} WHERE lower(u.email) = lower($1) LIMIT 1`, [email]);
  return rows[0] ? mapUser(rows[0] as SqlRow) : null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  await populateDueActivities(id);
  const rows = await sql().query(`${USER_SELECT} WHERE u.id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapUser(rows[0] as SqlRow) : null;
}

export async function listUsers(): Promise<UserRecord[]> {
  await populateDueActivities();
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
    if (isUniqueViolation(error)) throw new DuplicateImpactError();
    throw error;
  }

  const user = await findUserById(userId);
  if (!user) throw new Error("USER_NOT_FOUND");
  return user;
}

export async function bulkAddImpacts(userId: string, impacts: Impact[]): Promise<{ inserted: number; user: UserRecord }> {
  if (!impacts.length) {
    const user = await findUserById(userId);
    if (!user) throw new Error("USER_NOT_FOUND");
    return { inserted: 0, user };
  }

  const rows = await sql().query(
    `WITH input AS (
      SELECT * FROM jsonb_to_recordset($2::jsonb) AS item(
        id uuid,
        category text,
        action text,
        quantity numeric,
        unit text,
        co2e numeric,
        action_date date,
        note text,
        created_at timestamptz
      )
    ),
    inserted AS (
      INSERT INTO sustainability_impacts (
        id, user_id, category, action, quantity, unit, co2e,
        action_date, note, source, created_at
      )
      SELECT id, $1, category, action, quantity, unit, co2e,
        action_date, note, 'bulk', created_at
      FROM input
      ON CONFLICT DO NOTHING
      RETURNING id
    )
    SELECT count(*)::integer AS inserted_count FROM inserted`,
    [
      userId,
      JSON.stringify(impacts.map((impact) => ({
        id: impact.id,
        category: impact.category,
        action: impact.action,
        quantity: impact.quantity,
        unit: impact.unit,
        co2e: impact.co2e,
        action_date: impact.date,
        note: impact.note ?? null,
        created_at: impact.createdAt,
      }))),
    ],
  );
  const user = await findUserById(userId);
  if (!user) throw new Error("USER_NOT_FOUND");
  return { inserted: Number((rows[0] as SqlRow | undefined)?.inserted_count ?? 0), user };
}

export async function createSchedule(userId: string, schedule: ActivitySchedule): Promise<UserRecord> {
  try {
    await sql().query(
      `INSERT INTO activity_schedules (
        id, user_id, category, action, quantity, unit, co2e, frequency,
        start_date, next_run_date, note, active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        schedule.id,
        userId,
        schedule.category,
        schedule.action,
        schedule.quantity,
        schedule.unit,
        schedule.co2e,
        schedule.frequency,
        schedule.startDate,
        schedule.nextRunDate,
        schedule.note ?? null,
        schedule.active,
        schedule.createdAt,
      ],
    );
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateScheduleError();
    if (error && typeof error === "object" && "code" in error && error.code === "23503") throw new Error("USER_NOT_FOUND");
    throw error;
  }
  const user = await findUserById(userId);
  if (!user) throw new Error("USER_NOT_FOUND");
  return user;
}

export async function setScheduleActive(userId: string, scheduleId: string, active: boolean): Promise<UserRecord> {
  const rows = await sql().query(
    `UPDATE activity_schedules
     SET active = $3,
         next_run_date = CASE WHEN $3 THEN greatest(next_run_date, CURRENT_DATE) ELSE next_run_date END
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [scheduleId, userId, active],
  );
  if (!rows[0]) throw new Error("SCHEDULE_NOT_FOUND");
  const user = await findUserById(userId);
  if (!user) throw new Error("USER_NOT_FOUND");
  return user;
}

export async function deleteSchedule(userId: string, scheduleId: string): Promise<UserRecord> {
  const rows = await sql().query(
    "DELETE FROM activity_schedules WHERE id = $1 AND user_id = $2 RETURNING id",
    [scheduleId, userId],
  );
  if (!rows[0]) throw new Error("SCHEDULE_NOT_FOUND");
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
