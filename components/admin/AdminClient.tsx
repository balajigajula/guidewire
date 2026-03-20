"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import RiskMap from "@/components/RiskMap";
import type { AdminMetrics } from "@/lib/gigshield/adminMetrics";
import { adminMetricsGet } from "@/lib/gigshield/clientStore";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function AdminClient() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = adminMetricsGet();
        setMetrics(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="grid gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Admin Dashboard</h2>
          <div className="mt-1 text-xs text-foreground/70">Risk, policies, claims & fraud alerts (mock)</div>
        </div>
      </div>

      {loading || !metrics ? (
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonBlock className="h-28 w-full" />
          <SkeletonBlock className="h-28 w-full" />
          <SkeletonBlock className="h-64 w-full md:col-span-2" />
          <SkeletonBlock className="h-64 w-full md:col-span-2" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <div className="text-xs font-semibold text-foreground/70">Total users</div>
              <div className="mt-2 text-2xl font-black">{metrics.totalUsers}</div>
            </Card>
            <Card>
              <div className="text-xs font-semibold text-foreground/70">Active policies</div>
              <div className="mt-2 text-2xl font-black">{metrics.activePolicies}</div>
            </Card>
            <Card>
              <div className="text-xs font-semibold text-foreground/70">Claims triggered</div>
              <div className="mt-2 text-2xl font-black">{metrics.claimsTriggered}</div>
            </Card>
            <Card>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-foreground/70">Fraud alerts</div>
                  <div className="mt-2 text-2xl font-black">{metrics.fraudAlerts}</div>
                </div>
                <Badge tone="bad">FLAGGED</Badge>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="lg:col-span-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black">Risk distribution</div>
                  <div className="mt-1 text-xs text-foreground/70">Based on policy-time AI risk score</div>
                </div>
              </div>
              <div className="mt-3 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.riskDistributionBins} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="binLabel" stroke="currentColor" tickLine={false} />
                    <YAxis stroke="currentColor" tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "rgba(17,17,17,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}
                      formatter={(v: unknown) => [`${v} policies`, ""]}
                    />
                    <Bar dataKey="count" fill="#38bdf8" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="lg:col-span-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black">Payout trend</div>
                  <div className="mt-1 text-xs text-foreground/70">Mock UPI payout sum by week</div>
                </div>
              </div>
              <div className="mt-3 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={metrics.payoutTrendPoints}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="weekLabel" stroke="currentColor" tickLine={false} />
                    <YAxis stroke="currentColor" tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "rgba(17,17,17,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}
                      formatter={(v: unknown) => [`₹${Math.round(Number(v)).toLocaleString("en-IN")}`, "Payout sum"]}
                    />
                    <Line type="monotone" dataKey="payoutSumInr" stroke="#34d399" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card>
            <div className="text-sm font-black">Risk Map Visualization</div>
            <div className="mt-1 text-xs text-foreground/70">
              Bonus: pseudo zones (demo) for risk distribution across major cities.
            </div>
            <div className="mt-4">
              <RiskMap riskZones={metrics.riskZones} />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

