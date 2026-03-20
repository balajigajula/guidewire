import { clamp } from "./utils";
import { hashStringToSeed, mulberry32 } from "./prng";

export type TrafficSnapshot = {
  city: string;
  congestionIndex: number; // 0..100
};

export async function getMockTrafficSnapshot(params: {
  city: string;
  seedKey?: string;
  variation?: number;
}): Promise<TrafficSnapshot> {
  const city = params.city.trim() || "Other";
  const seedBase = params.seedKey ?? "gigshield";
  const variation = params.variation ?? 0;
  const seed = hashStringToSeed(`${seedBase}|traffic|${city}|${variation}`);
  const rand = mulberry32(seed);

  // Congestion tends to spike with heat (we approximate with random + temp correlation is done elsewhere).
  const congestionIndex = clamp(Math.round(rand() * 100), 0, 100);
  return { city, congestionIndex };
}

