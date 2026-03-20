"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authGetCurrentUser } from "@/lib/gigshield/clientStore";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const user = authGetCurrentUser();
    router.replace(user ? "/dashboard" : "/login");
  }, [router]);

  return null;
}
