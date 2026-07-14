import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) return NextResponse.json({ error: "Sign in to view trade history." }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        portfolios: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { id: true },
        },
      },
    });
    const portfolio = user?.portfolios[0];
    if (!portfolio) return NextResponse.json([]);

    return NextResponse.json(await prisma.trade.findMany({
      where: { portfolioId: portfolio.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }));
  } catch (error) {
    console.error("Trade history GET failed", error);
    return NextResponse.json({ error: "Trade history is unavailable." }, { status: 503 });
  }
}
