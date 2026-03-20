"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { SkeletonBlock, SkeletonText } from "@/components/ui/Skeleton";
import type { Policy, RiskSummary } from "@/lib/gigshield/types";
import { authGetCurrentUser, dashboardSnapshotGet, policySetActive } from "@/lib/gigshield/clientStore";

export default function PolicyClient() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [risk, setRisk] = useState<RiskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const user = authGetCurrentUser();
      if (!user) throw new Error("UNAUTHORIZED");
      const data = await dashboardSnapshotGet({ user });
      setPolicy(data.policy);
      setRisk(data.summary);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function setActive(nextActive: boolean) {
    if (!policy) return;
    setSaving(true);
    setError(null);
    try {
      const user = authGetCurrentUser();
      if (!user) throw new Error("UNAUTHORIZED");
      const updated = policySetActive({ userId: user.id, weekKey: policy.weekKey, active: nextActive });
      setPolicy(updated);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <h2 className="text-2xl font-black tracking-tight">Weekly Insurance Policy</h2>
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-foreground/70">Current ISO week</div>
            <div className="mt-2 text-2xl font-black">{loading ? <SkeletonText className="w-28" /> : policy?.weekKey}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {loading ? (
                <>
                  <SkeletonBlock className="h-7 w-24" />
                  <SkeletonBlock className="h-7 w-32" />
                </>
              ) : (
                <>
                  <Badge tone={policy?.active ? "good" : "neutral"}>{policy?.active ? "Active" : "Inactive"}</Badge>
                  <Badge tone="info">{policy?.coveragePercent}% coverage</Badge>
                </>
              )}
            </div>
          </div>

          <div className="min-w-[240px] text-right">
            <div className="text-sm font-semibold text-foreground/70">Weekly premium</div>
            <div className="mt-2 text-3xl font-black">
              {loading ? <SkeletonText className="w-20" /> : `₹${policy?.weeklyPremiumInr}`}
            </div>
            <div className="mt-2 text-xs text-foreground/70">
              {risk ? `AI risk score: ${risk.riskScore}/100 (mock)` : ""}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="text-sm text-foreground/70">
            Coverage is a percentage of lost income when parametric triggers occur (rain / heat / AQI).
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              onClick={() => setActive(true)}
              disabled={saving || loading || policy?.active === true}
              className="bg-emerald-600 text-white hover:opacity-90"
            >
              {saving ? "Updating..." : "Activate"}
            </Button>
            <Button
              onClick={() => setActive(false)}
              disabled={saving || loading || policy?.active === false}
              className="bg-white/10 text-foreground hover:bg-white/15 border border-white/10"
            >
              Deactivate
            </Button>
          </div>
        </div>

        {error ? <div className="mt-3 text-sm font-semibold text-rose-300">{error}</div> : null}
      </Card>
    </div>
  );
}

