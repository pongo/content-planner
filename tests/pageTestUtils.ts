import { flushPromises } from "@vue/test-utils";
import { getDB, type BoardRecord, type CardRecord, type WeekRecord } from "@/db/db";
import { createBoardDB } from "@/db/commands/create-board.ts";
import { createWeekDB } from "@/db/commands/create-week.ts";
import { createCardDB } from "@/db/commands/create-card.ts";

export async function clearDB() {
  const db = await getDB();
  const tx = db.transaction(["boards", "weeks", "cards"], "readwrite");
  tx.objectStore("cards").clear();
  tx.objectStore("weeks").clear();
  tx.objectStore("boards").clear();
  await tx.done;
}

export async function seedRecords(records: {
  boards?: BoardRecord[];
  weeks?: WeekRecord[];
  cards?: CardRecord[];
}) {
  for (const board of records.boards ?? []) {
    await createBoardDB({ id: board.id, title: board.title, slug: board.slug });
  }
  for (const week of records.weeks ?? []) {
    await createWeekDB({ id: week.id, boardId: week.boardId, title: week.title });
  }
  for (const card of records.cards ?? []) {
    await createCardDB({
      id: card.id,
      weekId: card.weekId,
      column: card.column,
      title: card.title,
    });
  }
}

export function makeBoard(overrides: Partial<BoardRecord> = {}): BoardRecord {
  return {
    id: "board-1",
    title: "Контент план",
    slug: "content-plan",
    createdAt: 1,
    ...overrides,
  };
}

export function makeWeek(overrides: Partial<WeekRecord> = {}): WeekRecord {
  return {
    id: "week-categories",
    boardId: "board-1",
    title: "Categories",
    order: 0,
    ...overrides,
  };
}

export function makeCard(overrides: Partial<CardRecord> = {}): CardRecord {
  return {
    id: "card-1",
    weekId: "week-categories",
    column: "ALL",
    title: "Идея поста",
    order: 0,
    ...overrides,
  };
}

export async function waitFor(assertion: () => void) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 0));
      await flushPromises();
    }
  }

  throw lastError;
}
