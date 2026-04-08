import { describe, it, expect } from "vitest";
import { generateUniqueSlug } from "./slug";

describe("generateUniqueSlug", () => {
  it("generates a basic slug", () => {
    expect(generateUniqueSlug("My Board", new Set())).toBe("my-board");
  });

  it("handles reserved words", () => {
    // 'new' is reserved, should become 'new-2'
    expect(generateUniqueSlug("new", new Set())).toBe("new-2");
  });

  it("handles existing slugs by appending -2", () => {
    const existing = new Set(["my-board"]);
    expect(generateUniqueSlug("My Board", existing)).toBe("my-board-2");
  });

  it("increments numeric suffix if it already exists", () => {
    const existing = new Set(["my-board", "my-board-2"]);
    expect(generateUniqueSlug("My Board", existing)).toBe("my-board-3");
  });

  it("correctly increments if the title itself ends with a number", () => {
    const existing = new Set(["my-board-2"]);
    // "My Board 2" slugifies to "my-board-2", which exists, so it should become "my-board-3"
    expect(generateUniqueSlug("My Board 2", existing)).toBe("my-board-3");
  });

  it("handles multiple collisions and reserved word collisions", () => {
    const existing = new Set(["new-2", "new-3"]);
    // "new" is reserved -> tries "new-2" (exists) -> tries "new-3" (exists) -> "new-4"
    expect(generateUniqueSlug("new", existing)).toBe("new-4");
  });

  it("falls back to 'board' for empty or special-character-only titles", () => {
    expect(generateUniqueSlug("!!!", new Set())).toBe("board");
    expect(generateUniqueSlug("", new Set())).toBe("board");
  });

  it("handles collisions with the fallback name", () => {
    const existing = new Set(["board"]);
    expect(generateUniqueSlug("!!!", existing)).toBe("board-2");
  });
});
