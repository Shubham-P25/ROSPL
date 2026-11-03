import { describe, it, expect } from "vitest";
const { recommendBudget, DEFAULT_SHARES } = require("../budgetPlan");

describe("recommendBudget Planner Unit Tests", () => {
  it("always guarantees sum of categories exactly equals total across diverse budgets", () => {
    const testTotals = [1000, 3750, 5000, 12000, 25350, 48000, 100000, 250000];
    const testPeople = [1, 2, 4, 7, 10];

    for (const total of testTotals) {
      for (const people of testPeople) {
        const result = recommendBudget({ total, people, days: 4 });
        const { stay, transport, food, activities, shopping, buffer } = result.categories;
        const sum = stay + transport + food + activities + shopping + buffer;

        expect(sum).toBe(total);
        expect(stay).toBeGreaterThanOrEqual(0);
        expect(transport).toBeGreaterThanOrEqual(0);
        expect(food).toBeGreaterThanOrEqual(0);
        expect(activities).toBeGreaterThanOrEqual(0);
        expect(shopping).toBeGreaterThanOrEqual(0);
        expect(buffer).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("handles ₹0 total gracefully", () => {
    const result = recommendBudget({ total: 0, days: 3, people: 2 });
    expect(result.total).toBe(0);
    expect(result.categories.stay).toBe(0);
    expect(result.categories.buffer).toBe(0);
  });

  it("reduces stay share for 1-2 day short trips", () => {
    const shortTrip = recommendBudget({ total: 10000, days: 1, people: 1 });
    const standardTrip = recommendBudget({ total: 10000, days: 5, people: 1 });

    expect(shortTrip.categories.stay).toBeLessThan(standardTrip.categories.stay);
    expect(shortTrip.notes.some((n) => n.includes("short duration"))).toBe(true);
  });

  it("increases transport allocation for flight mode or long-distance startingLocation", () => {
    const flightTrip = recommendBudget({
      total: 20000,
      days: 4,
      transportType: "flight",
    });
    const vehicleTrip = recommendBudget({
      total: 20000,
      days: 4,
      transportType: "vehicle",
    });

    expect(flightTrip.categories.transport).toBeGreaterThan(vehicleTrip.categories.transport);
  });

  it("boosts activities share for adventure and trek tags", () => {
    const adventureTrip = recommendBudget({
      total: 15000,
      days: 4,
      tags: ["adventure", "trekking"],
    });
    const regularTrip = recommendBudget({
      total: 15000,
      days: 4,
      tags: ["culture"],
    });

    expect(adventureTrip.categories.activities).toBeGreaterThan(regularTrip.categories.activities);
  });

  it("boosts food share for larger groups (>= 4 people)", () => {
    const solo = recommendBudget({ total: 20000, days: 4, people: 1 });
    const group = recommendBudget({ total: 20000, days: 4, people: 5 });

    expect(group.categories.food).toBeGreaterThan(solo.categories.food);
  });

  it("produces realistic rounded numbers for the ₹12,000 baseline", () => {
    const result = recommendBudget({ total: 12000, days: 4, people: 1 });
    const sum = Object.values(result.categories).reduce((a, b) => a + b, 0);
    expect(sum).toBe(12000);
    // Stay approx ₹3600, transport approx ₹3000, food approx ₹2400, activities approx ₹1200
    expect(result.categories.stay).toBeGreaterThanOrEqual(3000);
    expect(result.categories.transport).toBeGreaterThanOrEqual(2500);
  });
});

