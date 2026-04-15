import { describe, it, expect } from "vitest";
import { parseTitle, firstLine } from "./card-title";

describe("card-title utilities", () => {
  describe("firstLine", () => {
    it("returns the first line of text", () => {
      expect(firstLine("Line 1\nLine 2")).toBe("Line 1");
      expect(firstLine("Single Line")).toBe("Single Line");
    });
  });

  describe("parseTitle", () => {
    it("parses single line title", () => {
      const result = parseTitle("Single Line");
      expect(result).toEqual({
        firstLine: "Single Line",
        remainingLines: "",
        isMultiline: false,
        isPermanent: false,
      });
    });

    it("parses multiline title", () => {
      const result = parseTitle("Line 1\nLine 2\nLine 3");
      expect(result).toEqual({
        firstLine: "Line 1",
        remainingLines: "Line 2\nLine 3",
        isMultiline: true,
        isPermanent: false,
      });
    });

    it("detects permanent card with '=' on second line", () => {
      const title = "Permanent\n=\nSub 1\nSub 2";
      const result = parseTitle(title);
      expect(result).toEqual({
        firstLine: "Permanent",
        remainingLines: "Sub 1\nSub 2",
        isMultiline: true,
        isPermanent: true,
      });
    });

    it("handles permanent card without remaining lines", () => {
      const title = "Permanent\n=";
      const result = parseTitle(title);
      expect(result).toEqual({
        firstLine: "Permanent",
        remainingLines: "",
        isMultiline: true,
        isPermanent: true,
      });
    });

    it("does not detect permanent if '=' is not on second line", () => {
      const title = "Line 1\nLine 2\n=";
      const result = parseTitle(title);
      expect(result.isPermanent).toBe(false);
      expect(result.remainingLines).toBe("Line 2\n=");
    });
  });
});
