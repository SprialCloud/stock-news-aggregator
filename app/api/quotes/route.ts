import { NextRequest, NextResponse } from "next/server";
import { normalizeFinnhubQuote, parseQuoteSymbols } from "@/lib/quotes";

export async function GET(request: NextRequest) {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) {
    return NextResponse.json(
      { error: "Configure FINNHUB_API_KEY to load live quotes." },
      { status: 503 },
    );
  }

  const symbols = parseQuoteSymbols(request.nextUrl.searchParams.get("symbols"));
  if (symbols.length === 0) {
    return NextResponse.json({ error: "Provide at least one valid symbol." }, { status: 400 });
  }

  try {
    const quotes = await Promise.all(symbols.map(async (symbol) => {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}`,
        {
          headers: { "X-Finnhub-Token": token },
          next: { revalidate: 30 },
        },
      );
      if (!response.ok) return null;
      return normalizeFinnhubQuote(symbol, await response.json());
    }));

    return NextResponse.json(
      quotes.filter((quote) => quote !== null),
      { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch {
    return NextResponse.json({ error: "Live quotes are temporarily unavailable." }, { status: 502 });
  }
}
