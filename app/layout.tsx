import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Market Pulse | Stock news and portfolio",
  description: "A focused stock news aggregator and portfolio dashboard."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
