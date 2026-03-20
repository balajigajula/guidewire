import { getIsoWeekKey, clamp } from "./utils";
import { getCityRiskIndex } from "./mockWeather";
import { getDb } from "./mockDb";

export type AdminMetrics = {
  totalUsers: number;
  activePolicies: number;
  claimsTriggered: number;
  fraudAlerts: number;
  riskDistributionBins: { binLabel: string; count: number }[];
  payoutTrendPoints: { weekLabel: string; payoutSumInr: number }[];
  riskZones: { id: string; label: string; riskScore: number }[];
};

export function computeAdminMetrics(): AdminMetrics {
  const db = getDb();
  const totalUsers = db.usersById.size;
  const activePolicies = db.policies.filter((p) => p.active).length;
  const claimsTriggered = db.claims.length;
  const fraudAlerts = db.claims.filter((c) => (c.fraudFlags?.length ?? 0) > 0).length;

  // Risk distribution derived from lastRiskScore (generated at policy time).
  const scores = db.policies.map((p) => p.lastRiskScore);
  const bins = [0, 20, 40, 60, 80, 100];
  const riskDistributionBins = bins.slice(0, -1).map((start, idx) => {
    const end = bins[idx + 1];
    const count = scores.filter((s) => s >= start && s < end).length;
    return { binLabel: `${start}-${end}`, count };
  });

  // Payout trend: group by ISO week of createdAt.
  const payoutsByWeek = new Map<string, number>();
  for (const c of db.claims) {
    const weekLabel = getIsoWeekKey(new Date(c.createdAt));
    payoutsByWeek.set(weekLabel, (payoutsByWeek.get(weekLabel) ?? 0) + c.payoutInr);
  }
  const payoutTrendPoints = Array.from(payoutsByWeek.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8)
    .map(([weekLabel, payoutSumInr]) => ({
      weekLabel,
      payoutSumInr: Math.round(payoutSumInr),
    }));

  // Risk zones (bonus): map a few major cities into pseudo zones.
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

