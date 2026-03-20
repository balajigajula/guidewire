"use client";

import type { AdminMetrics } from "@/lib/gigshield/adminMetrics";

function riskToColor(riskScore: number) {
  // 0 -> emerald, 100 -> rose
  const t = Math.max(0, Math.min(1, riskScore / 100));
  const r = Math.round(16 + 220 * t);
  const g = Math.round(185 - 120 * t);
  const b = Math.round(150 - 80 * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function RiskMap({ riskZones }: { riskZones: AdminMetrics["riskZones"] }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Risk zones (demo)</div>
        <div className="text-xs text-foreground/70">Color = city risk index</div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        {riskZones.map((z, idx) => (
          <div
            key={z.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-3"
            style={{ gridColumn: idx === 0 ? "span 1" : undefined }}
          >
            <div className="text-xs text-foreground/70">{z.label}</div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="h-3 w-3 rounded-full" style={{ background: riskToColor(z.riskScore) }} />
              <div className="text-sm font-bold">{z.riskScore}</div>
            </div>
            <div className="mt-2 text-[11px] text-foreground/70">Zone {idx + 1}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

