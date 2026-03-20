import { clamp, roundToStep } from "./utils";
import { getCityRiskIndex } from "./mockWeather";
import type { RiskSummary, UserProfile, WeatherSnapshot } from "./types";

export function calculateRiskSummary(args: {
  profile: UserProfile;
  weather: WeatherSnapshot;
}): RiskSummary {
  const { profile, weather } = args;

  const heatIndexNormalized = clamp((weather.heatIndex - 25) / 25, 0, 1); // 25..50 => 0..1
  const rainProbabilityNormalized = clamp(weather.rainProbability, 0, 1);
  const pollutionNormalized = clamp(weather.pollutionLevel / 200, 0, 1);

  const cityRiskIndex = getCityRiskIndex(profile.city); // 0..1

  // Working hours factor: more time on road -> higher effective disruption exposure.
  const workingHoursFactor = clamp(profile.workingHoursPerDay / 8, 0.6, 1.6);

  // Risk engine: weighted sum * exposure multipliers.
  const weightedRisk =
    heatIndexNormalized * 0.35 + rainProbabilityNormalized * 0.45 + pollutionNormalized * 0.2;

  const riskRaw = weightedRisk * (0.65 + cityRiskIndex * 0.35) * workingHoursFactor * 100;
  const riskScore = clamp(Math.round(riskRaw), 0, 100);

  // Weekly premium: maps risk score -> ₹20..₹100 (weekly only).
  const weeklyPremium = clamp(20 + (riskScore / 100) * 80, 20, 100);
  const weeklyPremiumInr = roundToStep(weeklyPremium, 5);

  // Coverage percent: higher risk -> higher coverage up to 90% (mock underwriting).
  const coveragePercent = clamp(40 + (riskScore / 100) * 50, 40, 90);
  const coverageRounded = roundToStep(coveragePercent, 5);

  return {
    riskScore,
    weeklyPremiumInr,
    coveragePercent: coverageRounded,
    cityRiskIndex,
  };
}

