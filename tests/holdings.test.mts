import test from "node:test";
import assert from "node:assert/strict";
import { normalizeHoldingInput } from "../lib/holdings.ts";

test("normalizes a valid holding", () => {
  assert.deepEqual(normalizeHoldingInput({ symbol: " nvda ", companyName: "NVIDIA", shares: "3.5", averageCost: "120" }), {
    symbol: "NVDA",
    companyName: "NVIDIA",
    shares: 3.5,
    averageCost: 120,
  });
});

test("uses the symbol when company name is blank", () => {
  assert.equal(normalizeHoldingInput({ symbol: "AAPL", companyName: "", shares: 1, averageCost: 0 })?.companyName, "AAPL");
});

test("rejects invalid ticker, shares, and average cost", () => {
  assert.equal(normalizeHoldingInput({ symbol: "", shares: 1, averageCost: 1 }), null);
  assert.equal(normalizeHoldingInput({ symbol: "AAPL", shares: 0, averageCost: 1 }), null);
  assert.equal(normalizeHoldingInput({ symbol: "AAPL", shares: 1, averageCost: -1 }), null);
});
