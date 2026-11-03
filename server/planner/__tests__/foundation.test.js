import { describe, it, expect } from "vitest";
const { PlaceSchema } = require("../../schemas/place");
const { PlanRequestSchema } = require("../../schemas/request");
const { PlanSchema } = require("../../schemas/plan");
const { withFallback } = require("../../lib/withFallback");
const { cacheGet, cacheSet } = require("../../cache/cache");
const { getSeedPlaces, hasSeedData } = require("../../seed/index");
const { generatePlan } = require("../index");

describe("Phase 1: Schemas & Validation", () => {
  it("validates a valid PlaceSchema object", () => {
    const validPlace = {
      id: "seed:jaipur:hawa-mahal",
      name: "Hawa Mahal",
      category: "culture",
      lat: 26.9239,
      lng: 75.8267,
      rating: 4.6,
      popularity: 0.9,
      visitMinutes: 60,
      estCost: 200,
      source: "seed",
    };
    const parsed = PlaceSchema.parse(validPlace);
    expect(parsed.name).toBe("Hawa Mahal");
    expect(parsed.category).toBe("culture");
  });

  it("rejects an invalid PlaceSchema with bad category or coordinates", () => {
    expect(() => {
      PlaceSchema.parse({
        id: "bad",
        name: "Bad Place",
        category: "invalid-category",
        lat: 100, // Invalid lat (>90)
        lng: 0,
        source: "seed",
      });
    }).toThrow();
  });

  it("validates a valid PlanRequestSchema", () => {
    const validReq = {
      destination: "Jaipur",
      days: 3,
      budget: 15000,
      interests: ["culture", "food"],
      pace: "normal",
      currency: "INR",
    };
    const parsed = PlanRequestSchema.parse(validReq);
    expect(parsed.days).toBe(3);
    expect(parsed.currency).toBe("INR");
  });

  it("rejects invalid PlanRequestSchema inputs", () => {
    expect(() => {
      PlanRequestSchema.parse({
        destination: "J", // too short
        days: 20, // max 14
        budget: -500, // must be positive
        interests: [], // min 1
      });
    }).toThrow();
  });
});

describe("Phase 1: Resilience withFallback", () => {
  it("returns data from the first successful step without degradation", async () => {
    const chain = [async () => ["item1", "item2"], async () => ["fallback1"]];
    const res = await withFallback(chain);
    expect(res.data).toEqual(["item1", "item2"]);
    expect(res.degraded).toBe(false);
  });

  it("falls back to the second step when the first fails", async () => {
    const chain = [
      async () => {
        throw new Error("Primary API network timeout");
      },
      async () => ["fallback-seed-item"],
    ];
    const res = await withFallback(chain);
    expect(res.data).toEqual(["fallback-seed-item"]);
    expect(res.degraded).toBe(true);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it("returns degraded empty array when all steps fail", async () => {
    const chain = [
      async () => {
        throw new Error("API 1 dead");
      },
      async () => {
        throw new Error("Cache miss");
      },
    ];
    const res = await withFallback(chain);
    expect(res.data).toEqual([]);
    expect(res.degraded).toBe(true);
  });
});

describe("Phase 1: Cache with stale-while-revalidate", () => {
  it("stores and retrieves fresh items correctly", async () => {
    await cacheSet("test-key", { test: 123 }, { freshMs: 10000 });
    const cached = await cacheGet("test-key");
    expect(cached).not.toBeNull();
    expect(cached.value).toEqual({ test: 123 });
    expect(cached.stale).toBe(false);
  });

  it("identifies stale items after freshMs expires", async () => {
    await cacheSet(
      "stale-key",
      { old: true },
      { freshMs: -1000, hardMs: 60000 },
    );
    const cached = await cacheGet("stale-key");
    expect(cached).not.toBeNull();
    expect(cached.value).toEqual({ old: true });
    expect(cached.stale).toBe(true);
  });
});

describe("Phase 1: Seed Destinations", () => {
  it("loads valid seed places for Jaipur, Goa, and Varanasi", () => {
    expect(hasSeedData("Jaipur")).toBe(true);
    expect(hasSeedData("Goa")).toBe(true);
    expect(hasSeedData("Varanasi")).toBe(true);

    const jaipurPlaces = getSeedPlaces("Jaipur");
    expect(jaipurPlaces.length).toBeGreaterThanOrEqual(5);

    // Validate each place with PlaceSchema
    jaipurPlaces.forEach((p) => {
      expect(() => PlaceSchema.parse(p)).not.toThrow();
    });
  });
});

describe("Phase 1: Walking Skeleton Plan Generation", () => {
  it("generates a complete valid plan for Jaipur with zero external calls", () => {
    const request = {
      destination: "Jaipur",
      days: 3,
      budget: 15000,
      currency: "INR",
      interests: ["culture", "food"],
      pace: "normal",
    };

    const places = getSeedPlaces("Jaipur");
    const plan = generatePlan(request, places);

    expect(plan.schemaVersion).toBe(1);
    expect(plan.days.length).toBe(3);
    expect(plan.budget.stay).toBe(6000); // 40% of 15000
    expect(plan.budget.food).toBe(3750); // 25% of 15000
    expect(plan.budget.transport).toBe(2250); // 15% of 15000
    expect(plan.budget.activities).toBe(2250); // 15% of 15000
    expect(plan.budget.buffer).toBe(750); // 5% of 15000

    expect(plan.packing.length).toBeGreaterThan(0);
    expect(Object.keys(plan.places).length).toBeGreaterThan(0);

    // Validates against PlanSchema contract
    expect(() => PlanSchema.parse(plan)).not.toThrow();
  });
});
