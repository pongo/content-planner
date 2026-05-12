import { parseTitle } from "@/shared/utils/card-title";
import { getDB } from "@/db/db";
import type { WeekRecord } from "@/db/db";

export async function getWeeksByBoard(boardId: string): Promise<WeekRecord[]> {
  const db = await getDB();
  const weeks = await db.getAllFromIndex("weeks", "by-board", boardId);
  return weeks.sort((a, b) => a.order - b.order);
}

export async function createWeek(week: Omit<WeekRecord, "order">): Promise<string> {
  const db = await getDB();
  const existing = await getWeeksByBoard(week.boardId);
  const order = existing.length > 0 ? existing[existing.length - 1]!.order + 1 : 0;
  const record: WeekRecord = { ...week, order };
  await db.add("weeks", record);
  return record.id;
}

export async function deleteWeek(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["weeks", "cards"], "readwrite");
  const weeksStore = tx.objectStore("weeks");
  const cardsStore = tx.objectStore("cards");

  // Get all cards associated with the week
  const cardIds = await cardsStore.index("by-week").getAllKeys(id);

  // Delete all cards and the week in parallel, wait for tx to commit
  await Promise.all([
    ...cardIds.map((cardId) => cardsStore.delete(cardId)),
    weeksStore.delete(id),
    tx.done,
  ]);
}

export async function completeWeek(weekId: string, targetWeekId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["weeks", "cards"], "readwrite");
  const weeksStore = tx.objectStore("weeks");
  const cardsStore = tx.objectStore("cards");

  const cardIds = await cardsStore.index("by-week").getAllKeys(weekId);
  const targetCards = await cardsStore.index("by-week").getAll(targetWeekId);
  let nextOrder = targetCards.length;
  for (const cardId of cardIds) {
    const card = await cardsStore.get(cardId);
    if (!card) continue;

    if (card.title.startsWith("-")) {
      await cardsStore.delete(cardId);
      continue;
    }

    const { isPermanent, firstLine } = parseTitle(card.title);
    card.weekId = targetWeekId;
    card.column = "ALL";
    if (!isPermanent) card.title = firstLine;
    card.order = nextOrder++;
    await cardsStore.put(card);
  }

  await weeksStore.delete(weekId);

  await tx.done;
}
