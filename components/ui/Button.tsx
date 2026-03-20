"use client";

import type { ButtonHTMLAttributes } from "react";

export default function Button({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-xl bg-foreground px-4 py-2 text-background font-semibold hover:opacity-90 disabled:opacity-50 ${className}`}
    />
  );
}

