import type { ReactNode } from "react";

export default function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
}) {
  const toneClass =
    tone === "good"
      ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/30"
      : tone === "warn"
        ? "bg-amber-500/15 text-amber-200 border-amber-500/30"
        : tone === "bad"
          ? "bg-rose-500/15 text-rose-200 border-rose-500/30"
          : tone === "info"
            ? "bg-sky-500/15 text-sky-200 border-sky-500/30"
            : "bg-white/5 text-foreground border-white/10";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}

