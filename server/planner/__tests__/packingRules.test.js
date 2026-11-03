import { describe, it, expect } from "vitest";
const { recommendPacking } = require("../packingRules");

describe("Packing Rules Engine Tests", () => {
  it("recommends swimwear, beach towel, and sunscreen for Goa", () => {
    const items = recommendPacking({
      destination: "Goa",
      days: 4,
      people: 2,
    });

    const names = items.map((i) => i.name.toLowerCase());
    expect(names.some((n) => n.includes("swimwear"))).toBe(true);
    expect(names.some((n) => n.includes("beach towel"))).toBe(true);
    expect(names.some((n) => n.includes("sunscreen"))).toBe(true);
    expect(names.some((n) => n.includes("power strip"))).toBe(true); // people > 1
  });

  it("recommends thermal innerwear, warm gloves, and cold cream for Manali in winter", () => {
    const items = recommendPacking({
      destination: "Manali",
      weather: { minTemp: -2, maxTemp: 8, rainProbability: 20 },
      days: 5,
      people: 1,
    });

    const names = items.map((i) => i.name.toLowerCase());
    expect(names.some((n) => n.includes("thermal"))).toBe(true);
    expect(names.some((n) => n.includes("gloves"))).toBe(true);
    expect(names.some((n) => n.includes("cold cream"))).toBe(true);
    expect(names.some((n) => n.includes("snow jacket") || n.includes("down"))).toBe(true);
  });

  it("scales clothing quantities based on trip length", () => {
    const shortTrip = recommendPacking({ destination: "Delhi", days: 2 });
    const longTrip = recommendPacking({ destination: "Delhi", days: 7 });

    const shortTshirt = shortTrip.find((i) => i.name.includes("T-Shirts"));
    const longTshirt = longTrip.find((i) => i.name.includes("T-Shirts"));

    expect(shortTshirt.name).toContain("×3");
    expect(longTshirt.name).toContain("×8");

    // Trips > 5 days include laundry detergent
    expect(shortTrip.some((i) => i.name.toLowerCase().includes("laundry"))).toBe(false);
    expect(longTrip.some((i) => i.name.toLowerCase().includes("laundry"))).toBe(true);
  });

  it("has no duplicate item names within a single recommendation", () => {
    const items = recommendPacking({
      destination: "Varanasi",
      days: 6,
      people: 4,
      interests: ["religious", "culture"],
      weather: { minTemp: 14, maxTemp: 36, rainProbability: 50 },
    });

    const seen = new Set();
    for (const item of items) {
      const lower = item.name.toLowerCase();
      expect(seen.has(lower)).toBe(false);
      seen.add(lower);
    }
  });

  it("deduplicates properly when simulating two calls against existing list", () => {
    const firstRun = recommendPacking({
      destination: "Goa",
      days: 3,
      people: 1,
    });

    const existingNames = new Set(firstRun.map((i) => i.name.toLowerCase()));

    // Second run with the same params
    const secondRun = recommendPacking({
      destination: "Goa",
      days: 3,
      people: 1,
    });

    const newItems = secondRun.filter(
      (item) => !existingNames.has(item.name.toLowerCase())
    );

    expect(newItems.length).toBe(0);
  });
});

