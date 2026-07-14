import { NextRequest, NextResponse } from "next/server";
import { filterPopularSymbols, normalizeSymbolSearch } from "@/lib/symbols";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query) return NextResponse.json(filterPopularSymbols(""));

  const token = process.env.FINNHUB_API_KEY;
  if (!token) return NextResponse.json(filterPopularSymbols(query));

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&exchange=US`,
      {
        headers: { "X-Finnhub-Token": token },
        next: { revalidate: 3_600 },
      },
    );
    if (!response.ok) throw new Error("Symbol search unavailable");
    const suggestions = normalizeSymbolSearch(await response.json());
    return NextResponse.json(suggestions.length > 0 ? suggestions : filterPopularSymbols(query), {
      headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json(filterPopularSymbols(query));
  }
}
