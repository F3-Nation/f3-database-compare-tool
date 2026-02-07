import { describe, it, expect } from "vitest";

describe("Platform Registry", () => {
  it("registers all 4 platforms", async () => {
    // Dynamic import to trigger auto-registration
    const { getAllPlatforms } = await import("@/lib/platforms");
    const platforms = getAllPlatforms();
    expect(platforms).toHaveLength(4);
  });

  it("has correct platform IDs", async () => {
    const { getAllPlatforms } = await import("@/lib/platforms");
    const ids = getAllPlatforms().map((p) => p.id);
    expect(ids).toContain("gcp");
    expect(ids).toContain("local");
    expect(ids).toContain("neon");
    expect(ids).toContain("supabase");
  });

  it("can get a platform by ID", async () => {
    const { getPlatform } = await import("@/lib/platforms");
    const gcp = getPlatform("gcp");
    expect(gcp).toBeDefined();
    expect(gcp?.name).toBe("GCP (Source)");
    expect(gcp?.envKey).toBe("DATABASE_URL_GCP");
  });
});
