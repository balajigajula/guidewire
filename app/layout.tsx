import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import TopNavClient from "@/components/TopNavClient";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "GigShield – AI Insurance for Gig Workers",
  description:
    "Weekly parametric insurance for income loss due to weather, pollution, and curfews (mock demo).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <div className="min-h-screen bg-[radial-gradient(1200px_circle_at_20%_-20%,rgba(59,130,246,0.25),transparent_55%),radial-gradient(900px_circle_at_100%_0%,rgba(34,197,94,0.18),transparent_55%)]">
          <TopNavClient />
          <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
