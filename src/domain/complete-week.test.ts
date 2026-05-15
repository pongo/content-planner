import { describe, expect, it } from "vitest";
import type { CardRecord } from "@/db/db.ts";
import { createCompleteWeekChanges } from "./complete-week";

function makeCard(overrides: Partial<CardRecord>): CardRecord {
  return {
    id: "card",
    weekId: "week-1",
    column: "MON",
    title: "Title",
    order: 0,
    ...overrides,
  };
}

describe("createCompleteWeekChanges", () => {
  it("moves regular cards to Categories with first-line title", () => {
    const changes = createCompleteWeekChanges("week-1", "week-categories", [
      makeCard({ id: "target-card", weekId: "week-categories", column: "ALL", order: 0 }),
      makeCard({ id: "regular-card", title: "Regular\nDetails", column: "TUE", order: 3 }),
    ]);

    expect(changes.deleteCardIds).toEqual([]);
    expect(changes.updateCards).toEqual([
      expect.objectContaining({
        id: "regular-card",
        weekId: "week-categories",
        column: "ALL",
        title: "Regular",
        order: 1,
      }),
    ]);
  });

  it("keeps permanent card title unchanged", () => {
    const changes = createCompleteWeekChanges("week-1", "week-categories", [
      makeCard({ id: "permanent-card", title: "Permanent\n=\nDetails" }),
    ]);

    expect(changes.updateCards).toEqual([
      expect.objectContaining({
        id: "permanent-card",
        title: "Permanent\n=\nDetails",
      }),
    ]);
  });

  it("deletes dashed cards", () => {
    const changes = createCompleteWeekChanges("week-1", "week-categories", [
      makeCard({ id: "dashed-card", title: "- Draft" }),
    ]);

    expect(changes.deleteCardIds).toEqual(["dashed-card"]);
    expect(changes.updateCards).toEqual([]);
  });

  it("appends moved cards after existing target cards", () => {
    const changes = createCompleteWeekChanges("week-1", "week-categories", [
      makeCard({ id: "target-1", weekId: "week-categories", order: 0 }),
      makeCard({ id: "target-2", weekId: "week-categories", order: 1 }),
      makeCard({ id: "first-source", title: "First" }),
      makeCard({ id: "second-source", title: "Second" }),
    ]);

    expect(changes.updateCards.map((card) => [card.id, card.order])).toEqual([
      ["first-source", 2],
      ["second-source", 3],
    ]);
  });
});
