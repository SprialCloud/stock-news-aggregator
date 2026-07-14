import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/server";
import { accumulatePosition, calculateSale, normalizeTradeInput } from "@/lib/holdings";

class PortfolioTradeError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

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
    const tradeInput = normalizeTradeInput(data);
    if (!tradeInput) return NextResponse.json({ error: "Invalid trade." }, { status: 400 });
    const { type, symbol, companyName, shares, price } = tradeInput;
    const portfolio = await getPortfolio();
    if (!portfolio) return NextResponse.json({ error: "Sign in to update your portfolio." }, { status: 401 });
    const result = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.holding.findUnique({
        where: { portfolioId_symbol: { portfolioId: portfolio.id, symbol } },
      });

      if (type === "SELL") {
        if (!existing) throw new PortfolioTradeError(`You do not own ${symbol}.`, 404);
        const sale = calculateSale(existing, { shares, price });
        if (!sale) throw new PortfolioTradeError(`You only own ${existing.shares} shares of ${symbol}.`, 400);

        const holding = sale.remainingShares === 0
          ? await transaction.holding.delete({ where: { id: existing.id } }).then(() => null)
          : await transaction.holding.update({
              where: { id: existing.id },
              data: { shares: sale.remainingShares },
            });
        const trade = await transaction.trade.create({
          data: { portfolioId: portfolio.id, type, symbol, companyName: existing.companyName, shares, price, realizedPnL: sale.realizedPnL },
        });

        return { holding, trade, realizedPnL: sale.realizedPnL };
      }

      const holding = existing
        ? await transaction.holding.update({
            where: { id: existing.id },
            data: {
              companyName: companyName === symbol ? existing.companyName : companyName,
              ...accumulatePosition(existing, { shares, averageCost: price }),
            },
          })
        : await transaction.holding.create({
            data: { portfolioId: portfolio.id, symbol, companyName, shares, averageCost: price },
          });
      const trade = await transaction.trade.create({
        data: { portfolioId: portfolio.id, type, symbol, companyName: holding.companyName, shares, price },
      });

      return { holding, trade, realizedPnL: null };
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof PortfolioTradeError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Portfolio storage is unavailable. Configure DATABASE_URL." }, { status: 503 });
  }
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
