import { getDB } from "../db.ts";

export async function deleteBoardDB(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["boards", "weeks", "cards"], "readwrite");
  const boardsStore = tx.objectStore("boards");
  const weeksStore = tx.objectStore("weeks");
  const cardsStore = tx.objectStore("cards");

  // Get all weeks for this board
  const weekIds = await weeksStore.index("by-board").getAllKeys(id);

  // Get all cards for all weeks
  const allCardIds: string[] = [];
  for (const weekId of weekIds) {
    const cardIds = await cardsStore.index("by-week").getAllKeys(weekId);
    allCardIds.push(...cardIds);
  }

  // Delete everything in parallel, wait for tx to commit
  await Promise.all([
    ...allCardIds.map((cardId) => cardsStore.delete(cardId)),
    ...weekIds.map((weekId) => weeksStore.delete(weekId)),
    boardsStore.delete(id),
    tx.done,
  ]);
}
