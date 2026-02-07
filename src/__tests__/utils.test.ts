import { describe, it, expect } from "vitest";
import { formatMs } from "@/lib/utils";

describe("formatMs", () => {
  it("formats sub-millisecond values", () => {
    expect(formatMs(0.5)).toBe("<1ms");
  });

  it("formats millisecond values", () => {
    expect(formatMs(42)).toBe("42ms");
    expect(formatMs(999)).toBe("999ms");
  });

  it("formats second values", () => {
    expect(formatMs(1500)).toBe("1.50s");
    expect(formatMs(2345)).toBe("2.35s");
  });
});
