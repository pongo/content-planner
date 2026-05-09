import { describe, it, expect } from "vitest";
import { generatePastelColor } from "./pastelColor";

describe("generatePastelColor", () => {
  it("should generate different colors for different strings", () => {
    const color1 = generatePastelColor("Иван");
    const color2 = generatePastelColor("Игорь");

    expect(color1).not.toBe(color2);
  });

  it("should generate consistent colors for the same string", () => {
    const color1 = generatePastelColor("test");
    const color2 = generatePastelColor("test");

    expect(color1).toBe(color2);
  });

  it("should handle empty or whitespace-only strings", () => {
    expect(generatePastelColor("")).toBe("#fff");
    expect(generatePastelColor("   ")).toBe("#fff");
  });
});
