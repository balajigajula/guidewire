"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { UserProfile } from "@/lib/gigshield/types";
import { authGetCurrentUser, profileSave } from "@/lib/gigshield/clientStore";

const PLATFORM_OPTIONS: UserProfile["platform"][] = ["Zomato", "Swiggy", "Amazon Flex", "Blinkit", "Other"];

export default function OnboardingForm({
  initialCity,
  initialName,
  initialPlatform = "Zomato",
}: {
  initialCity?: string;
  initialName?: string;
  initialPlatform?: UserProfile["platform"];
}) {
  const [name, setName] = useState(initialName ?? "");
  const [city, setCity] = useState(initialCity ?? "");
  const [platform, setPlatform] = useState<UserProfile["platform"]>(initialPlatform);
  const [avgDailyIncomeInr, setAvgDailyIncomeInr] = useState<number>(900);
  const [workingHoursPerDay, setWorkingHoursPerDay] = useState<number>(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const user = authGetCurrentUser();
      if (!user) throw new Error("UNAUTHORIZED");

      const profile = {
        name: name.trim(),
        city: city.trim(),
        platform,
        avgDailyIncomeInr: Math.round(avgDailyIncomeInr),
        workingHoursPerDay: Math.round(workingHoursPerDay * 10) / 10,
      };

      if (!profile.name || !profile.city) throw new Error("NAME_AND_CITY_REQUIRED");
      if (!Number.isFinite(profile.avgDailyIncomeInr) || profile.avgDailyIncomeInr < 100) throw new Error("INCOME_INVALID");
      if (!Number.isFinite(profile.workingHoursPerDay) || profile.workingHoursPerDay < 1 || profile.workingHoursPerDay > 16) {
        throw new Error("WORKING_HOURS_OUT_OF_RANGE");
      }

      profileSave({ userId: user.id, profile });
      window.location.href = "/dashboard";
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_420px]">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Complete your onboarding</h2>
        <p className="mt-2 text-sm text-foreground/70">
          We use your city risk exposure and your working hours to calculate a weekly AI risk score and premium.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Card>
            <div className="text-sm font-semibold">Weekly pricing</div>
            <div className="mt-1 text-xs text-foreground/70">Premium is re-generated for each week (mock).</div>
          </Card>
          <Card>
            <div className="text-sm font-semibold">Parametric triggers</div>
            <div className="mt-1 text-xs text-foreground/70">
              Claims are triggered when rainfall / heat / AQI thresholds are crossed.
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg font-black">Onboarding</div>
          <div className="text-xs text-foreground/70">Mock underwriting</div>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="grid gap-1">
            <label className="text-sm font-semibold">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="grid gap-1">
            <label className="text-sm font-semibold">City</label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mumbai" />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-semibold">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as UserProfile["platform"])}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none"
            >
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-semibold">Average daily income (INR)</label>
            <Input
              inputMode="numeric"
              value={String(avgDailyIncomeInr)}
              onChange={(e) => setAvgDailyIncomeInr(Number(e.target.value))}
            />
          </div>
          <div className="grid gap-1">
            <label className="text-sm font-semibold">Working hours per day</label>
            <Input
              inputMode="numeric"
              value={String(workingHoursPerDay)}
              onChange={(e) => setWorkingHoursPerDay(Number(e.target.value))}
            />
          </div>

          {error ? <div className="text-sm font-semibold text-rose-300">{error}</div> : null}

          <Button onClick={submit} disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save & Continue"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

