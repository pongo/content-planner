import { getDB } from "./db";
import type { CardRecord } from "./db";

type CardColumn = CardRecord["column"];

export async function getCardsByWeek(weekId: string, column?: CardColumn): Promise<CardRecord[]> {
  const db = await getDB();
  let result: CardRecord[];
  if (column) {
    result = await db.getAllFromIndex("cards", "by-week-column", [weekId, column]);
  } else {
    result = await db.getAllFromIndex("cards", "by-week", weekId);
  }
  return result.toSorted((a, b) => a.title.localeCompare(b.title));
}

export async function getAllCards(): Promise<CardRecord[]> {
  const db = await getDB();
  return db.getAll("cards");
}

export async function createCard(card: Omit<CardRecord, "order">): Promise<string> {
  const db = await getDB();
  const existing = await getCardsByWeek(card.weekId, card.column);
  const order = existing.length > 0 ? existing[existing.length - 1]!.order + 1 : 0;
  const record: CardRecord = { ...card, order };
  await db.add("cards", record);
  return record.id;
}

export async function updateCard(
  id: string,
  updates: Partial<Omit<CardRecord, "id">>,
): Promise<void> {
  const db = await getDB();
  const card = await db.get("cards", id);
  if (!card) throw new Error(`Card ${id} not found`);
  Object.assign(card, updates);
  await db.put("cards", card);
}

export async function deleteCard(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("cards", id);
}

export async function moveCard(
  cardId: string,
  newWeekId: string,
  newColumn: CardColumn,
  insertIndex?: number,
): Promise<void> {
  const db = await getDB();
  const card = await db.get("cards", cardId);
  if (!card) throw new Error(`Card ${cardId} not found`);

  // Update card location and order
  card.weekId = newWeekId;
  card.column = newColumn;
  card.order = insertIndex ?? card.order;
  await db.put("cards", card);
}

/**
 * Save all cards in a cell atomically within a single transaction.
 */
export async function saveCellCards(
  weekId: string,
  column: CardColumn,
  cards: CardRecord[],
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("cards", "readwrite");
  const store = tx.objectStore("cards");

  // Put all cards with correct metadata. Existing records are overwritten by ID.
  for (let i = 0; i < cards.length; i++) {
    const t = { ...cards[i]!, order: i, weekId, column };
    await store.put(t);
  }

  await tx.done;
}

/**
 * Save two cells atomically in a single transaction.
 * Used for cross-cell moves.
 */
export async function saveBothCellsCards(
  sourceWeekId: string,
  sourceColumn: CardColumn,
  sourceCards: CardRecord[],
  targetWeekId: string,
  targetColumn: CardColumn,
  targetCards: CardRecord[],
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("cards", "readwrite");
  const store = tx.objectStore("cards");

  for (let i = 0; i < sourceCards.length; i++) {
    const t = { ...sourceCards[i]!, order: i, weekId: sourceWeekId, column: sourceColumn };
    await store.put(t);
  }
  for (let i = 0; i < targetCards.length; i++) {
    const t = { ...targetCards[i]!, order: i, weekId: targetWeekId, column: targetColumn };
    await store.put(t);
  }

  await tx.done;
}
