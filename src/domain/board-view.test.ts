import { describe, expect, it } from "vitest";
import type { CardRecord, WeekRecord } from "@/db/db.ts";
import {
  BOARD_COLUMNS,
  createBoardRows,
  createCardsView,
  getDuplicateFirstLines,
} from "./board-view";

function makeWeek(overrides: Partial<WeekRecord>): WeekRecord {
  return {
    id: "week",
    boardId: "board",
    title: "Week",
    order: 0,
    ...overrides,
  };
}

function makeCard(overrides: Partial<CardRecord>): CardRecord {
  return {
    id: "card",
    weekId: "week",
    column: "MON",
    title: "Title",
    order: 0,
    ...overrides,
  };
}

describe("board-view", () => {
  it("ignores dashed cards in duplicate detection", () => {
    const cards = [
      makeCard({ id: "regular", title: "Idea" }),
      makeCard({ id: "dashed", title: "- Idea" }),
    ];

    expect(getDuplicateFirstLines(cards)).toEqual(new Set());
    expect(createCardsView(cards).find((card) => card.id === "dashed")?.isDuplicate).toBe(false);
  });

  it("detects multiline title duplicates by first line", () => {
    const cards = [
      makeCard({ id: "first", title: "Idea\ndetails" }),
      makeCard({ id: "second", title: "Idea\nother details" }),
    ];

    expect(getDuplicateFirstLines(cards)).toEqual(new Set(["Idea"]));
    expect(createCardsView(cards).map((card) => card.isDuplicate)).toEqual([true, true]);
  });

  it("creates a single all-column cell for Categories row", () => {
    const rows = createBoardRows(
      [makeWeek({ id: "categories", title: "Categories" })],
      [makeCard({ id: "category-card", weekId: "categories", column: "ALL" })],
    );

    expect(rows[0]?.cells).toEqual([
      expect.objectContaining({
        weekId: "categories",
        column: "ALL",
        colspan: 7,
        cards: [expect.objectContaining({ id: "category-card" })],
      }),
    ]);
  });

  it("creates weekday cells for a normal week", () => {
    const rows = createBoardRows(
      [makeWeek({ id: "week-1", title: "Week 1" })],
      [makeCard({ id: "monday-card", weekId: "week-1", column: "MON" })],
    );

    expect(rows[0]?.cells.map((cell) => cell.column)).toEqual(BOARD_COLUMNS);
    expect(rows[0]?.cells.find((cell) => cell.column === "MON")?.cards).toEqual([
      expect.objectContaining({ id: "monday-card" }),
    ]);
  });
});
