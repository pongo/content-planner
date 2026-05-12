import { type CardColumn, type CardRecord, getDB } from "../db.ts";

export type Cell = {
  weekId: string;
  column: CardColumn;
  cards: CardRecord[];
};

/**
 * Save cards in a single transaction
 */
export async function saveCellsCardsDB(cells: Cell[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("cards", "readwrite");
  const store = tx.objectStore("cards");

  for (const cell of cells) {
    for (let i = 0; i < cell.cards.length; i++) {
      const t = { ...cell.cards[i]!, order: i, weekId: cell.weekId, column: cell.column };
      await store.put(t);
    }
  }

  await tx.done;
}
