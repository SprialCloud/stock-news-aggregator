export type TradeType = "BUY" | "SELL";

export type TradeInput = {
  type: TradeType;
  symbol: string;
  companyName: string;
  shares: number;
  price: number;
};

export type PositionValues = {
  shares: number;
  averageCost: number;
};

export function accumulatePosition(
  existing: PositionValues,
  purchase: PositionValues,
): PositionValues {
  const shares = existing.shares + purchase.shares;
  const averageCost =
    (existing.shares * existing.averageCost +
      purchase.shares * purchase.averageCost) /
    shares;

  return { shares, averageCost };
}

export function calculateSale(
  existing: PositionValues,
  sale: Pick<TradeInput, "shares" | "price">,
) {
  if (sale.shares > existing.shares) return null;

  return {
    remainingShares: existing.shares - sale.shares,
    averageCost: existing.averageCost,
    realizedPnL: (sale.price - existing.averageCost) * sale.shares,
  };
}

export function normalizeTradeInput(input: unknown): TradeInput | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;
  const type = String(data.type ?? "").toUpperCase() as TradeType;
  const symbol = String(data.symbol ?? "").trim().toUpperCase();
  const companyName = String(data.companyName ?? symbol).trim() || symbol;
  const shares = Number(data.shares);
  const price = Number(data.price);

  if (type !== "BUY" && type !== "SELL") return null;
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)) return null;
  if (!Number.isFinite(shares) || shares <= 0) return null;
  if (!Number.isFinite(price) || price < 0) return null;

  return { type, symbol, companyName, shares, price };
}
