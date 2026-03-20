"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardTimelinePoint } from "@/lib/gigshield/types";

export default function EarningsVsDisruptionsChart({
  points,
}: {
  points: DashboardTimelinePoint[];
}) {
  const data = points.map((p) => ({
    day: p.dayLabel,
    earningsBefore: p.earningsBeforeInr,
    earningsAfter: p.earningsAfterDisruptionInr,
    disruptionLabel: p.disruptionLabel,
  }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <XAxis dataKey="day" stroke="currentColor" tickLine={false} />
          <YAxis stroke="currentColor" tickLine={false} width={60} />
          <Tooltip
            contentStyle={{ background: "rgba(17,17,17,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}
            labelStyle={{ color: "white", fontWeight: 700 }}
            itemStyle={{ color: "white" }}
            formatter={(value: unknown) => `₹${Math.round(Number(value)).toLocaleString("en-IN")}`}
            labelFormatter={(label) => `Day: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="earningsBefore"
            stroke="#38bdf8"
            strokeWidth={2.5}
            dot={false}
            name="Before disruption"
          />
          <Line
            type="monotone"
            dataKey="earningsAfter"
            stroke="#34d399"
            strokeWidth={2.5}
            dot={false}
            name="After disruption"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

