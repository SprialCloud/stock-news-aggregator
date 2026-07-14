import type { Metadata } from "next";
import { NeonAuthUIProvider } from "@neondatabase/auth/react";
import { authClient } from "@/lib/auth/client";
import "./globals.css";
import "./auth-overrides.css";

export const metadata: Metadata = {
  title: "Market Pulse | Stock news and portfolio",
  description: "A focused stock news aggregator and portfolio dashboard."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body><NeonAuthUIProvider authClient={authClient} redirectTo="/">{children}</NeonAuthUIProvider></body></html>;
}
