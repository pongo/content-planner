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
      expect(parseTitle("Single Line")).toEqual({
        firstLine: "Single Line",
        remainingLines: "",
        isMultiline: false,
        isPermanent: false,
      });
    });

    it("parses multiline title", () => {
      expect(parseTitle("Line 1\nLine 2\nLine 3")).toEqual({
        firstLine: "Line 1",
        remainingLines: "Line 2\nLine 3",
        isMultiline: true,
        isPermanent: false,
      });

      expect(parseTitle("Line 1\n-Line 2").isMultiline).toBe(true);
      expect(parseTitle("Line 1\n-").isMultiline).toBe(true);
    });

    it("detects permanent card with '=' on second line", () => {
      expect(parseTitle("Permanent\n=\nSub 1\nSub 2")).toEqual({
        firstLine: "Permanent",
        remainingLines: "Sub 1\nSub 2",
        isMultiline: true,
        isPermanent: true,
      });
    });

    it("permanent cards should have remaining lines", () => {
      expect(parseTitle("Fake permanent\n=")).toEqual({
        firstLine: "Fake permanent",
        remainingLines: "=",
        isMultiline: true,
        isPermanent: false,
      });
    });

    it("does not detect permanent if '=' is not on second line", () => {
      expect(parseTitle("Line 1\nLine 2\n=")).toEqual({
        firstLine: "Line 1",
        remainingLines: "Line 2\n=",
        isMultiline: true,
        isPermanent: false,
      });
    });
  });
});
