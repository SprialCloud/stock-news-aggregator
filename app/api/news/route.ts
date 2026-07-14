import { NextResponse } from "next/server";

const fallback = [
  { id: 1, source: "Market Pulse", datetime: Math.floor(Date.now() / 1000) - 7200, related: "NVDA,MSFT", headline: "AI investment remains in focus as markets weigh earnings outlook", summary: "Investors are watching a new round of corporate results and the continued demand for artificial intelligence infrastructure.", url: "https://www.reuters.com/markets/" },
  { id: 2, source: "Reuters", datetime: Math.floor(Date.now() / 1000) - 14400, related: "AAPL", headline: "Technology shares set the pace in a selective market rally", summary: "Large-cap technology names led trading as investors parsed the latest economic signals and company updates.", url: "https://www.reuters.com/markets/" },
  { id: 3, source: "Market Pulse", datetime: Math.floor(Date.now() / 1000) - 21600, related: "TSLA", headline: "Investors look ahead to a busy week of market-moving headlines", summary: "A mix of earnings, inflation data and policy signals is expected to shape risk appetite this week.", url: "https://www.cnbc.com/markets/" },
  { id: 4, source: "Yahoo Finance", datetime: Math.floor(Date.now() / 1000) - 43200, related: "AMZN,META", headline: "Megacap stocks put the spotlight back on growth expectations", summary: "The biggest companies remain central to the market narrative as traders reassess valuations.", url: "https://finance.yahoo.com/" }
];

export async function GET() {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) return NextResponse.json(fallback, { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } });
  try {
    const response = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${token}`, { next: { revalidate: 300 } });
    if (!response.ok) throw new Error("News provider unavailable");
    const news = await response.json();
    return NextResponse.json(news.slice(0, 12));
  } catch { return NextResponse.json(fallback); }
}
