"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { SkeletonBlock, SkeletonText } from "@/components/ui/Skeleton";
import { authSendOtp, authVerifyOtp } from "@/lib/gigshield/clientStore";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"enter_phone" | "enter_otp">("enter_phone");
  const [debugOtp, setDebugOtp] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedPhone = useMemo(() => phone.replace(/\D/g, ""), [phone]);

  async function sendOtp() {
    setLoading(true);
    setError(null);
    try {
      const data = authSendOtp(normalizedPhone);
      setDebugOtp(data.otp);
      setStage("enter_otp");
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setLoading(true);
    setError(null);
    try {
      const data = authVerifyOtp({ phoneRaw: normalizedPhone, otp });
      router.push(data.needsOnboarding ? "/dashboard" : "/dashboard");
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_380px] md:items-start">
      <div>
        <h1 className="text-3xl font-black tracking-tight">GigShield</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Weekly-priced parametric insurance for gig delivery workers. Claims are triggered automatically when mock
          weather thresholds are crossed.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Weekly pricing</div>
                <div className="mt-1 text-xs text-foreground/70">₹20–₹100 premium (mock)</div>
              </div>
              <Badge tone="info">WEEKLY</Badge>
            </div>
          </Card>
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">AI risk score</div>
                <div className="mt-1 text-xs text-foreground/70">0–100 risk (mock underwriting)</div>
              </div>
              <Badge tone="good">AI</Badge>
            </div>
          </Card>
        </div>

        <div className="mt-4 text-xs text-foreground/70">
          Demo phones (seeded): <span className="font-semibold">9011111111</span>, <span className="font-semibold">9022222222</span>,
          admin: <span className="font-semibold">9000000000</span>. OTP is shown after you request it (development mode).
        </div>
      </div>

      <Card className="relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-sky-500/20 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="text-lg font-black">Login</div>
            <Badge tone="neutral">OTP</Badge>
          </div>

          <div className="mt-4 grid gap-3">
            {stage === "enter_phone" ? (
              <>
                <label className="text-sm font-semibold">Mobile number</label>
                <Input
                  inputMode="numeric"
                  placeholder="e.g. 9011111111"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                {error ? <div className="text-sm font-semibold text-rose-300">{error}</div> : null}
                <Button
                  onClick={sendOtp}
                  disabled={loading || normalizedPhone.length < 10}
                  className="mt-1 w-full"
                >
                  {loading ? "Sending OTP..." : "Send OTP"}
                </Button>
              </>
            ) : (
              <>
                <label className="text-sm font-semibold">Enter OTP</label>
                <Input inputMode="numeric" placeholder="6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
                {debugOtp ? (
                  <div className="text-xs text-foreground/70">
                    Demo OTP: <span className="font-mono font-semibold">{debugOtp}</span>
                  </div>
                ) : (
                  <div className="text-xs text-foreground/70">OTP sent to your phone (mock).</div>
                )}
                {error ? <div className="text-sm font-semibold text-rose-300">{error}</div> : null}
                <Button onClick={verifyOtp} disabled={loading || otp.length < 4} className="mt-1 w-full">
                  {loading ? "Verifying..." : "Verify & Continue"}
                </Button>

                <button
                  type="button"
                  className="text-xs font-semibold text-foreground/70 hover:text-foreground"
                  onClick={() => {
                    setStage("enter_phone");
                    setOtp("");
                  }}
                >
                  Change number
                </button>
              </>
            )}

            {loading ? (
              <div className="mt-2 grid gap-2">
                <SkeletonBlock className="h-10" />
                <SkeletonText className="w-2/3" />
              </div>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}

