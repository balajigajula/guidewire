"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/gigshield/types";
import { authGetCurrentUser } from "@/lib/gigshield/clientStore";
import ClaimsClient from "@/components/claims/ClaimsClient";
import OnboardingForm from "@/components/onboarding/OnboardingForm";

export default function ClaimsPage() {
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

  return <ClaimsClient />;
}

