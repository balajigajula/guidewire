"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/gigshield/types";
import { authGetCurrentUser } from "@/lib/gigshield/clientStore";
import PolicyClient from "@/components/policy/PolicyClient";
import OnboardingForm from "@/components/onboarding/OnboardingForm";

export default function PolicyPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const u = authGetCurrentUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUser(u);
  }, [router]);

  if (!user) return null;

  if (!user.profile) {
    return <OnboardingForm initialName="" initialCity="" initialPlatform="Zomato" />;
  }

  return <PolicyClient />;
}

