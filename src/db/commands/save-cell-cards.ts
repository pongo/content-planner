import { type CardColumn, type CardRecord, getDB } from "../db.ts";

/**
 * Save all cards in a cell atomically within a single transaction.
 */
export async function saveCellCardsDB(
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
export async function saveBothCellsCardsDB(
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
