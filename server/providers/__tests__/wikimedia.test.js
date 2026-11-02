import { describe, it, expect } from "vitest";
const fs = require("fs");
const path = require("path");
const {
  isRejectedFileName,
  tokenOverlap,
  stripHtml,
} = require("../wikimedia");

describe("Wikimedia Photo Provider Validation & Matcher", () => {
  it("rejects file names containing map, locator, poster, diagram, or ending in .svg", () => {
    expect(isRejectedFileName("Map_of_Mumbai_suburbs.jpg")).toBe(true);
    expect(isRejectedFileName("Locator_map_India.png")).toBe(true);
    expect(isRejectedFileName("Gateway_of_India_poster.jpeg")).toBe(true);
    expect(isRejectedFileName("Metro_line_diagram.png")).toBe(true);
    expect(isRejectedFileName("Maharashtra_tourism_logo.jpg")).toBe(true);
    expect(isRejectedFileName("India_flag.png")).toBe(true);
    expect(isRejectedFileName("City_master_plan.jpg")).toBe(true);
    expect(isRejectedFileName("Climate_chart.png")).toBe(true);
    expect(isRejectedFileName("Vector_palace_icon.svg")).toBe(true);

    // Valid photographic file names
    expect(isRejectedFileName("Gateway_of_India_2022_sunset.jpg")).toBe(false);
    expect(isRejectedFileName("Amer_Fort_facade_Jaipur.png")).toBe(false);
  });

  it("calculates token similarity and accepts matching places while rejecting mismatches", () => {
    // Correct match: Gateway of India
    const gatewayOverlap = tokenOverlap("Gateway of India, Mumbai", "Gateway of India");
    expect(gatewayOverlap).toBeGreaterThanOrEqual(0.6);

    // Correct match: Hawa Mahal
    const hawaOverlap = tokenOverlap("Facade of Hawa Mahal", "Hawa Mahal");
    expect(hawaOverlap).toBeGreaterThanOrEqual(0.6);

    // Mismatched: Jaipur palace for a Mumbai place (e.g. Hawa Mahal for Marine Drive)
    const mismatchOverlap = tokenOverlap("Hawa Mahal Palace, Jaipur", "Marine Drive Promenade");
    expect(mismatchOverlap).toBeLessThan(0.4);

    // Mismatched: Victoria Memorial Kolkata for Siddhivinayak Temple Mumbai
    const templeMismatch = tokenOverlap("Victoria Memorial Hall, Kolkata", "Siddhivinayak Temple");
    expect(templeMismatch).toBeLessThan(0.4);
  });

  it("safely strips html tags from author metadata", () => {
    expect(stripHtml('<a href="http://example.com">John &amp; Jane</a>')).toBe(
      "John &amp; Jane",
    );
    expect(stripHtml(null)).toBe("");
  });
});
