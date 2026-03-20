"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import type { Claim, FraudFlag } from "@/lib/gigshield/types";
import { authGetCurrentUser, claimsGetForUser } from "@/lib/gigshield/clientStore";

function toneForFraud(flag: FraudFlag) {
  if (flag === "NO_WEATHER_MATCH") return "bad";
  if (flag === "MULTIPLE_CLAIMS_SHORT_WINDOW") return "warn";
  return "bad";
}

export default function ClaimsClient() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const user = authGetCurrentUser();
      if (!user) throw new Error("UNAUTHORIZED");
      setClaims(claimsGetForUser({ userId: user.id }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  const suspiciousCount = useMemo(() => claims.filter((c) => (c.fraudFlags?.length ?? 0) > 0).length, [claims]);

  return (
    <div className="grid gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Claim History</h2>
          <div className="mt-1 text-xs text-foreground/70">
            Suspicious claims flagged: <span className="font-semibold">{suspiciousCount}</span>
          </div>
        </div>
        <Button onClick={refresh} disabled={loading || refreshing} className="bg-white/10 border border-white/10">
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="grid gap-3">
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-24 w-full" />
          </div>
        ) : claims.length === 0 ? (
          <div className="text-sm text-foreground/70">No claims yet. Activate policy and wait for mock triggers.</div>
        ) : (
          <div className="grid gap-3">
            {claims.slice(0, 20).map((c) => (
              <div key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black">
                      {c.status === "paid" ? "Claim Paid" : "Claim Initiated"} • ISO {c.weekKey}
                    </div>
                    <div className="mt-1 text-xs text-foreground/70">
                      {new Date(c.createdAt).toLocaleString()} • Triggered by{" "}
                      {[
                        c.trigger.rainfallExceeded ? "Rainfall" : null,
                        c.trigger.temperatureExceeded ? "Heat" : null,
                        c.trigger.aqiExceeded ? "AQI" : null,
                      ]
                        .filter(Boolean)
                        .join(", ") || "External disruption"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-foreground/70">Payout</div>
                    <div className="text-2xl font-black">₹{Math.round(c.payoutInr).toLocaleString("en-IN")}</div>
                    <div className="mt-1 text-xs text-foreground/70">Income loss: ₹{Math.round(c.incomeLossInr).toLocaleString("en-IN")}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(c.fraudFlags ?? []).length === 0 ? (
                    <Badge tone="good">No fraud flags</Badge>
                  ) : (
                    (c.fraudFlags ?? []).map((flag) => (
                      <Badge key={flag} tone={toneForFraud(flag)}>
                        {flag.replace(/_/g, " ")}
                      </Badge>
                    ))
                  )}
                  {c.weatherSnapshot ? (
                    <Badge tone="neutral">
                      Weather: {c.weatherSnapshot.city} • AQI {c.weatherSnapshot.aqi}
                    </Badge>
                  ) : (
                    <Badge tone="bad">Weather snapshot missing</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

