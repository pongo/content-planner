import { getDB } from "../db.ts";

export async function deleteWeekDB(id: string): Promise<void> {
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
