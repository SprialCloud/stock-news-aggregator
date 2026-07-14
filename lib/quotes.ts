export type StockQuote = {
  symbol: string;
  current: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
};

export function parseQuoteSymbols(value: string | null, limit = 20) {
  if (!value) return [];

  return [...new Set(
    value
      .split(",")
      .map((symbol) => symbol.trim().toUpperCase())
      .filter((symbol) => /^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)),
  )].slice(0, limit);
}

export function normalizeFinnhubQuote(symbol: string, input: unknown): StockQuote | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;
  const current = Number(data.c);

  if (!Number.isFinite(current) || current <= 0) return null;

  return {
    symbol,
    current,
    change: finiteNumber(data.d),
    percentChange: finiteNumber(data.dp),
    high: finiteNumber(data.h),
    low: finiteNumber(data.l),
    open: finiteNumber(data.o),
    previousClose: finiteNumber(data.pc),
    timestamp: finiteNumber(data.t),
  };
}

function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
