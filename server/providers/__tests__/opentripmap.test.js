import { describe, it, expect } from "vitest";
const fs = require("fs");
const path = require("path");
const { normalizePlaces, mapKindsToCategory } = require("../opentripmap");

describe("OpenTripMap Provider Adapter", () => {
  it("maps kinds to internal CATEGORIES accurately", () => {
    expect(mapKindsToCategory("historic,cultural")).toBe("culture");
    expect(mapKindsToCategory("religion,temple")).toBe("religious");
    expect(mapKindsToCategory("natural,lake")).toBe("nature");
    expect(mapKindsToCategory("food,restaurant")).toBe("food");
    expect(mapKindsToCategory("shops,bazaar")).toBe("shopping");
    expect(mapKindsToCategory("amusements,climb")).toBe("adventure");
    expect(mapKindsToCategory("nightclub,bar")).toBe("nightlife");
    expect(mapKindsToCategory("random_tag")).toBe("other");
  });

  it("normalizes fixture data into PlaceSchema-valid objects and skips items with empty names", () => {
    const fixturePath = path.join(
      __dirname,
      "../../test/fixtures/opentripmap/places_response.json",
    );
    const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    const normalized = normalizePlaces(raw);

    // Third item had an empty name, so only 2 items should pass
    expect(normalized.length).toBe(2);
    expect(normalized[0].id).toBe("opentripmap:Q12345");
    expect(normalized[0].name).toBe("Amber Palace Complex");
    expect(normalized[0].category).toBe("culture");
    expect(normalized[0].rating).toBe(5); // rate: 3 * (5/3) = 5
    expect(normalized[0].lat).toBe(26.9855);
    expect(normalized[0].lng).toBe(75.8513);
  });
});
