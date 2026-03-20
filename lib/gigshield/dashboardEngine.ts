import { getIsoWeekKey, clamp } from "./utils";
import { TRIGGER_THRESHOLDS, getMockWeatherSnapshot } from "./mockWeather";
import type { DashboardTimelinePoint, User } from "./types";

function computeDisruptionFactor(weather: Awaited<ReturnType<typeof getMockWeatherSnapshot>>) {
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

  const score = rainfallSeverity * 0.55 + temperatureSeverity * 0.3 + pollutionSeverity * 0.15;
  return clamp(score, 0, 1);
}

export async function buildDashboardTimeline(args: { user: User }): Promise<{
  weekKey: string;
  weeklyEarningsInr: number;
  points: DashboardTimelinePoint[];
}> {
  if (!args.user.profile) throw new Error("User profile missing");

  const weekKey = getIsoWeekKey(new Date());
  const profile = args.user.profile;
  const weeklyEarningsInr = Math.round(profile.avgDailyIncomeInr * 7);

  const points: DashboardTimelinePoint[] = [];

  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const dayLabel = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][dayIdx] ?? `Day ${dayIdx + 1}`;
    const weather = await getMockWeatherSnapshot({
      city: profile.city,
      seedKey: `dashboard-${weekKey}`,
      variation: dayIdx,
    });

    const disruptionFactor = computeDisruptionFactor(weather);
    const earningsBeforeInr = Math.round(profile.avgDailyIncomeInr);
    const earningsAfterDisruptionInr = Math.round(earningsBeforeInr * (1 - disruptionFactor * 0.75));

    const disruptionLabel = [
      weather.rainfallMm > TRIGGER_THRESHOLDS.rainfallThresholdMm ? "Heavy Rain" : null,
      weather.temperatureC > TRIGGER_THRESHOLDS.temperatureThresholdC ? "Heat" : null,
      weather.aqi > TRIGGER_THRESHOLDS.aqiThreshold ? "Air Pollution" : null,
    ]
      .filter(Boolean)
      .slice(0, 2)
      .join(" + ");

    points.push({
      dayLabel,
      earningsBeforeInr,
      earningsAfterDisruptionInr,
      disruptionLabel: disruptionLabel || "Stable conditions",
    });
  }

  return { weekKey, weeklyEarningsInr, points };
}

