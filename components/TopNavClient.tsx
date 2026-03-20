"use client";

import { useEffect, useState } from "react";
import TopNav from "./TopNav";
import type { User } from "@/lib/gigshield/types";
import { authGetCurrentUser } from "@/lib/gigshield/clientStore";

export default function TopNavClient() {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    return authGetCurrentUser();
  });

  useEffect(() => {
    function onChanged() {
      setUser(authGetCurrentUser());
    }
    window.addEventListener("gigshield_session_changed", onChanged);
    window.addEventListener("gigshield_profile_changed", onChanged);
    return () => {
      window.removeEventListener("gigshield_session_changed", onChanged);
      window.removeEventListener("gigshield_profile_changed", onChanged);
    };
  }, []);

  return <TopNav user={user} />;
}

