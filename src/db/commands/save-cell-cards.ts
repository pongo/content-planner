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

  const puts = cells.flatMap((cell) =>
    cell.cards.map((card, order) =>
      store.put({ ...card, order, weekId: cell.weekId, column: cell.column }),
    ),
  );

  await Promise.all([...puts, tx.done]);
}
