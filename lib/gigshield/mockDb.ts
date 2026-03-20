import type { Claim, OtpRecord, Policy, SessionRecord, User } from "./types";

type MockDb = {
  usersById: Map<string, User>;
  usersByPhone: Map<string, string>;
  policies: Policy[];
  claims: Claim[];
  otpByPhone: Map<string, OtpRecord>;
  sessions: Map<string, SessionRecord>;
  seeded: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __gigshield_db: MockDb | undefined;
}

function createSeededDb(): MockDb {
  const db: MockDb = {
    usersById: new Map(),
    usersByPhone: new Map(),
    policies: [],
    claims: [],
    otpByPhone: new Map(),
    sessions: new Map(),
    seeded: true,
  };

  // --- Seed dummy data (for a better first run) ---
  const now = Date.now();
  const adminId = "u_admin_1";
  const userAId = "u_user_1";
  const userBId = "u_user_2";

  const admin: User = {
    id: adminId,
    phone: "9000000000",
    createdAt: now - 1000 * 60 * 60 * 24 * 10,
    role: "admin",
    profile: {
      name: "Aarav (Admin)",
      city: "Delhi",
      platform: "Swiggy",
      avgDailyIncomeInr: 1100,
      workingHoursPerDay: 8,
    },
  };
  const userA: User = {
    id: userAId,
    phone: "9011111111",
    createdAt: now - 1000 * 60 * 60 * 24 * 5,
    role: "user",
    profile: {
      name: "Meera",
      city: "Mumbai",
      platform: "Zomato",
      avgDailyIncomeInr: 950,
      workingHoursPerDay: 7,
    },
  };
  const userB: User = {
    id: userBId,
    phone: "9022222222",
    createdAt: now - 1000 * 60 * 60 * 24 * 2,
    role: "user",
    profile: {
      name: "Kabir",
      city: "Bengaluru",
      platform: "Amazon Flex",
      avgDailyIncomeInr: 850,
      workingHoursPerDay: 6,
    },
  };

  [admin, userA, userB].forEach((u) => {
    db.usersById.set(u.id, u);
    db.usersByPhone.set(u.phone, u.id);
  });

  // Policies will be generated on-demand for the current ISO week,
  // but we add historical claims for analytics.
  const weekKey = "seed-week";
  db.policies.push(
    {
      id: `pol_${adminId}_${weekKey}`,
      userId: adminId,
      weekKey,
      createdAt: now - 1000 * 60 * 60 * 24 * 2,
      weeklyPremiumInr: 70,
      coveragePercent: 75,
      active: true,
      lastRiskScore: 70,
    },
    {
      id: `pol_${userAId}_${weekKey}`,
      userId: userAId,
      weekKey,
      createdAt: now - 1000 * 60 * 60 * 24 * 2,
      weeklyPremiumInr: 55,
      coveragePercent: 65,
      active: true,
      lastRiskScore: 55,
    },
    {
      id: `pol_${userBId}_${weekKey}`,
      userId: userBId,
      weekKey,
      createdAt: now - 1000 * 60 * 60 * 24 * 2,
      weeklyPremiumInr: 45,
      coveragePercent: 60,
      active: false,
      lastRiskScore: 45,
    }
  );

  // Seed claims to demonstrate fraud flags / charts.
  const baseWeatherA = {
    city: "Mumbai",
    temperatureC: 41,
    heatIndex: 44,
    rainProbability: 0.65,
    rainfallMm: 33,
    aqi: 210,
    pollutionLevel: 230,
  };
  const baseWeatherB = {
    city: "Mumbai", // intentionally mismatched vs Bengaluru -> LOCATION_MISMATCH
    temperatureC: 36,
    heatIndex: 38,
    rainProbability: 0.35,
    rainfallMm: 8,
    aqi: 160,
    pollutionLevel: 140,
  };

  db.claims.push(
    {
      id: "claim_seed_1",
      userId: userAId,
      createdAt: now - 1000 * 60 * 50,
      weekKey,
      status: "paid",
      trigger: {
        rainfallExceeded: true,
        temperatureExceeded: true,
        aqiExceeded: true,
        rainfallThresholdMm: 25,
        temperatureThresholdC: 38,
        aqiThreshold: 180,
      },
      weatherSnapshot: baseWeatherA,
      incomeLossInr: 3800,
      payoutInr: 2470,
      paymentMethod: "UPI_MOCK",
      fraudFlags: ["MULTIPLE_CLAIMS_SHORT_WINDOW"],
    },
    {
      id: "claim_seed_2",
      userId: userAId,
      createdAt: now - 1000 * 60 * 42, // ~8 minutes later
      weekKey,
      status: "paid",
      trigger: {
        rainfallExceeded: false,
        temperatureExceeded: true,
        aqiExceeded: true,
        rainfallThresholdMm: 25,
        temperatureThresholdC: 38,
        aqiThreshold: 180,
      },
      weatherSnapshot: baseWeatherA,
      incomeLossInr: 2900,
      payoutInr: 1885,
      paymentMethod: "UPI_MOCK",
      fraudFlags: ["MULTIPLE_CLAIMS_SHORT_WINDOW"],
    },
    {
      id: "claim_seed_3",
      userId: userBId,
      createdAt: now - 1000 * 60 * 80,
      weekKey,
      status: "paid",
      trigger: {
        rainfallExceeded: true,
        temperatureExceeded: false,
        aqiExceeded: false,
        rainfallThresholdMm: 25,
        temperatureThresholdC: 38,
        aqiThreshold: 180,
      },
      weatherSnapshot: baseWeatherB,
      incomeLossInr: 2400,
      payoutInr: 1440,
      paymentMethod: "UPI_MOCK",
      fraudFlags: ["LOCATION_MISMATCH"],
    },
    {
      id: "claim_seed_4",
      userId: userBId,
      createdAt: now - 1000 * 60 * 20,
      weekKey,
      status: "paid",
      trigger: {
        rainfallExceeded: true,
        temperatureExceeded: false,
        aqiExceeded: false,
        rainfallThresholdMm: 25,
        temperatureThresholdC: 38,
        aqiThreshold: 180,
      },
      weatherSnapshot: undefined, // NO_WEATHER_MATCH
      incomeLossInr: 1200,
      payoutInr: 720,
      paymentMethod: "UPI_MOCK",
      fraudFlags: ["NO_WEATHER_MATCH"],
    }
  );

  return db;
}

export function getDb() {
  if (!globalThis.__gigshield_db) {
    globalThis.__gigshield_db = createSeededDb();
  }
  return globalThis.__gigshield_db;
}

export function getUserById(userId: string) {
  return getDb().usersById.get(userId);
}

export function getUserByPhone(phone: string) {
  const db = getDb();
  const userId = db.usersByPhone.get(phone);
  if (!userId) return undefined;
  return db.usersById.get(userId);
}

export function createUserIfMissingByPhone(args: {
  phone: string;
  role?: "user" | "admin";
}) {
  const db = getDb();
  const { phone, role = "user" } = args;
  const existingId = db.usersByPhone.get(phone);
  if (existingId) return db.usersById.get(existingId) as User;

  const user: User = {
    id: `u_${phone}_${Math.floor(Math.random() * 10_000)}`,
    phone,
    createdAt: Date.now(),
    role,
  };
  db.usersById.set(user.id, user);
  db.usersByPhone.set(phone, user.id);
  return user;
}

export function upsertUserProfile(args: {
  userId: string;
  profile: NonNullable<User["profile"]>;
}) {
  const db = getDb();
  const user = db.usersById.get(args.userId);
  if (!user) return undefined;
  user.profile = args.profile;
  db.usersById.set(user.id, user);
  return user;
}

export function findPolicyForUser(args: { userId: string; weekKey: string }) {
  const db = getDb();
  return db.policies.find((p) => p.userId === args.userId && p.weekKey === args.weekKey);
}

export function upsertPolicy(args: { policy: Policy }) {
  const db = getDb();
  const idx = db.policies.findIndex((p) => p.id === args.policy.id);
  if (idx >= 0) db.policies[idx] = args.policy;
  else db.policies.push(args.policy);
  return args.policy;
}

export function setPolicyActive(args: { userId: string; weekKey: string; active: boolean }) {
  const db = getDb();
  const policy = db.policies.find((p) => p.userId === args.userId && p.weekKey === args.weekKey);
  if (!policy) return undefined;
  policy.active = args.active;
  return policy;
}

export function getPoliciesForUser(args: { userId: string }) {
  return getDb().policies.filter((p) => p.userId === args.userId);
}

export function getClaimsForUser(args: { userId: string }) {
  return getDb().claims
    .filter((c) => c.userId === args.userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function addClaim(args: { claim: Claim }) {
  getDb().claims.push(args.claim);
  return args.claim;
}

export function getRecentClaimsForUser(args: { userId: string; withinMinutes: number }) {
  const cutoff = Date.now() - args.withinMinutes * 60_000;
  return getDb()
    .claims.filter((c) => c.userId === args.userId && c.createdAt >= cutoff)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function createOtpForPhone(args: { phone: string; otp: string; expiresAt: number }) {
  getDb().otpByPhone.set(args.phone, { otp: args.otp, expiresAt: args.expiresAt, attempts: 0 });
}

export function consumeOtpVerification(args: { phone: string; otp: string; now: number }) {
  const record = getDb().otpByPhone.get(args.phone);
  if (!record) return { ok: false, reason: "NO_OTP" as const };
  if (args.now > record.expiresAt) return { ok: false, reason: "EXPIRED" as const };

  record.attempts += 1;
  if (record.otp !== args.otp) return { ok: false, reason: "INVALID_OTP" as const };
  return { ok: true, record };
}

export function createSession(args: { userId: string; expiresAt: number }) {
  const sessionId = `sess_${args.userId}_${Math.random().toString(16).slice(2)}`;
  const session: SessionRecord = { userId: args.userId, expiresAt: args.expiresAt };
  getDb().sessions.set(sessionId, session);
  return sessionId;
}

export function getUserIdFromSession(args: { sessionId: string; now: number }) {
  const session = getDb().sessions.get(args.sessionId);
  if (!session) return undefined;
  if (now > session.expiresAt) return undefined;
  return session.userId;
}

export function getAdminUserIds() {
  return Array.from(getDb().usersById.values())
    .filter((u) => u.role === "admin")
    .map((u) => u.id);
}

