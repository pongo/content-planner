import { parseTitle } from "@/shared/utils/card-title";
import { getDB } from "@/db/db";

export async function completeWeekDB(weekId: string, targetWeekId: string): Promise<void> {
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
