import type { CompleteWeekChanges } from "@/domain/complete-week.ts";
import { getDB } from "@/db/db";

export async function completeWeekDB(weekId: string, changes: CompleteWeekChanges): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["weeks", "cards"], "readwrite");
  const weeksStore = tx.objectStore("weeks");
  const cardsStore = tx.objectStore("cards");

  await Promise.all([
    ...changes.deleteCardIds.map((cardId) => cardsStore.delete(cardId)),
    ...changes.updateCards.map((card) => cardsStore.put(card)),
    weeksStore.delete(weekId),
    tx.done,
  ]);
}
