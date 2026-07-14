import type { Metadata } from "next";
import { GeistMono, GeistSans } from "geist/font";
import { NeonAuthUIProvider } from "@neondatabase/auth/react";
import { authClient } from "@/lib/auth/client";
import "./globals.css";
import "./auth-overrides.css";

export const metadata: Metadata = {
  title: "Market Pulse | Stock news and portfolio",
  description: "A focused stock news aggregator and portfolio dashboard."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return <html lang="en" suppressHydrationWarning><body className={`${GeistSans.variable} ${GeistMono.variable}`}><NeonAuthUIProvider authClient={authClient} baseURL={appUrl} redirectTo="/">{children}</NeonAuthUIProvider></body></html>;
}
