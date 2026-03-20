import { clamp, roundToStep } from "./utils";
import { addClaim, getRecentClaimsForUser } from "./mockDb";
import { detectFraud } from "./fraudEngine";
import { TRIGGER_THRESHOLDS } from "./mockWeather";
import type { Claim, Policy, TriggerReason, User, WeatherSnapshot } from "./types";

export function buildTriggerReason(weather: WeatherSnapshot): TriggerReason {
  return {
    rainfallExceeded: weather.rainfallMm > TRIGGER_THRESHOLDS.rainfallThresholdMm,
    temperatureExceeded: weather.temperatureC > TRIGGER_THRESHOLDS.temperatureThresholdC,
    aqiExceeded: weather.aqi > TRIGGER_THRESHOLDS.aqiThreshold,
    rainfallThresholdMm: TRIGGER_THRESHOLDS.rainfallThresholdMm,
    temperatureThresholdC: TRIGGER_THRESHOLDS.temperatureThresholdC,
    aqiThreshold: TRIGGER_THRESHOLDS.aqiThreshold,
  };
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

  // Weighted severity (rain impacts delivery logistics more in this mock).
  const score = rainfallSeverity * 0.5 + temperatureSeverity * 0.35 + pollutionSeverity * 0.15;
  return clamp(score, 0, 1);
}

export function createPaidClaim(args: {
  user: User;
  policy: Policy;
  calculatedWeather: WeatherSnapshot; // used for income loss maths
  storedWeatherSnapshot?: WeatherSnapshot; // used for fraud detection & display
  trigger: TriggerReason;
}): Claim {
  if (!args.user.profile) {
    throw new Error("User profile missing");
  }

  const disruptionScore = computeDisruptionScore(args.calculatedWeather);

  // Parametric claims: convert disruption score -> equivalent lost days (1..4)
  const lostDaysEquivalent = Math.round(1 + disruptionScore * 3);
  const incomeLossInr = Math.max(0, args.user.profile.avgDailyIncomeInr * lostDaysEquivalent);

  const payoutRaw = incomeLossInr * (args.policy.coveragePercent / 100);
  const payoutInr = roundToStep(payoutRaw, 10);

  const recentClaimsForUser = getRecentClaimsForUser({ userId: args.user.id, withinMinutes: 30 });

  const claim: Claim = {
    id: `claim_${args.user.id}_${Date.now()}`,
    userId: args.user.id,
    createdAt: Date.now(),
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

  addClaim({ claim });
  return claim;
}

