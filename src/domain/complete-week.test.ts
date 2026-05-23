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

  it("deletes regular cards already present in target week", () => {
    const changes = createCompleteWeekChanges("week-1", "week-categories", [
      makeCard({ id: "target-card", weekId: "week-categories", title: "Duplicate" }),
      makeCard({ id: "duplicate-card", title: "Duplicate\nDetails" }),
      makeCard({ id: "unique-card", title: "Unique\nDetails" }),
    ]);

    expect(changes.deleteCardIds).toEqual(["duplicate-card"]);
    expect(changes.updateCards).toEqual([
      expect.objectContaining({
        id: "unique-card",
        title: "Unique",
        order: 1,
      }),
    ]);
  });

  it("keeps only first regular card with same first-line title", () => {
    const changes = createCompleteWeekChanges("week-1", "week-categories", [
      makeCard({ id: "first-card", title: "Duplicate\nFirst details" }),
      makeCard({ id: "second-card", title: "Duplicate\nSecond details" }),
    ]);

    expect(changes.deleteCardIds).toEqual(["second-card"]);
    expect(changes.updateCards).toEqual([
      expect.objectContaining({
        id: "first-card",
        title: "Duplicate",
        order: 0,
      }),
    ]);
  });

  it("moves permanent cards even when first-line title already exists", () => {
    const changes = createCompleteWeekChanges("week-1", "week-categories", [
      makeCard({ id: "target-card", weekId: "week-categories", title: "Permanent" }),
      makeCard({ id: "permanent-card", title: "Permanent\n=\nDetails" }),
    ]);

    expect(changes.deleteCardIds).toEqual([]);
    expect(changes.updateCards).toEqual([
      expect.objectContaining({
        id: "permanent-card",
        title: "Permanent\n=\nDetails",
        order: 1,
      }),
    ]);
  });
});
