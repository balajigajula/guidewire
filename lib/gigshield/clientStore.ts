import type {
  Claim,
  OtpRecord,
  Policy,
  RiskSummary,
  SessionRecord,
  User,
  UserProfile,
  WeatherSnapshot,
} from "./types";
import { clamp, getIsoWeekKey, roundToStep } from "./utils";
import { getMockWeatherSnapshot, TRIGGER_THRESHOLDS, getCityRiskIndex } from "./mockWeather";
import { calculateRiskSummary } from "./riskEngine";
import { buildTriggerReason } from "./claimsEngine";
import { evaluateTrigger } from "./triggerEngine";
import { detectFraud } from "./fraudEngine";
import { getMockTrafficSnapshot } from "./mockTraffic";

const STORAGE_KEY = "gigshield_state_v1";
const SESSION_KEY = "gigshield_session_id_v1";

type PersistedState = {
  users: User[];
  policies: Policy[];
  claims: Claim[];
  otpByPhone: Record<string, OtpRecord>;
  sessionsById: Record<string, SessionRecord>;
  seeded: boolean;
};

function now() {
  return Date.now();
}

function safeJsonParse<T>(s: string | null): T | undefined {
  if (!s) return undefined;
  try {
    return JSON.parse(s) as T;
  } catch {
    return undefined;
  }
}

function getDefaultSeedState(): PersistedState {
  const t = now();
  const adminId = "u_admin_1";
  const userAId = "u_user_1";
  const userBId = "u_user_2";

  const users: User[] = [
    {
      id: adminId,
      phone: "9000000000",
      createdAt: t - 1000 * 60 * 60 * 24 * 10,
      role: "admin",
      profile: {
        name: "Aarav (Admin)",
        city: "Delhi",
        platform: "Swiggy",
        avgDailyIncomeInr: 1100,
        workingHoursPerDay: 8,
      },
    },
    {
      id: userAId,
      phone: "9011111111",
      createdAt: t - 1000 * 60 * 60 * 24 * 5,
      role: "user",
      profile: {
        name: "Meera",
        city: "Mumbai",
        platform: "Zomato",
        avgDailyIncomeInr: 950,
        workingHoursPerDay: 7,
      },
    },
    {
      id: userBId,
      phone: "9022222222",
      createdAt: t - 1000 * 60 * 60 * 24 * 2,
      role: "user",
      profile: {
        name: "Kabir",
        city: "Bengaluru",
        platform: "Amazon Flex",
        avgDailyIncomeInr: 850,
        workingHoursPerDay: 6,
      },
    },
  ];

  const weekKey = "seed-week";
  const policies: Policy[] = [
    {
      id: `pol_${adminId}_${weekKey}`,
      userId: adminId,
      weekKey,
      createdAt: t - 1000 * 60 * 60 * 24 * 2,
      weeklyPremiumInr: 70,
      coveragePercent: 75,
      active: true,
      lastRiskScore: 70,
    },
    {
      id: `pol_${userAId}_${weekKey}`,
      userId: userAId,
      weekKey,
      createdAt: t - 1000 * 60 * 60 * 24 * 2,
      weeklyPremiumInr: 55,
      coveragePercent: 65,
      active: true,
      lastRiskScore: 55,
    },
    {
      id: `pol_${userBId}_${weekKey}`,
      userId: userBId,
      weekKey,
      createdAt: t - 1000 * 60 * 60 * 24 * 2,
      weeklyPremiumInr: 45,
      coveragePercent: 60,
      active: false,
      lastRiskScore: 45,
    },
  ];

  const baseWeatherA = {
    city: "Mumbai",
    temperatureC: 41,
    heatIndex: 44,
    rainProbability: 0.65,
    rainfallMm: 33,
    aqi: 210,
    pollutionLevel: 230,
  } satisfies WeatherSnapshot;

  const baseWeatherB = {
    city: "Mumbai", // intentionally mismatched vs Bengaluru
    temperatureC: 36,
    heatIndex: 38,
    rainProbability: 0.35,
    rainfallMm: 8,
    aqi: 160,
    pollutionLevel: 140,
  } satisfies WeatherSnapshot;

  const claims: Claim[] = [
    {
      id: "claim_seed_1",
      userId: userAId,
      createdAt: t - 1000 * 60 * 50,
      weekKey,
      status: "paid",
      trigger: {
        rainfallExceeded: true,
        temperatureExceeded: true,
        aqiExceeded: true,
        rainfallThresholdMm: TRIGGER_THRESHOLDS.rainfallThresholdMm,
        temperatureThresholdC: TRIGGER_THRESHOLDS.temperatureThresholdC,
        aqiThreshold: TRIGGER_THRESHOLDS.aqiThreshold,
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
      createdAt: t - 1000 * 60 * 42,
      weekKey,
      status: "paid",
      trigger: {
        rainfallExceeded: false,
        temperatureExceeded: true,
        aqiExceeded: true,
        rainfallThresholdMm: TRIGGER_THRESHOLDS.rainfallThresholdMm,
        temperatureThresholdC: TRIGGER_THRESHOLDS.temperatureThresholdC,
        aqiThreshold: TRIGGER_THRESHOLDS.aqiThreshold,
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
      createdAt: t - 1000 * 60 * 80,
      weekKey,
      status: "paid",
      trigger: {
        rainfallExceeded: true,
        temperatureExceeded: false,
        aqiExceeded: false,
        rainfallThresholdMm: TRIGGER_THRESHOLDS.rainfallThresholdMm,
        temperatureThresholdC: TRIGGER_THRESHOLDS.temperatureThresholdC,
        aqiThreshold: TRIGGER_THRESHOLDS.aqiThreshold,
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
      createdAt: t - 1000 * 60 * 20,
      weekKey,
      status: "paid",
      trigger: {
        rainfallExceeded: true,
        temperatureExceeded: false,
        aqiExceeded: false,
        rainfallThresholdMm: TRIGGER_THRESHOLDS.rainfallThresholdMm,
        temperatureThresholdC: TRIGGER_THRESHOLDS.temperatureThresholdC,
        aqiThreshold: TRIGGER_THRESHOLDS.aqiThreshold,
      },
      weatherSnapshot: undefined, // NO_WEATHER_MATCH
      incomeLossInr: 1200,
      payoutInr: 720,
      paymentMethod: "UPI_MOCK",
      fraudFlags: ["NO_WEATHER_MATCH"],
    },
  ];

  return {
    users,
    policies,
    claims,
    otpByPhone: {},
    sessionsById: {},
    seeded: true,
  };
}

function readState(): PersistedState {
  const fromStorage = safeJsonParse<PersistedState>(window.localStorage.getItem(STORAGE_KEY));
  if (fromStorage && fromStorage.users && fromStorage.policies && fromStorage.claims) return fromStorage;
  const seed = getDefaultSeedState();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function writeState(s: PersistedState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function generateOtp6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const OTP_TTL_MS = 1000 * 60 * 5;

export function authSendOtp(phoneRaw: string) {
  const phone = normalizePhone(phoneRaw);
  if (!phone || phone.length < 10) {
    throw new Error("PHONE_INVALID");
  }

  const state = readState();
  const otp = generateOtp6();
  state.otpByPhone[phone] = {
    otp,
    expiresAt: now() + OTP_TTL_MS,
    attempts: 0,
  };
  writeState(state);
  return { phone, otp }; // debug OTP always visible (frontend-only demo)
}

export function authVerifyOtp(args: { phoneRaw: string; otp: string }) {
  const phone = normalizePhone(args.phoneRaw);
  const otp = args.otp.trim();
  if (!phone || !otp) throw new Error("PHONE_AND_OTP_REQUIRED");

  const state = readState();
  const record = state.otpByPhone[phone];
  if (!record) throw new Error("NO_OTP");
  if (now() > record.expiresAt) throw new Error("EXPIRED");

  record.attempts += 1;
  if (record.otp !== otp) throw new Error("INVALID_OTP");

  let user = state.users.find((u) => u.phone === phone);
  if (!user) {
    // New users: normal user role by default.
    const userId = `u_${phone}_${Math.floor(Math.random() * 10_000)}`;
    user = { id: userId, phone, createdAt: now(), role: "user" };
    state.users.push(user);
  }

  const sessionId = `sess_${user.id}_${Math.random().toString(16).slice(2)}`;
  state.sessionsById[sessionId] = { userId: user.id, expiresAt: now() + SESSION_TTL_MS };
  writeState(state);
  window.localStorage.setItem(SESSION_KEY, sessionId);

  const needsOnboarding = !user.profile;
  window.dispatchEvent(new Event("gigshield_session_changed"));
  return { user, needsOnboarding };
}

export function authLogout() {
  window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("gigshield_session_changed"));
}

export function authGetCurrentUser(): User | null {
  const sessionId = window.localStorage.getItem(SESSION_KEY);
  if (!sessionId) return null;
  const state = readState();
  const session = state.sessionsById[sessionId];
  if (!session) return null;
  if (now() > session.expiresAt) return null;
  return state.users.find((u) => u.id === session.userId) ?? null;
}

export function profileSave(args: { userId: string; profile: NonNullable<UserProfile> }) {
  const state = readState();
  const user = state.users.find((u) => u.id === args.userId);
  if (!user) throw new Error("UNAUTHORIZED");
  user.profile = args.profile;
  writeState(state);
  window.dispatchEvent(new Event("gigshield_profile_changed"));
  return user;
}

export function getCurrentWeekKey(date = new Date()) {
  return getIsoWeekKey(date);
}

function ensurePolicyForCurrentWeek(args: { user: User }) {
  const state = readState();
  if (!args.user.profile) throw new Error("ONBOARDING_REQUIRED");
  const weekKey = getCurrentWeekKey();
  const existing = state.policies.find((p) => p.userId === args.user.id && p.weekKey === weekKey);
  if (existing) return existing;

  const variationForPolicy = Math.floor(now() / 20_000);
  const weatherForPolicy = getMockWeatherSnapshot({
    city: args.user.profile.city,
    seedKey: `policy-${weekKey}`,
    variation: variationForPolicy,
  });

  // getMockWeatherSnapshot is async; but ensurePolicy is sync for store. We'll expose async wrapper below.
  return { placeholder: true } as any;
}

async function getOrCreatePolicy(args: { user: User }) {
  const state = readState();
  if (!args.user.profile) throw new Error("ONBOARDING_REQUIRED");
  const weekKey = getCurrentWeekKey();
  const existing = state.policies.find((p) => p.userId === args.user.id && p.weekKey === weekKey);
  if (existing) return existing;

  const variationForPolicy = Math.floor(now() / 20_000);
  const weatherForPolicy = await getMockWeatherSnapshot({
    city: args.user.profile.city,
    seedKey: `policy-${weekKey}`,
    variation: variationForPolicy,
  });
  const riskSummary = calculateRiskSummary({ profile: args.user.profile, weather: weatherForPolicy });

  const policy: Policy = {
    id: `pol_${args.user.id}_${weekKey}`,
    userId: args.user.id,
    weekKey,
    createdAt: now(),
    weeklyPremiumInr: riskSummary.weeklyPremiumInr,
    coveragePercent: riskSummary.coveragePercent,
    active: true,
    lastRiskScore: riskSummary.riskScore,
  };

  state.policies.push(policy);
  writeState(state);
  return policy;
}

export async function riskSummaryGet(args: { user: User }) {
  if (!args.user.profile) throw new Error("ONBOARDING_REQUIRED");
  const variation = Math.floor(now() / 15_000);
  const weather = await getMockWeatherSnapshot({
    city: args.user.profile.city,
    seedKey: "risk-summary",
    variation,
  });
  const summary = calculateRiskSummary({ profile: args.user.profile, weather });
  return { summary, weather };
}

export async function dashboardSnapshotGet(args: { user: User }) {
  const [riskData, { points, weeklyEarningsInr }] = await Promise.all([
    riskSummaryGet({ user: args.user }),
    (async () => {
      // Small inlined version of dashboardEngine to avoid extra indirection in the client store.
      if (!args.user.profile) throw new Error("ONBOARDING_REQUIRED");
      const weekKey = getCurrentWeekKey();
      const profile = args.user.profile;
      const weeklyEarningsInrInner = Math.round(profile.avgDailyIncomeInr * 7);
      const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

      const pointsInner: any[] = [];
      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const dayLabel = dayLabels[dayIdx] ?? `Day ${dayIdx + 1}`;
        const weather = await getMockWeatherSnapshot({
          city: profile.city,
          seedKey: `dashboard-${weekKey}`,
          variation: dayIdx,
        });

        const rainfallSeverity = clamp(
          (weather.rainfallMm - TRIGGER_THRESHOLDS.rainfallThresholdMm) / TRIGGER_THRESHOLDS.rainfallThresholdMm,
          0,
          1
        );
        const temperatureSeverity = clamp(
          (weather.temperatureC - TRIGGER_THRESHOLDS.temperatureThresholdC) / TRIGGER_THRESHOLDS.temperatureThresholdC,
          0,
          1
        );
        const pollutionSeverity = clamp(
          (weather.aqi - TRIGGER_THRESHOLDS.aqiThreshold) / TRIGGER_THRESHOLDS.aqiThreshold,
          0,
          1
        );
        const disruptionFactor = clamp(rainfallSeverity * 0.55 + temperatureSeverity * 0.3 + pollutionSeverity * 0.15, 0, 1);

        const earningsBeforeInr = Math.round(profile.avgDailyIncomeInr);
        const earningsAfterDisruptionInr = Math.round(earningsBeforeInr * (1 - disruptionFactor * 0.75));

        const disruptionLabel =
          [
            weather.rainfallMm > TRIGGER_THRESHOLDS.rainfallThresholdMm ? "Heavy Rain" : null,
            weather.temperatureC > TRIGGER_THRESHOLDS.temperatureThresholdC ? "Heat" : null,
            weather.aqi > TRIGGER_THRESHOLDS.aqiThreshold ? "Air Pollution" : null,
          ].filter(Boolean).slice(0, 2).join(" + ") || "Stable conditions";

        pointsInner.push({
          dayLabel,
          earningsBeforeInr,
          earningsAfterDisruptionInr,
          disruptionLabel,
        });
      }

      return { points: pointsInner, weeklyEarningsInr: weeklyEarningsInrInner };
    })(),
  ]);

  const weekKey = getCurrentWeekKey();
  const state = readState();
  const policy = state.policies.find((p) => p.userId === args.user.id && p.weekKey === weekKey) ?? (await getOrCreatePolicy({ user: args.user }));

  return {
    weekKey,
    policy,
    ...riskData,
    timeline: { weeklyEarningsInr, points },
  };
}

export function policySetActive(args: { userId: string; weekKey: string; active: boolean }) {
  const state = readState();
  const policy = state.policies.find((p) => p.userId === args.userId && p.weekKey === args.weekKey);
  if (!policy) throw new Error("NO_POLICY_FOR_WEEK");
  policy.active = args.active;
  writeState(state);
  window.dispatchEvent(new Event("gigshield_policy_changed"));
  return policy;
}

function getRecentClaimsForUser(args: { userId: string; withinMinutes: number }) {
  const state = readState();
  const cutoff = now() - args.withinMinutes * 60_000;
  return state.claims
    .filter((c) => c.userId === args.userId && c.createdAt >= cutoff)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function claimsGetForUser(args: { userId: string }) {
  const state = readState();
  return state.claims.filter((c) => c.userId === args.userId).sort((a, b) => b.createdAt - a.createdAt);
}

function computeDisruptionScore(weather: WeatherSnapshot) {
  const rainfallSeverity = clamp(
    (weather.rainfallMm - TRIGGER_THRESHOLDS.rainfallThresholdMm) / TRIGGER_THRESHOLDS.rainfallThresholdMm,
    0,
    1
  );
  const temperatureSeverity = clamp(
    (weather.temperatureC - TRIGGER_THRESHOLDS.temperatureThresholdC) / TRIGGER_THRESHOLDS.temperatureThresholdC,
    0,
    1
  );
  const pollutionSeverity = clamp((weather.aqi - TRIGGER_THRESHOLDS.aqiThreshold) / TRIGGER_THRESHOLDS.aqiThreshold, 0, 1);
  const score = rainfallSeverity * 0.5 + temperatureSeverity * 0.35 + pollutionSeverity * 0.15;
  return clamp(score, 0, 1);
}

async function createClaim(args: {
  user: User;
  policy: Policy;
  calculatedWeather: WeatherSnapshot;
  storedWeatherSnapshot?: WeatherSnapshot;
  trigger: ReturnType<typeof evaluateTrigger>["trigger"];
}) {
  if (!args.user.profile) throw new Error("ONBOARDING_REQUIRED");
  const disruptionScore = computeDisruptionScore(args.calculatedWeather);

  const lostDaysEquivalent = Math.round(1 + disruptionScore * 3);
  const incomeLossInr = Math.max(0, args.user.profile.avgDailyIncomeInr * lostDaysEquivalent);
  const payoutRaw = incomeLossInr * (args.policy.coveragePercent / 100);
  const payoutInr = roundToStep(payoutRaw, 10);

  const recentClaimsForUser = getRecentClaimsForUser({ userId: args.user.id, withinMinutes: 30 });

  const claim: Claim = {
    id: `claim_${args.user.id}_${now()}`,
    userId: args.user.id,
    createdAt: now(),
    weekKey: args.policy.weekKey,
    status: "paid",
    trigger: args.trigger,
    weatherSnapshot: args.storedWeatherSnapshot,
    incomeLossInr: Math.round(incomeLossInr),
    payoutInr,
    paymentMethod: "UPI_MOCK",
    fraudFlags: [],
  };

  claim.fraudFlags = detectFraud({
    claim,
    user: args.user,
    recentClaimsForUser,
  });

  const state = readState();
  state.claims.push(claim);
  writeState(state);
  window.dispatchEvent(new Event("gigshield_claims_changed"));
  return claim;
}

export async function triggerPoll(args: { user: User }) {
  if (!args.user.profile) throw new Error("ONBOARDING_REQUIRED");
  const weekKey = getCurrentWeekKey();
  const state = readState();
  let policy = state.policies.find((p) => p.userId === args.user.id && p.weekKey === weekKey);
  if (!policy) {
    policy = await getOrCreatePolicy({ user: args.user });
  }

  if (!policy?.active) {
    return { ok: true, triggered: false, reason: "NO_ACTIVE_POLICY", policy };
  }

  const variation = Math.floor(now() / 5_000);
  const weather = await getMockWeatherSnapshot({
    city: args.user.profile.city,
    seedKey: "trigger-poll",
    variation,
  });

  // Optional traffic snapshot; not used in thresholds, but included for future extension.
  await getMockTrafficSnapshot({ city: args.user.profile.city, seedKey: "traffic-trigger", variation });

  const { triggered, trigger } = evaluateTrigger(weather);
  if (!triggered) return { ok: true, triggered: false, reason: "NO_TRIGGER", weather, trigger, policy };

  const CITIES = ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Kolkata", "Pune", "Other"];
  const omitWeatherChance = 0.08;
  const locationMismatchChance = 0.12;
  const shouldOmit = Math.random() < omitWeatherChance;
  const shouldMismatch = !shouldOmit && Math.random() < locationMismatchChance;

  let storedWeatherSnapshot: WeatherSnapshot | undefined = weather;
  if (shouldOmit) storedWeatherSnapshot = undefined;
  else if (shouldMismatch) {
    const otherCity = CITIES.find((c) => c !== weather.city) ?? "Other";
    storedWeatherSnapshot = { ...weather, city: otherCity };
  }

  const claim = await createClaim({
    user: args.user,
    policy,
    calculatedWeather: weather,
    storedWeatherSnapshot,
    trigger,
  });

  return {
    ok: true,
    triggered: true,
    claim,
    payment: {
      method: "UPI_MOCK",
      upiTo: "gigshield@upi",
      ref: `upi_${claim.id.slice(-6)}_${now().toString(16).slice(-4)}`,
    },
  };
}

export function computeAdminMetricsFromState(args: { users: User[]; policies: Policy[]; claims: Claim[] }) {
  const totalUsers = args.users.length;
  const activePolicies = args.policies.filter((p) => p.active).length;
  const claimsTriggered = args.claims.length;
  const fraudAlerts = args.claims.filter((c) => (c.fraudFlags?.length ?? 0) > 0).length;

  const scores = args.policies.map((p) => p.lastRiskScore);
  const bins = [0, 20, 40, 60, 80, 100];
  const riskDistributionBins = bins.slice(0, -1).map((start, idx) => {
    const end = bins[idx + 1];
    const count = scores.filter((s) => s >= start && s < end).length;
    return { binLabel: `${start}-${end}`, count };
  });

  const payoutsByWeek = new Map<string, number>();
  for (const c of args.claims) {
    const weekLabel = getIsoWeekKey(new Date(c.createdAt));
    payoutsByWeek.set(weekLabel, (payoutsByWeek.get(weekLabel) ?? 0) + c.payoutInr);
  }
  const payoutTrendPoints = Array.from(payoutsByWeek.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8)
    .map(([weekLabel, payoutSumInr]) => ({ weekLabel, payoutSumInr: Math.round(payoutSumInr) }));

  const cityList = ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Kolkata", "Pune"];
  const riskZones = cityList.map((city, i) => {
    const idx = getCityRiskIndex(city);
    const riskScore = clamp(Math.round(idx * 100), 0, 100);
    return { id: `zone_${i}`, label: city, riskScore };
  });

  return {
    totalUsers,
    activePolicies,
    claimsTriggered,
    fraudAlerts,
    riskDistributionBins,
    payoutTrendPoints,
    riskZones,
  };
}

export function adminMetricsGet() {
  const state = readState();
  return computeAdminMetricsFromState({ users: state.users, policies: state.policies, claims: state.claims });
}

