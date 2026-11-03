import { describe, it, expect } from "vitest";
const fs = require("fs");
const path = require("path");
const { normalizeWikimediaPhoto, stripHtml } = require("../wikimedia");

describe("Wikimedia Commons Photo Provider Adapter", () => {
  it("normalizes fixture image search into photo object with clean attribution", () => {
    const fixturePath = path.join(
      __dirname,
      "../../test/fixtures/wikimedia/image_search.json",
    );
    const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    const photo = normalizeWikimediaPhoto(raw);

    expect(photo).not.toBeNull();
    expect(photo.url).toContain("Amber_Fort_Jaipur.jpg");
    expect(photo.author).toBe("Flicka");
    expect(photo.license).toBe("CC BY-SA 3.0");
    expect(photo.licenseUrl).toBe(
      "https://creativecommons.org/licenses/by-sa/3.0",
    );
    expect(photo.caption).toBe("Amer Fort, Jaipur");
  });

  it("safely strips html tags from author metadata", () => {
    expect(stripHtml('<a href="http://example.com">John &amp; Jane</a>')).toBe(
      "John &amp; Jane",
    );
    expect(stripHtml(null)).toBe("");
  });

  it("handles empty or missing pages gracefully", () => {
    expect(normalizeWikimediaPhoto(null)).toBeNull();
    expect(normalizeWikimediaPhoto({})).toBeNull();
    expect(
      normalizeWikimediaPhoto({ query: { pages: { "-1": {} } } }),
    ).toBeNull();
  });
});
