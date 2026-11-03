import { describe, it, expect } from "vitest";
import { normalizeWeatherData } from "../../controllers/weatherController";
import fixture from "../../test/fixtures/openmeteo/forecast_response.json";

describe("Weather Normalizer", () => {
  it("normalizes Open-Meteo forecast fixture without any NaN or invalid values", () => {
    const result = normalizeWeatherData({
      location: "Jaipur",
      dailyRaw: fixture.daily,
      currentRaw: {
        temperature_2m: 30.2,
        apparent_temperature: 31.0,
        relative_humidity_2m: 45,
        wind_speed_10m: 11.4,
        weather_code: 1,
      },
    });

    expect(result.location).toBe("Jaipur");
    expect(result.source).toBe("open-meteo");
    expect(result.current).toBeDefined();
    expect(Number.isFinite(result.current.temp)).toBe(true);
    expect(Number.isNaN(result.current.temp)).toBe(false);
    expect(Number.isNaN(result.current.feelsLike)).toBe(false);
    expect(result.daily.length).toBe(3);

    for (const d of result.daily) {
      expect(Number.isNaN(d.tempMax)).toBe(false);
      expect(Number.isNaN(d.tempMin)).toBe(false);
      expect(Number.isNaN(d.rainProb)).toBe(false);
      expect(d.condition).toBeDefined();
      expect(d.source).toBe("forecast");
    }

    // Verify string representation contains no NaN
    const serialized = JSON.stringify(result);
    expect(serialized.includes("NaN")).toBe(false);
    expect(serialized.includes("null")).toBe(false);
  });

  it("handles missing or sparse raw fields gracefully without NaN", () => {
    const result = normalizeWeatherData({
      location: "Goa",
      currentRaw: null,
      dailyRaw: {
        time: ["2026-11-01"],
        temperature_2m_max: [undefined],
        temperature_2m_min: [null],
        precipitation_probability_max: [NaN],
      },
      isArchive: true,
    });

    expect(result.location).toBe("Goa");
    expect(result.daily.length).toBe(1);
    expect(result.daily[0].tempMax).toBeNull();
    expect(result.daily[0].tempMin).toBeNull();
    expect(result.daily[0].rainProb).toBe(0);
    expect(result.daily[0].source).toBe("climatology");

    const serialized = JSON.stringify(result);
    expect(serialized.includes("NaN")).toBe(false);
  });
});

