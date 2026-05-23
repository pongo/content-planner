import type { CardRecord } from "@/db/db.ts";
import { parseTitle } from "@/shared/utils/card-title.ts";

export type CompleteWeekChanges = {
  deleteCardIds: string[];
  updateCards: CardRecord[];
};

export function createCompleteWeekChanges(
  weekId: string,
  targetWeekId: string,
  cards: CardRecord[],
): CompleteWeekChanges {
  const targetCardsCount = cards.filter((card) => card.weekId === targetWeekId).length;
  let nextOrder = targetCardsCount;
  const deleteCardIds: string[] = [];
  const updateCards: CardRecord[] = [];

  const targetWeekCardsTitles = new Set<string>(
    cards
      .filter((card) => card.weekId === targetWeekId)
      .map((card) => parseTitle(card.title).firstLine),
  );

  for (const card of cards) {
    if (card.weekId !== weekId) continue;

    if (card.title.startsWith("-")) {
      deleteCardIds.push(card.id);
      continue;
    }

    const { isPermanent, firstLine } = parseTitle(card.title);

    if (!isPermanent && targetWeekCardsTitles.has(firstLine)) {
      deleteCardIds.push(card.id);
      continue;
    }

    updateCards.push({
      ...card,
      weekId: targetWeekId,
      column: "ALL",
      title: isPermanent ? card.title : firstLine,
      order: nextOrder++,
    });
    targetWeekCardsTitles.add(firstLine);
  }

  return { deleteCardIds, updateCards };
}
