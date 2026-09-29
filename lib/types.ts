export type AccountType = "personal" | "business" | "corporate";

export type Impact = {
  id: string;
  category: "transport" | "energy" | "food" | "waste" | "water";
  action: string;
  quantity: number;
  unit: string;
  co2e: number;
  date: string;
  note?: string;
  source?: "manual" | "schedule" | "bulk";
  scheduleId?: string;
  createdAt: string;
};

export type ActivitySchedule = {
  id: string;
  category: Impact["category"];
  action: string;
  quantity: number;
  unit: string;
  co2e: number;
  frequency: "daily" | "weekly" | "monthly";
  startDate: string;
  nextRunDate: string;
  note?: string;
  active: boolean;
  createdAt: string;
};

export type GoalAnswers = {
  focus: "climate" | "cost" | "wellbeing" | "community";
  pace: "starter" | "steady" | "leader";
  setting: "rent" | "own" | "workplace";
  transport: "car" | "mixed" | "low-carbon" | "remote";
  food: "omnivore" | "flexitarian" | "plant-forward";
  barrier: "time" | "cost" | "knowledge" | "support";
};

export type GoalRecommendation = {
  id: string;
  category: Impact["category"] | "community";
  title: string;
  description: string;
  why: string;
  effort: "Quick win" | "Build a habit" | "Lead change";
  frequency: string;
};

export type GoalAssessment = {
  answers: GoalAnswers;
  recommendations: GoalRecommendation[];
  completedAt: string;
};

export type UserRecord = {
  id: string;
  email: string;
  displayName: string;
  organization?: string;
  accountType: AccountType;
  city?: string;
  goals: string[];
  goalAssessment?: GoalAssessment;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  impacts: Impact[];
  schedules: ActivitySchedule[];
};

export type Database = { version: 1; createdAt: string; users: UserRecord[] };

export type SafeUser = Omit<UserRecord, "passwordHash" | "passwordSalt">;

export function safeUser(user: UserRecord): SafeUser {
  const { passwordHash: _hash, passwordSalt: _salt, ...safe } = user;
  return safe;
}
