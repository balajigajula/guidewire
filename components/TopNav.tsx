import Link from "next/link";
import type { User } from "@/lib/gigshield/types";
import LogoutButton from "./LogoutButton";
import ThemeToggle from "./ThemeToggle";

export default function TopNav({ user }: { user?: User | null }) {
  const role = user?.role ?? "user";
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-background/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="font-black tracking-tight text-lg">
            GigShield
          </Link>
          <span className="hidden text-xs text-foreground/70 sm:inline">
            Parametric Weekly Insurance for Gig Workers
          </span>
        </div>

        <nav className="hidden items-center gap-2 md:flex">
          <Link
            href="/dashboard"
            className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-white/5"
          >
            Dashboard
          </Link>
          <Link
            href="/policy"
            className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-white/5"
          >
            Policy
          </Link>
          <Link
            href="/claims"
            className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-white/5"
          >
            Claims
          </Link>
          {role === "admin" ? (
            <Link
              href="/admin"
              className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-white/5"
            >
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden text-right md:block">
                <div className="text-xs text-foreground/70">Signed in</div>
                <div className="text-sm font-bold">
                  {user.profile?.name ?? user.phone}
                </div>
              </div>
              <LogoutButton />
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

