import { createCardDB } from "@/db/commands/create-card.ts";
import { deleteCardDB } from "@/db/commands/delete-card.ts";
import { updateCardDB } from "@/db/commands/update-card.ts";
import type { CardRecord } from "@/db/db.ts";
import { getCardsByWeekDB } from "@/db/queries/get-cards-by-week.ts";
import type { useBoardStore } from "@/stores/board.ts";

type BoardStore = ReturnType<typeof useBoardStore>;

export function useCardCommands(boardStore: BoardStore) {
  async function createCard(
    weekId: string,
    title: string,
    column: CardRecord["column"],
  ): Promise<void> {
    const id = crypto.randomUUID();
    await createCardDB({ id, weekId, column, title });
    const card = await getCardsByWeekDB(weekId, column).then((cards) =>
      cards.find((item) => item.id === id),
    );
    if (card) boardStore.cards.push(card);
  }

  async function updateCard(
    cardId: string,
    updates: {
      title?: string;
      weekId?: string;
      column?: CardRecord["column"];
      order?: number;
    },
  ): Promise<void> {
    await updateCardDB(cardId, updates);
    const card = boardStore.cards.find((item) => item.id === cardId);
    if (!card) return;

    if (updates.title !== undefined) card.title = updates.title;
    if (updates.weekId !== undefined) card.weekId = updates.weekId;
    if (updates.column !== undefined) card.column = updates.column;
    if (updates.order !== undefined) card.order = updates.order;
  }

  async function deleteCard(cardId: string): Promise<void> {
    await deleteCardDB(cardId);
    boardStore.cards = boardStore.cards.filter((item) => item.id !== cardId);
  }

  return { createCard, updateCard, deleteCard };
}
