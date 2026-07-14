import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/server";
import { normalizeHoldingInput } from "@/lib/holdings";

async function getPortfolio() {
  const { data: session } = await auth.getSession();
  if (!session?.user) return null;
  const user = await prisma.user.upsert({
    where: { id: session.user.id },
    update: { email: session.user.email, name: session.user.name },
    create: { id: session.user.id, email: session.user.email, name: session.user.name, portfolios: { create: { name: "My Portfolio" } } },
    include: { portfolios: { include: { holdings: { orderBy: { createdAt: "asc" } } } } }
  });
  return user.portfolios[0];
}

export async function GET() {
  try {
    const portfolio = await getPortfolio();
    if (!portfolio) return NextResponse.json({ error: "Sign in to view your portfolio." }, { status: 401 });
    return NextResponse.json(portfolio.holdings);
  } catch { return NextResponse.json({ error: "Portfolio storage is unavailable." }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const holdingInput = normalizeHoldingInput(data);
    if (!holdingInput) return NextResponse.json({ error: "Invalid holding." }, { status: 400 });
    const { symbol, companyName, shares, averageCost } = holdingInput;
    const portfolio = await getPortfolio();
    if (!portfolio) return NextResponse.json({ error: "Sign in to update your portfolio." }, { status: 401 });
    const holding = await prisma.holding.upsert({ where: { portfolioId_symbol: { portfolioId: portfolio.id, symbol } }, update: { companyName, shares, averageCost }, create: { portfolioId: portfolio.id, symbol, companyName, shares, averageCost } });
    return NextResponse.json(holding, { status: 201 });
  } catch { return NextResponse.json({ error: "Portfolio storage is unavailable. Configure DATABASE_URL." }, { status: 503 }); }
}

export async function DELETE(request: NextRequest) {
  try {
    const symbol = new URL(request.url).searchParams.get("symbol")?.toUpperCase();
    const portfolio = await getPortfolio();
    if (!portfolio) return NextResponse.json({ error: "Sign in to update your portfolio." }, { status: 401 });
    if (!symbol) return NextResponse.json({ error: "Holding not found." }, { status: 404 });
    await prisma.holding.delete({ where: { portfolioId_symbol: { portfolioId: portfolio.id, symbol } } });
    return new NextResponse(null, { status: 204 });
  } catch { return NextResponse.json({ error: "Portfolio storage is unavailable." }, { status: 503 }); }
}
