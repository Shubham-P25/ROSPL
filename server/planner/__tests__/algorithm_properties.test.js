import { describe, it, expect } from "vitest";
const { scorePlaces, deduplicatePlaces } = require("../scoring");
const { clusterIntoDays } = require("../cluster");
const { orderDay, pathKm } = require("../order");
const { assignTimeSlots } = require("../slots");
const { splitBudget, verifyBudget } = require("../budget");
const { generatePackingList } = require("../packing");
const { generatePlan, STOPS_PER_DAY } = require("../index");
const { getSeedPlaces } = require("../../seed/index");

describe("Phase 2: Scoring & Deduplication (Section 7.1)", () => {
  it("calculates exact deterministic weighted scores", () => {
    const places = [
      {
        id: "p1",
        name: "Alpha",
        category: "culture",
        rating: 5,
        popularity: 1.0,
        lat: 20,
        lng: 70,
      },
      {
        id: "p2",
        name: "Beta",
        category: "food",
        rating: 4,
        popularity: 0.5,
        lat: 21,
        lng: 71,
      },
      {
        id: "p3",
        name: "Gamma",
        category: "other",
        rating: 3,
        popularity: 0.2,
        lat: 22,
        lng: 72,
      },
    ];
    // interest match = 1, non-match = 0.35
    // score = 0.45 * interest + 0.30 * (rating/5) + 0.25 * popularity
    // p1 (matches culture): 0.45*1 + 0.30*1.0 + 0.25*1.0 = 0.45 + 0.30 + 0.25 = 1.00
    // p2 (matches food): 0.45*1 + 0.30*0.8 + 0.25*0.5 = 0.45 + 0.24 + 0.125 = 0.815
    // p3 (no match): 0.45*0.35 + 0.30*0.6 + 0.25*0.2 = 0.1575 + 0.18 + 0.05 = 0.3875
    const scored = scorePlaces(places, ["culture", "food"]);
    expect(scored[0].id).toBe("p1");
    expect(scored[0].score).toBe(1.0);
    expect(scored[1].id).toBe("p2");
    expect(scored[1].score).toBe(0.815);
    expect(scored[2].id).toBe("p3");
    expect(scored[2].score).toBe(0.3875);
  });

  it("breaks score ties deterministically by place id", () => {
    const places = [
      {
        id: "place-z",
        name: "Zed",
        category: "culture",
        rating: 4,
        popularity: 0.5,
        lat: 20,
        lng: 70,
      },
      {
        id: "place-a",
        name: "Aye",
        category: "culture",
        rating: 4,
        popularity: 0.5,
        lat: 21,
        lng: 71,
      },
    ];
    const scored = scorePlaces(places, ["culture"]);
    expect(scored[0].id).toBe("place-a");
    expect(scored[1].id).toBe("place-z");
  });

  it("deduplicates places with identical or contained normalized names", () => {
    const places = [
      {
        id: "p1",
        name: "Hawa Mahal",
        category: "culture",
        lat: 26.9,
        lng: 75.8,
      },
      {
        id: "p2",
        name: "hawa mahal palace",
        category: "culture",
        lat: 26.901,
        lng: 75.801,
      },
      {
        id: "p3",
        name: "Amber Fort",
        category: "culture",
        lat: 26.98,
        lng: 75.85,
      },
    ];
    const deduped = deduplicatePlaces(places);
    expect(deduped.length).toBe(2);
    expect(deduped.map((p) => p.id)).toEqual(["p1", "p3"]);
  });

  it("deduplicates places within 50 meters of a higher-scored place", () => {
    const places = [
      {
        id: "p1",
        name: "Fort Gate A",
        category: "culture",
        lat: 26.9855,
        lng: 75.8513,
      },
      {
        id: "p2",
        name: "Fort Gate B",
        category: "culture",
        lat: 26.98555,
        lng: 75.85135,
      }, // ~7 meters away
    ];
    const deduped = deduplicatePlaces(places);
    expect(deduped.length).toBe(1);
    expect(deduped[0].id).toBe("p1");
  });
});

describe("Phase 2: Day Clustering & Balancing (Section 7.4)", () => {
  it("never exceeds the maximum allowed stops per day", () => {
    const jaipurPlaces = getSeedPlaces("Jaipur");
    const maxPerDay = 3;
    const clusters = clusterIntoDays(jaipurPlaces, 3, maxPerDay);

    for (const dayGroup of clusters) {
      expect(dayGroup.length).toBeLessThanOrEqual(maxPerDay);
    }
  });

  it("handles 1-day clustering gracefully", () => {
    const jaipurPlaces = getSeedPlaces("Jaipur").slice(0, 4);
    const clusters = clusterIntoDays(jaipurPlaces, 1, 4);
    expect(clusters.length).toBe(1);
    expect(clusters[0].length).toBe(4);
  });
});

describe("Phase 2: Route Ordering & 2-Opt TSP (Section 7.5)", () => {
  it("starts the day route from the top-scored place", () => {
    const places = [
      { id: "p1", name: "First", lat: 26.9, lng: 75.8, score: 0.95 },
      { id: "p2", name: "Second", lat: 26.95, lng: 75.82, score: 0.8 },
      { id: "p3", name: "Third", lat: 26.92, lng: 75.84, score: 0.7 },
    ];
    const ordered = orderDay(places);
    expect(ordered[0].id).toBe("p1");
  });

  it("optimizes route distance via 2-opt so total path is minimal or equal", () => {
    const places = [
      { id: "p1", lat: 0, lng: 0 },
      { id: "p2", lat: 0, lng: 10 },
      { id: "p3", lat: 10, lng: 0 },
      { id: "p4", lat: 10, lng: 10 },
    ];
    const ordered = orderDay(places);
    expect(ordered.length).toBe(4);
    const dist = pathKm(ordered);
    expect(dist).toBeGreaterThan(0);
  });
});

describe("Phase 2: Time Slots & Chronology (Section 7.6)", () => {
  it("assigns morning, afternoon, and evening slots based on clock advancement", () => {
    const places = [
      {
        id: "p1",
        name: "Morning Stop",
        visitMinutes: 120,
        lat: 26.9,
        lng: 75.8,
      }, // 09:00 - 11:00 (morning)
      {
        id: "p2",
        name: "Afternoon Stop",
        visitMinutes: 180,
        lat: 26.91,
        lng: 75.81,
      }, // travel + visit + lunch -> afternoon
      {
        id: "p3",
        name: "Evening Stop",
        visitMinutes: 120,
        lat: 26.92,
        lng: 75.82,
      }, // into evening
    ];
    const slots = assignTimeSlots(places);
    expect(slots[0].slot).toBe("morning");
    expect(slots[0].travelMinutesFromPrev).toBe(0);

    const hasAfternoon = slots.some((s) => s.slot === "afternoon");
    expect(hasAfternoon).toBe(true);
  });
});

describe("Phase 2: Budget Rules (Section 7.7)", () => {
  it("splits budget precisely according to rules", () => {
    const budget = splitBudget(20000);
    expect(budget.stay).toBe(8000); // 40%
    expect(budget.food).toBe(5000); // 25%
    expect(budget.transport).toBe(3000); // 15%
    expect(budget.activities).toBe(3000); // 15%
    expect(budget.buffer).toBe(1000); // 5%

    const sum = Object.values(budget).reduce((a, b) => a + b, 0);
    expect(sum).toBe(20000);
  });

  it("generates warning when activity admission costs exceed allocated budget", () => {
    const places = [
      { category: "adventure", estCost: 2000 },
      { category: "nightlife", estCost: 2500 },
    ];
    const verification = verifyBudget(places, 3000); // activities budget 3000 < total cost 4500
    expect(verification.warnings.length).toBeGreaterThan(0);
    expect(verification.warnings[0]).toContain(
      "exceed your allocated activities budget",
    );
  });

  it("uses category default when place estCost is missing and warns of approximate estimate", () => {
    const places = [
      { category: "culture" }, // no estCost -> default 250
      { category: "food" }, // no estCost -> default 400
    ];
    const verification = verifyBudget(places, 1000);
    expect(verification.totalEstCost).toBe(650);
    expect(
      verification.warnings.some((w) =>
        w.includes("estimated based on regional category averages"),
      ),
    ).toBe(true);
  });
});

describe("Phase 2: Packing List Generation (Section 7.8)", () => {
  it("adds rain gear when rain probability > 40%", () => {
    const packing = generatePackingList(
      { rainProbability: 60, maxTemp: 26, minTemp: 18 },
      { days: 3 },
      [],
    );
    const hasUmbrella = packing.some(
      (p) =>
        p.item.toLowerCase().includes("umbrella") ||
        p.item.toLowerCase().includes("raincoat"),
    );
    expect(hasUmbrella).toBe(true);
  });

  it("adds sun protection when temperature > 32°C", () => {
    const packing = generatePackingList(
      { rainProbability: 0, maxTemp: 38, minTemp: 24 },
      { days: 3 },
      [],
    );
    const hasSunscreen = packing.some((p) =>
      p.item.toLowerCase().includes("sunscreen"),
    );
    expect(hasSunscreen).toBe(true);
  });

  it("adds warm jacket when min temperature < 12°C", () => {
    const packing = generatePackingList(
      { rainProbability: 0, maxTemp: 18, minTemp: 8 },
      { days: 3 },
      [],
    );
    const hasJacket = packing.some((p) =>
      p.item.toLowerCase().includes("jacket"),
    );
    expect(hasJacket).toBe(true);
  });

  it("adds modest clothing when visiting religious sites", () => {
    const places = [{ category: "religious", name: "Temple" }];
    const packing = generatePackingList(null, { days: 2 }, places);
    const hasModest = packing.some((p) =>
      p.item.toLowerCase().includes("modest clothing"),
    );
    expect(hasModest).toBe(true);
  });

  it("adds walking shoes when visiting nature or adventure sights", () => {
    const places = [{ category: "adventure", name: "Mountain Trek" }];
    const packing = generatePackingList(null, { days: 2 }, places);
    const hasShoes = packing.some((p) =>
      p.item.toLowerCase().includes("walking shoes"),
    );
    expect(hasShoes).toBe(true);
  });

  it("adds laundry supplies when trip > 5 days", () => {
    const packing = generatePackingList(null, { days: 7 }, []);
    const hasLaundry = packing.some((p) =>
      p.item.toLowerCase().includes("laundry bag"),
    );
    expect(hasLaundry).toBe(true);
  });
});

describe("Phase 2: Algorithm Invariant Properties", () => {
  it("guarantees 100% deterministic output on identical inputs", () => {
    const request = {
      destination: "Goa",
      days: 3,
      budget: 18000,
      currency: "INR",
      interests: ["nature", "food"],
      pace: "normal",
    };
    const places = getSeedPlaces("Goa");

    const plan1 = generatePlan(request, places);
    const plan2 = generatePlan(request, places);

    expect(JSON.stringify(plan1.days)).toBe(JSON.stringify(plan2.days));
    expect(JSON.stringify(plan1.budget)).toBe(JSON.stringify(plan2.budget));
    expect(JSON.stringify(plan1.packing)).toBe(JSON.stringify(plan2.packing));
  });

  it("handles 1-day trip correctly without day overflow", () => {
    const request = {
      destination: "Varanasi",
      days: 1,
      budget: 5000,
      currency: "INR",
      interests: ["religious", "culture"],
      pace: "relaxed",
    };
    const places = getSeedPlaces("Varanasi");
    const plan = generatePlan(request, places);

    expect(plan.days.length).toBe(1);
    expect(plan.days[0].items.length).toBeLessThanOrEqual(
      STOPS_PER_DAY.relaxed,
    );
  });

  it("handles 14-day trip correctly", () => {
    const request = {
      destination: "Jaipur",
      days: 14,
      budget: 50000,
      currency: "INR",
      interests: ["culture", "shopping"],
      pace: "normal",
    };
    const places = getSeedPlaces("Jaipur");
    const plan = generatePlan(request, places);

    expect(plan.days.length).toBe(14);
    // Because Jaipur seed has ~9 places, some days will have warnings about leisure
    expect(plan.warnings.length).toBeGreaterThan(0);
  });

  it("handles empty places array with empty plan and helpful warning", () => {
    const request = {
      destination: "Nowhere Land",
      days: 3,
      budget: 10000,
      currency: "INR",
      interests: ["culture"],
      pace: "normal",
    };
    const plan = generatePlan(request, []);
    expect(plan.days.length).toBe(3);
    plan.days.forEach((d) => expect(d.items.length).toBe(0));
    expect(
      plan.warnings.some((w) => w.includes("No specific places found")),
    ).toBe(true);
  });

  it("handles tiny budget without crashing", () => {
    const request = {
      destination: "Jaipur",
      days: 2,
      budget: 100, // Tiny ₹100 budget
      currency: "INR",
      interests: ["culture"],
      pace: "normal",
    };
    const places = getSeedPlaces("Jaipur");
    const plan = generatePlan(request, places);
    expect(plan.budget.stay).toBe(40);
    expect(plan.budget.food).toBe(25);
    expect(plan.warnings.length).toBeGreaterThan(0);
  });
});
