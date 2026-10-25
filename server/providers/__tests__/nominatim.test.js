import { describe, it, expect } from "vitest";
const fs = require("fs");
const path = require("path");
const { normalizeGeocode } = require("../nominatim");

describe("Nominatim Geocoding Provider Adapter", () => {
  it("normalizes fixture data into coordinates and city name", () => {
    const fixturePath = path.join(
      __dirname,
      "../../test/fixtures/nominatim/geocode_response.json",
    );
    const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    const normalized = normalizeGeocode(raw);

    expect(normalized).not.toBeNull();
    expect(normalized.name).toBe("Jaipur");
    expect(normalized.lat).toBeCloseTo(26.9124, 3);
    expect(normalized.lng).toBeCloseTo(75.7872, 3);
    expect(normalized.displayName).toContain("Rajasthan");
  });

  it("handles empty or invalid response gracefully without throwing", () => {
    expect(normalizeGeocode([])).toBeNull();
    expect(normalizeGeocode(null)).toBeNull();
  });
});
