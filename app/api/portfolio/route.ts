import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Substitute the authenticated user's ID/email here when Auth.js or Clerk is added.
const DEMO_EMAIL = "demo@marketpulse.app";

async function getPortfolio() {
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL }, update: {},
    create: { email: DEMO_EMAIL, name: "Demo investor", portfolios: { create: { name: "My Portfolio" } } },
    include: { portfolios: { include: { holdings: { orderBy: { createdAt: "asc" } } } } }
  });
  return user.portfolios[0];
}

export async function GET() {
  try { return NextResponse.json((await getPortfolio())?.holdings ?? []); }
  catch { return NextResponse.json([], { headers: { "x-database-status": "unconfigured" } }); }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const symbol = String(data.symbol ?? "").trim().toUpperCase();
    const companyName = String(data.companyName ?? symbol).trim();
    const shares = Number(data.shares), averageCost = Number(data.averageCost);
    if (!symbol || !Number.isFinite(shares) || shares <= 0 || !Number.isFinite(averageCost) || averageCost < 0) return NextResponse.json({ error: "Invalid holding." }, { status: 400 });
    const portfolio = await getPortfolio();
    if (!portfolio) throw new Error("Portfolio missing");
    const holding = await prisma.holding.upsert({ where: { portfolioId_symbol: { portfolioId: portfolio.id, symbol } }, update: { companyName, shares, averageCost }, create: { portfolioId: portfolio.id, symbol, companyName, shares, averageCost } });
    return NextResponse.json(holding, { status: 201 });
  } catch { return NextResponse.json({ error: "Portfolio storage is unavailable. Configure DATABASE_URL." }, { status: 503 }); }
}

export async function DELETE(request: NextRequest) {
  try {
    const symbol = new URL(request.url).searchParams.get("symbol")?.toUpperCase();
    const portfolio = await getPortfolio();
    if (!symbol || !portfolio) return NextResponse.json({ error: "Holding not found." }, { status: 404 });
    await prisma.holding.delete({ where: { portfolioId_symbol: { portfolioId: portfolio.id, symbol } } });
    return new NextResponse(null, { status: 204 });
  } catch { return NextResponse.json({ error: "Portfolio storage is unavailable." }, { status: 503 }); }
}
