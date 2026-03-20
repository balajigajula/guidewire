import type { WeatherSnapshot } from "./types";
import { buildTriggerReason } from "./claimsEngine";

export function evaluateTrigger(weather: WeatherSnapshot) {
  const trigger = buildTriggerReason(weather);
  const triggered = trigger.rainfallExceeded || trigger.temperatureExceeded || trigger.aqiExceeded;
  return { triggered, trigger };
}

