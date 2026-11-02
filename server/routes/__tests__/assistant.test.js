import { describe, it, expect } from "vitest";
const { retrieve, tokenize } = require("../../lib/rag");

describe("Assistant RAG & Intent Retrieval Tests", () => {
  it("tokenizes sentences properly without stopwords", () => {
    const tokens = tokenize("How do I split my budget for travel?");
    expect(tokens).toContain("split");
    expect(tokens).toContain("budget");
    expect(tokens).toContain("travel");
    expect(tokens).not.toContain("how");
    expect(tokens).not.toContain("do");
  });

  it("retrieves relevant FAQ chunks for budget tab questions", () => {
    const results = retrieve("How does the budget tab work?");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title.toLowerCase()).toContain("budget");
    expect(results[0].text).toContain("deterministic budget allocation");
  });

  it("retrieves packing checklist details from FAQ", () => {
    const results = retrieve("How does packing checklist work?");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title.toLowerCase()).toContain("packing");
  });

  it("retrieves verified transport notes for Jaipur", () => {
    const results = retrieve("transit airport railway in Jaipur");
    expect(results.length).toBeGreaterThan(0);
    const hasJaipur = results.some((r) => r.text.includes("Jaipur") || r.title.includes("Jaipur"));
    expect(hasJaipur).toBe(true);
  });

  it("retrieves emergency numbers", () => {
    const results = retrieve("police ambulance emergency helplines");
    expect(results.length).toBeGreaterThan(0);
    const hasEmergency = results.some((r) => r.text.includes("112") || r.text.includes("100"));
    expect(hasEmergency).toBe(true);
  });
});
