import { getIsoWeekKey } from "./utils";
import type { Policy, RiskSummary, User } from "./types";
import { calculateRiskSummary } from "./riskEngine";

export function getCurrentWeekKey() {
  return getIsoWeekKey(new Date());
}

export function generatePolicy(args: {
  user: User;
  riskSummary: RiskSummary;
  createdAt?: number;
}): Policy {
  const { user, riskSummary, createdAt = Date.now() } = args;
  const weekKey = getCurrentWeekKey();

  return {
    id: `pol_${user.id}_${weekKey}`,
    userId: user.id,
    weekKey,
    createdAt,
    weeklyPremiumInr: riskSummary.weeklyPremiumInr,
    coveragePercent: riskSummary.coveragePercent,
    active: true,
    lastRiskScore: riskSummary.riskScore,
  };
}

export function computeRiskSummaryFromWeather(args: {
  user: User;
  weather: Parameters<typeof calculateRiskSummary>[0]["weather"];
}): RiskSummary {
  if (!args.user.profile) {
    throw new Error("User profile missing");
  }
  return calculateRiskSummary({ profile: args.user.profile, weather: args.weather });
}

