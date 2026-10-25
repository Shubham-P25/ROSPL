import { describe, it, expect } from "vitest";
const {
  fetchDestinationHighlights,
  normalizeYouTubeItem,
} = require("../youtube");

describe("Highlights Plugin Adapter", () => {
  it("normalizes a YouTube Data API search result item", () => {
    const raw = {
      id: { videoId: "dQw4w9WgXcQ" },
      snippet: {
        title: "Jaipur Travel Guide - 48 Hours in Pink City",
        channelTitle: "Traveler Channel",
        thumbnails: {
          medium: { url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg" },
        },
      },
    };

    const normalized = normalizeYouTubeItem(raw);
    expect(normalized).not.toBeNull();
    expect(normalized.title).toBe(
      "Jaipur Travel Guide - 48 Hours in Pink City",
    );
    expect(normalized.channelTitle).toBe("Traveler Channel");
    expect(normalized.url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(normalized.source).toBe("youtube");
  });

  it("returns curated destination guides silently when no API key is provided", async () => {
    delete process.env.YOUTUBE_API_KEY;
    const guides = await fetchDestinationHighlights("Jaipur");

    expect(Array.isArray(guides)).toBe(true);
    expect(guides.length).toBeGreaterThan(0);
    expect(guides[0].title).toContain("Jaipur");
    expect(guides[0].url).toContain("wikivoyage");
  });

  it("handles unknown or empty destinations gracefully", async () => {
    expect(await fetchDestinationHighlights("")).toEqual([]);
    expect(await fetchDestinationHighlights(null)).toEqual([]);
  });
});
