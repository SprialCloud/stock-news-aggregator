export type SymbolSuggestion = {
  symbol: string;
  description: string;
  type: string;
};

export const popularSymbolSuggestions: SymbolSuggestion[] = [
  { symbol: "AAPL", description: "Apple Inc", type: "Common Stock" },
  { symbol: "MSFT", description: "Microsoft Corp", type: "Common Stock" },
  { symbol: "NVDA", description: "NVIDIA Corp", type: "Common Stock" },
  { symbol: "AMZN", description: "Amazon.com Inc", type: "Common Stock" },
  { symbol: "META", description: "Meta Platforms Inc", type: "Common Stock" },
  { symbol: "TSLA", description: "Tesla Inc", type: "Common Stock" },
  { symbol: "SPY", description: "SPDR S&P 500 ETF Trust", type: "ETF" },
  { symbol: "QQQ", description: "Invesco QQQ Trust", type: "ETF" },
];

export function normalizeSymbolSearch(input: unknown, limit = 8): SymbolSuggestion[] {
  if (!input || typeof input !== "object") return [];
  const results = (input as { result?: unknown }).result;
  if (!Array.isArray(results)) return [];

  const seen = new Set<string>();
  const suggestions: SymbolSuggestion[] = [];
  for (const item of results) {
    if (!item || typeof item !== "object") continue;
    const data = item as Record<string, unknown>;
    const symbol = String(data.symbol ?? data.displaySymbol ?? "").trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol) || seen.has(symbol)) continue;
    seen.add(symbol);
    suggestions.push({
      symbol,
      description: String(data.description ?? symbol).trim() || symbol,
      type: String(data.type ?? "Security").trim() || "Security",
    });
    if (suggestions.length === limit) break;
  }
  return suggestions;
}

export function filterPopularSymbols(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return popularSymbolSuggestions;
  return popularSymbolSuggestions.filter((item) => `${item.symbol} ${item.description}`.toLowerCase().includes(normalized));
}
