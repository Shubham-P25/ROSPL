import { describe, it, expect } from "vitest";
const fs = require("fs");
const path = require("path");
const { normalizeWeather } = require("../openmeteo");

describe("Open-Meteo Weather Provider Adapter", () => {
  it("normalizes fixture forecast into structured daily weather and summary stats", () => {
    const fixturePath = path.join(
      __dirname,
      "../../test/fixtures/openmeteo/forecast_response.json",
    );
    const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    const normalized = normalizeWeather(raw, "Jaipur");

    expect(normalized).not.toBeNull();
    expect(normalized.location).toBe("Jaipur");
    expect(normalized.source).toBe("open-meteo");
    expect(normalized.temperatureMax).toBe(32);
    expect(normalized.temperatureMin).toBe(18);
    expect(normalized.rainProbability).toBe(45);
    expect(Array.isArray(normalized.daily)).toBe(true);
    expect(normalized.daily.length).toBe(3);
    expect(normalized.daily[0]).toEqual({
      date: "2026-10-25",
      tempMax: 31.5,
      tempMin: 18.2,
      rainProb: 10,
    });
  });

  it("handles empty or malformed weather responses without throwing", () => {
    expect(normalizeWeather(null)).toBeNull();
    expect(normalizeWeather({})).toBeNull();
    expect(normalizeWeather({ daily: {} })).toBeNull();
  });
});
