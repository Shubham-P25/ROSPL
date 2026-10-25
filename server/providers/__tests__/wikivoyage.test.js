import { describe, it, expect } from "vitest";
const fs = require("fs");
const path = require("path");
const { normalizeWikivoyageSummary } = require("../wikivoyage");

describe("Wikivoyage Provider Adapter", () => {
  it("normalizes page summary fixture with extract and attribution", () => {
    const fixturePath = path.join(
      __dirname,
      "../../test/fixtures/wikivoyage/page_summary.json",
    );
    const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    const normalized = normalizeWikivoyageSummary(raw);

    expect(normalized).not.toBeNull();
    expect(normalized.title).toBe("Jaipur");
    expect(normalized.extract).toContain("Pink City");
    expect(normalized.thumbnail).toContain("Hawa_Mahal");
    expect(normalized.contentUrl).toBe("https://en.wikivoyage.org/wiki/Jaipur");
    expect(normalized.source).toBe("wikivoyage");
    expect(normalized.attribution).toContain("CC BY-SA 4.0");
  });

  it("handles empty or invalid responses gracefully", () => {
    expect(normalizeWikivoyageSummary(null)).toBeNull();
    expect(normalizeWikivoyageSummary({})).toBeNull();
    expect(normalizeWikivoyageSummary({ foo: "bar" })).toBeNull();
  });
});
