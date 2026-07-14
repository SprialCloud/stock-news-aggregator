import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { parseQuoteSymbols } from "@/lib/quotes";

async function getCurrentUser() {
  const { data: session } = await auth.getSession();
  if (!session?.user) return null;

  return prisma.user.upsert({
    where: { id: session.user.id },
    update: { email: session.user.email, name: session.user.name },
    create: { id: session.user.id, email: session.user.email, name: session.user.name },
  });
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in to view your watchlist." }, { status: 401 });
    return NextResponse.json(await prisma.watchlistItem.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    }));
  } catch {
    return NextResponse.json({ error: "Watchlist storage is unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in to update your watchlist." }, { status: 401 });
    const data = await request.json();
    const symbol = parseQuoteSymbols(String(data.symbol ?? ""), 1)[0];
    if (!symbol) return NextResponse.json({ error: "Enter a valid ticker symbol." }, { status: 400 });

    const existing = await prisma.watchlistItem.findUnique({
      where: { userId_symbol: { userId: user.id, symbol } },
    });
    if (existing) return NextResponse.json(existing);

    const itemCount = await prisma.watchlistItem.count({ where: { userId: user.id } });
    if (itemCount >= 20) return NextResponse.json({ error: "Watchlist limit is 20 symbols." }, { status: 400 });

    const item = await prisma.watchlistItem.create({ data: { userId: user.id, symbol } });
    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Watchlist storage is unavailable." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in to update your watchlist." }, { status: 401 });
    const symbol = parseQuoteSymbols(request.nextUrl.searchParams.get("symbol"), 1)[0];
    if (!symbol) return NextResponse.json({ error: "Ticker not found." }, { status: 404 });

    await prisma.watchlistItem.delete({ where: { userId_symbol: { userId: user.id, symbol } } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Watchlist storage is unavailable." }, { status: 503 });
  }
}
