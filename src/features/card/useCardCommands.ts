import type { CardRecord } from "@/db/db.ts";
import * as cardsApi from "@/entities/card.ts";
import type { useBoardStore } from "@/stores/board.ts";

type BoardStore = ReturnType<typeof useBoardStore>;

export function useCardCommands(boardStore: BoardStore) {
  async function createCard(
    weekId: string,
    title: string,
    column: CardRecord["column"],
  ): Promise<void> {
    const id = crypto.randomUUID();
    await cardsApi.createCard({ id, weekId, column, title });
    const card = await cardsApi
      .getCardsByWeek(weekId, column)
      .then((cards) => cards.find((item) => item.id === id));
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
    await cardsApi.updateCard(cardId, updates);
    const card = boardStore.cards.find((item) => item.id === cardId);
    if (!card) return;

    if (updates.title !== undefined) card.title = updates.title;
    if (updates.weekId !== undefined) card.weekId = updates.weekId;
    if (updates.column !== undefined) card.column = updates.column;
    if (updates.order !== undefined) card.order = updates.order;
  }

  async function deleteCard(cardId: string): Promise<void> {
    await cardsApi.deleteCard(cardId);
    boardStore.cards = boardStore.cards.filter((item) => item.id !== cardId);
  }

  return { createCard, updateCard, deleteCard };
}
