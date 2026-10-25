import { describe, it, expect } from "vitest";
const fs = require("fs");
const path = require("path");
const {
  normalizeRate,
  getOfflineFallbackRate,
} = require("../frankfurter");

describe("Frankfurter Currency Exchange Provider Adapter", () => {
  it("normalizes fixture rate response correctly", () => {
    const fixturePath = path.join(
      __dirname,
      "../../test/fixtures/frankfurter/rates_response.json",
    );
    const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    const normalized = normalizeRate(raw, "INR");

    expect(normalized).not.toBeNull();
    expect(normalized.base).toBe("USD");
    expect(normalized.target).toBe("INR");
    expect(normalized.rate).toBe(84.45);
    expect(normalized.source).toBe("frankfurter");
  });

  it("handles offline fallback rates when external API is unreachable", () => {
    const rateUsdInr = getOfflineFallbackRate("USD", "INR");
    expect(rateUsdInr).toBeGreaterThan(80);

    const sameCurrency = getOfflineFallbackRate("INR", "INR");
    expect(sameCurrency).toBe(1.0);
  });

  it("handles empty or malformed rate data gracefully", () => {
    expect(normalizeRate(null, "INR")).toBeNull();
    expect(normalizeRate({}, "INR")).toBeNull();
    expect(normalizeRate({ rates: {} }, "INR")).toBeNull();
  });
});
