"use client";

import { authLogout } from "@/lib/gigshield/clientStore";

export default function LogoutButton() {
  async function onLogout() {
    authLogout();
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10"
    >
      Log out
    </button>
  );
}

