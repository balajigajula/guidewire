import { clamp } from "./utils";
import { hashStringToSeed, mulberry32 } from "./prng";
import type { WeatherSnapshot } from "./types";

const CITY_RISK_INDEX_RAW: Record<string, number> = {
  Mumbai: 0.62,
  "New Delhi": 0.78,
  Delhi: 0.78,
  Bengaluru: 0.44,
  "Hyderabad": 0.5,
  Chennai: 0.55,
  Kolkata: 0.6,
  Pune: 0.52,
  Lucknow: 0.7,
  Jaipur: 0.66,
  Other: 0.5,
};

export function getCityRiskIndex(city: string) {
  const key = city.trim();
  return CITY_RISK_INDEX_RAW[key] ?? CITY_RISK_INDEX_RAW.Other;
}

export const TRIGGER_THRESHOLDS = {
  rainfallThresholdMm: 25, // mm/hour
  temperatureThresholdC: 38, // Celsius
  aqiThreshold: 180, // AQI
} as const;

export async function getMockWeatherSnapshot(params: {
  city: string;
  seedKey?: string;
  variation?: number;
}): Promise<WeatherSnapshot> {
  const city = params.city.trim() || "Other";
  const seedBase = params.seedKey ?? "gigshield";
  const variation = params.variation ?? 0;
  const seed = hashStringToSeed(`${seedBase}|${city}|${variation}`);
  const rand = mulberry32(seed);

  // Temperature + rainfall tend to correlate in real life; we mimic lightly.
  const baseTemp = 24 + rand() * 18; // 24..42
  const heatIndex = baseTemp + rand() * 4; // slight spread
  const temperatureC = baseTemp;

  // Rain probability rises with lower temps (monsoon) and with random spikes.
  const rainProbability =
    clamp((26 - temperatureC) / 30 + rand() * 0.55, 0, 1) * 0.85 +
    (rand() > 0.92 ? 0.12 : 0);

  const rainfallMm = rainProbability * (10 + rand() * 55); // 0..65-ish

  // Pollution tends to rise with temperature and random haze.
  const pollutionLevel = clamp(
    35 +
      (temperatureC - 22) * 1.6 +
      (rainfallMm < 8 ? 18 : 0) +
      rand() * 55,
    0,
    240
  );
  const aqi = clamp(Math.round(pollutionLevel * 0.9), 0, 300);

  // Add tiny normalization noise to avoid flat graphs.
  return {
    city,
    temperatureC: Number(temperatureC.toFixed(1)),
    heatIndex: Number(heatIndex.toFixed(1)),
    rainProbability: Number(rainProbability.toFixed(3)),
    rainfallMm: Number(rainfallMm.toFixed(1)),
    aqi,
    pollutionLevel: Number(pollutionLevel.toFixed(0)),
  };
}

