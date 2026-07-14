export type HoldingInput = {
  symbol: string;
  companyName: string;
  shares: number;
  averageCost: number;
};

export function normalizeHoldingInput(input: unknown): HoldingInput | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;
  const symbol = String(data.symbol ?? "").trim().toUpperCase();
  const companyName = String(data.companyName ?? symbol).trim() || symbol;
  const shares = Number(data.shares);
  const averageCost = Number(data.averageCost);

  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)) return null;
  if (!Number.isFinite(shares) || shares <= 0) return null;
  if (!Number.isFinite(averageCost) || averageCost < 0) return null;

  return { symbol, companyName, shares, averageCost };
}
