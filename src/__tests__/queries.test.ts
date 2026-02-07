import { describe, it, expect } from "vitest";
import { PRESET_QUERIES } from "@/lib/queries";

describe("PRESET_QUERIES", () => {
  it("has 3 preset queries", () => {
    expect(PRESET_QUERIES).toHaveLength(3);
  });

  it("has small, medium, and large queries", () => {
    const sizes = PRESET_QUERIES.map((q) => q.size);
    expect(sizes).toContain("small");
    expect(sizes).toContain("medium");
    expect(sizes).toContain("large");
  });

  it("each query has required fields", () => {
    for (const q of PRESET_QUERIES) {
      expect(q.id).toBeTruthy();
      expect(q.name).toBeTruthy();
      expect(q.description).toBeTruthy();
      expect(q.sql).toBeTruthy();
    }
  });
});
