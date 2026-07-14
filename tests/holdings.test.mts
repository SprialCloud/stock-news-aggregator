import test from "node:test";
import assert from "node:assert/strict";
import { accumulatePosition, calculateSale, normalizeTradeInput } from "../lib/holdings.ts";
import { normalizeFinnhubQuote, parseQuoteSymbols } from "../lib/quotes.ts";
import { filterPopularSymbols, normalizeSymbolSearch } from "../lib/symbols.ts";

test("normalizes a valid trade", () => {
  assert.deepEqual(normalizeTradeInput({ type: "buy", symbol: " nvda ", companyName: "NVIDIA", shares: "3.5", price: "120" }), {
    type: "BUY",
    symbol: "NVDA",
    companyName: "NVIDIA",
    shares: 3.5,
    price: 120,
  });
});

test("uses the symbol when company name is blank", () => {
  assert.equal(normalizeTradeInput({ type: "BUY", symbol: "AAPL", companyName: "", shares: 1, price: 0 })?.companyName, "AAPL");
});

test("rejects invalid trade type, ticker, shares, and price", () => {
  assert.equal(normalizeTradeInput({ type: "HOLD", symbol: "AAPL", shares: 1, price: 1 }), null);
  assert.equal(normalizeTradeInput({ type: "BUY", symbol: "", shares: 1, price: 1 }), null);
  assert.equal(normalizeTradeInput({ type: "BUY", symbol: "AAPL", shares: 0, price: 1 }), null);
  assert.equal(normalizeTradeInput({ type: "BUY", symbol: "AAPL", shares: 1, price: -1 }), null);
});

test("accumulates purchases using weighted average cost", () => {
  const accumulated = accumulatePosition(
    { shares: 3.5, averageCost: 120 },
    { shares: 5, averageCost: 130 },
  );

  assert.equal(accumulated.shares, 8.5);
  assert.ok(Math.abs(accumulated.averageCost - 125.88235294117646) < 0.000001);
});

test("calculates a partial sale and keeps average cost", () => {
  const sale = calculateSale(
    { shares: 8.5, averageCost: 125.88235294117646 },
    { shares: 3.5, price: 140 },
  );

  assert.ok(sale);
  assert.equal(sale.remainingShares, 5);
  assert.equal(sale.averageCost, 125.88235294117646);
  assert.ok(Math.abs(sale.realizedPnL - 49.41176470588239) < 0.000001);
});

test("closes a position when every share is sold", () => {
  const sale = calculateSale(
    { shares: 4, averageCost: 125 },
    { shares: 4, price: 140 },
  );

  assert.ok(sale);
  assert.equal(sale.remainingShares, 0);
  assert.equal(sale.realizedPnL, 60);
});

test("rejects selling more shares than the position", () => {
  assert.equal(calculateSale({ shares: 2, averageCost: 100 }, { shares: 3, price: 110 }), null);
});

test("normalizes and limits quote symbols", () => {
  assert.deepEqual(parseQuoteSymbols(" nvda,AAPL,NVDA,bad symbol "), ["NVDA", "AAPL"]);
  assert.deepEqual(parseQuoteSymbols("AAPL,MSFT,NVDA", 2), ["AAPL", "MSFT"]);
});

test("normalizes a Finnhub quote", () => {
  assert.deepEqual(
    normalizeFinnhubQuote("AAPL", { c: 210, d: 2, dp: 0.96, h: 212, l: 207, o: 208, pc: 208, t: 123 }),
    { symbol: "AAPL", current: 210, change: 2, percentChange: 0.96, high: 212, low: 207, open: 208, previousClose: 208, timestamp: 123 },
  );
  assert.equal(normalizeFinnhubQuote("BAD", { c: 0 }), null);
});

test("normalizes and deduplicates Finnhub symbol search results", () => {
  assert.deepEqual(normalizeSymbolSearch({ result: [
    { symbol: "AAPL", description: "APPLE INC", type: "Common Stock" },
    { symbol: "AAPL", description: "APPLE INC", type: "Common Stock" },
    { symbol: "bad symbol", description: "Invalid", type: "Other" },
  ] }), [{ symbol: "AAPL", description: "APPLE INC", type: "Common Stock" }]);
  assert.equal(filterPopularSymbols("apple")[0]?.symbol, "AAPL");
});
