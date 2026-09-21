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
  createdAt: string;
};

export type UserRecord = {
  id: string;
  email: string;
  displayName: string;
  organization?: string;
  accountType: AccountType;
  city?: string;
  goals: string[];
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  impacts: Impact[];
};

export type Database = { version: 1; createdAt: string; users: UserRecord[] };

export type SafeUser = Omit<UserRecord, "passwordHash" | "passwordSalt">;

export function safeUser(user: UserRecord): SafeUser {
  const { passwordHash: _hash, passwordSalt: _salt, ...safe } = user;
  return safe;
}
