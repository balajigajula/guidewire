"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { SkeletonBlock, SkeletonText } from "@/components/ui/Skeleton";
import type { Policy, RiskSummary, User, WeatherSnapshot } from "@/lib/gigshield/types";
import EarningsVsDisruptionsChart from "@/components/charts/EarningsVsDisruptionsChart";
import { dashboardSnapshotGet, triggerPoll } from "@/lib/gigshield/clientStore";

type TimelineState =
  | {
      weekKey: string;
      weeklyEarningsInr: number;
      points: Array<{
        dayLabel: string;
        earningsBeforeInr: number;
        earningsAfterDisruptionInr: number;
        disruptionLabel: string;
      }>;
    }
  | null;

function formatRiskLabel(riskScore: number) {
  if (riskScore < 35) return { label: "Low", tone: "good" as const };
  if (riskScore < 65) return { label: "Moderate", tone: "warn" as const };
  return { label: "High", tone: "bad" as const };
}

export default function DashboardClient({ user }: { user: User }) {
  const [risk, setRisk] = useState<RiskSummary | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [timeline, setTimeline] = useState<TimelineState>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null);

  const pollTimerRef = useRef<number | null>(null);

  const riskBadge = useMemo(() => {
    if (!risk) return null;
    const r = formatRiskLabel(risk.riskScore);
    return (
      <Badge tone={r.tone}>
        Risk: {r.label} ({risk.riskScore}/100)
      </Badge>
    );
  }, [risk]);

  async function refreshAll() {
    setLoading(true);
    try {
      const data = await dashboardSnapshotGet({ user });
      setRisk(data.summary);
      setWeather(data.weather);
      setPolicy(data.policy);
      setTimeline({
        weekKey: data.weekKey,
        weeklyEarningsInr: data.timeline.weeklyEarningsInr,
        points: data.timeline.points,
      });
    } catch (e) {
      // Soft-fail: keep UI skeleton.
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    const shouldPoll = !!policy?.active;
    setPolling(shouldPoll);
    if (!shouldPoll) return;

    // Poll every few seconds for parametric triggers.
    pollTimerRef.current = window.setInterval(async () => {
      try {
        const data = await triggerPoll({ user });
        if (data.triggered && data.claim) {
          setToast({
            title: "Claim Initiated",
            body: `Payout: ₹${Math.round(data.claim.payoutInr).toLocaleString("en-IN")} (mock UPI).`,
          });
          // Update policy/timeline/risk so UI reflects new week or risk.
          refreshAll();
        }
      } catch {
        // ignore
      }
    }, 5_000);

    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policy?.active]);

  const upcoming = useMemo(() => {
    if (!weather) return [];
    const items: Array<{ label: string; tone: "good" | "warn" | "bad" | "neutral" }> = [];
    // Use the same thresholds as the server. (Mock UI only.)
    const rainfallThreshold = 25;
    const tempThreshold = 38;
    const aqiThreshold = 180;

    if (weather.rainfallMm > rainfallThreshold) items.push({ label: "Heavy Rain Risk", tone: "warn" });
    if (weather.temperatureC > tempThreshold) items.push({ label: "Heat Disruption Risk", tone: "bad" });
    if (weather.aqi > aqiThreshold) items.push({ label: "AQI / Pollution Risk", tone: "warn" });

    if (items.length === 0) items.push({ label: "Stable Conditions", tone: "good" });
    return items;
  }, [weather]);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="text-xs font-semibold text-foreground/70">Weekly earnings estimate</div>
          <div className="mt-2 text-2xl font-black">
            {loading ? <SkeletonText className="w-24" /> : `₹${(timeline?.weeklyEarningsInr ?? 0).toLocaleString("en-IN")}`}
          </div>
          <div className="mt-2 text-xs text-foreground/70">Based on onboarding inputs</div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-foreground/70">Active insurance policy</div>
              <div className="mt-2 text-2xl font-black">
                {loading ? <SkeletonText className="w-20" /> : policy?.active ? "Active" : "Inactive"}
              </div>
            </div>
            {riskBadge}
          </div>
          <div className="mt-3 text-xs text-foreground/70">
            {loading || !policy ? "Generating weekly policy..." : `${policy.weeklyPremiumInr} premium • ${policy.coveragePercent}% coverage`}
          </div>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-foreground/70">Upcoming risks</div>
              <div className="mt-2 text-sm font-semibold">{weather ? `${weather.city} • mock alerts` : "Fetching alerts..."}</div>
            </div>
            <div className="hidden md:block text-xs text-foreground/70">{polling ? "Polling triggers..." : "Triggers paused"}</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {loading ? (
              <>
                <SkeletonBlock className="h-7 w-28" />
                <SkeletonBlock className="h-7 w-32" />
                <SkeletonBlock className="h-7 w-24" />
              </>
            ) : (
              upcoming.map((u) => (
                <Badge key={u.label} tone={u.tone === "neutral" ? "neutral" : u.tone}>
                  {u.label}
                </Badge>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black">Earnings vs disruptions</div>
            <div className="mt-1 text-xs text-foreground/70">Mock parametric impact for the next 7 days</div>
          </div>
          <div className="text-xs text-foreground/70">{timeline?.weekKey ? `ISO Week ${timeline.weekKey}` : ""}</div>
        </div>
        <div className="mt-4">
          {loading || !timeline ? <SkeletonBlock className="h-[280px] w-full" /> : <EarningsVsDisruptionsChart points={timeline.points} />}
        </div>
      </Card>

      {toast ? (
        <div className="fixed bottom-4 left-1/2 z-50 w-[min(540px,calc(100vw-2rem))] -translate-x-1/2">
          <div className="rounded-2xl border border-white/10 bg-black/70 p-4 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black">{toast.title}</div>
                <div className="mt-1 text-xs text-white/80">{toast.body}</div>
              </div>
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold hover:bg-white/10"
                onClick={() => setToast(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

