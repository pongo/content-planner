import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { BoardRecord, WeekRecord, CardRecord } from "@/db/db";
import type { CellCardsUpdate } from "@/domain/cell.ts";
import {
  BOARD_COLUMNS,
  CATEGORIES_WEEK_TITLE,
  createBoardRows,
  createCardsView,
  getCardsFirstLineCounts,
  getDuplicateFirstLines,
} from "@/domain/board-view.ts";
import { createCompleteWeekChanges } from "@/domain/complete-week.ts";
import { getWeeksByBoardDB } from "@/db/queries/get-weeks-by-board.ts";
import { getAllBoardsDB } from "@/db/queries/get-all-boards.ts";
import { createWeekDB } from "@/db/commands/create-week.ts";
import { getCardsForWeeksDB } from "@/db/queries/get-cards-for-weeks.ts";
import { getBoardBySlugDB } from "@/db/queries/get-board-by-slug.ts";
import { updateBoardDB } from "@/db/commands/update-board.ts";
import { deleteWeekDB } from "@/db/commands/delete-week.ts";
import { completeWeekDB } from "@/db/commands/complete-week.ts";
import { createCardDB } from "@/db/commands/create-card.ts";
import { getCardsByWeekDB } from "@/db/queries/get-cards-by-week.ts";
import { updateCardDB } from "@/db/commands/update-card.ts";
import { deleteCardDB } from "@/db/commands/delete-card.ts";
import { saveCellsCardsDB, type Cell } from "@/db/commands/save-cell-cards.ts";

export const useBoardStore = defineStore("board", () => {
  const currentBoard = ref<BoardRecord | null>(null);
  const weeks = ref<WeekRecord[]>([]);
  const cards = ref<CardRecord[]>([]);
  const loading = ref(false);

  const columns = computed(() => BOARD_COLUMNS);
  const cardsFirstLineCounts = computed(() => getCardsFirstLineCounts(cards.value));
  const duplicateFirstLines = computed(() => getDuplicateFirstLines(cards.value));
  const cardsView = computed(() => createCardsView(cards.value));
  const boardRows = computed(() => createBoardRows(weeks.value, cards.value));

  function getCardsForWeek(weekId: string, column: CardRecord["column"]) {
    return cards.value.filter((t) => t.weekId === weekId && t.column === column);
  }

  async function loadBoard(slug: string) {
    loading.value = true;
    try {
      const board = await getBoardBySlugDB(slug);
      if (!board) throw new Error("Board not found");
      currentBoard.value = board;
      await reloadBoard();
    } finally {
      loading.value = false;
    }
  }

  async function reloadBoard() {
    if (!currentBoard.value) return;
    const boardId = currentBoard.value.id;
    const weeksList = await getWeeksByBoardDB(boardId);
    const allCards = await getCardsForWeeksDB(weeksList);
    weeks.value = weeksList;
    cards.value = allCards;
  }

  async function updateBoardTitle(title: string): Promise<void> {
    if (!currentBoard.value) return;
    const previousTitle = currentBoard.value.title;

    // Optimistic update
    currentBoard.value.title = title;

    try {
      await updateBoardDB(currentBoard.value.id, { title });
    } catch (error) {
      // Rollback on error
      currentBoard.value.title = previousTitle;
      throw error;
    }
  }

  function clearCurrentBoard(): void {
    currentBoard.value = null;
    weeks.value = [];
    cards.value = [];
  }

  async function createWeek(title: string): Promise<void> {
    if (!currentBoard.value) return;
    const id = crypto.randomUUID();
    await createWeekDB({ id, boardId: currentBoard.value.id, title });
    const week = await getWeeksByBoardDB(currentBoard.value.id).then((s) =>
      s.find((x) => x.id === id),
    );
    if (week) weeks.value.push(week);
  }

  async function deleteWeek(weekId: string): Promise<void> {
    await deleteWeekDB(weekId);
    weeks.value = weeks.value.filter((s) => s.id !== weekId);
    cards.value = cards.value.filter((t) => t.weekId !== weekId);
  }

  async function completeWeek(weekId: string): Promise<void> {
    const categoriesWeek = weeks.value.find((s) => s.title === CATEGORIES_WEEK_TITLE);
    if (!categoriesWeek) return;

    const changes = createCompleteWeekChanges(weekId, categoriesWeek.id, cards.value);
    await completeWeekDB(weekId, changes);
    await reloadBoard();
  }

  async function loadAllBoards(): Promise<BoardRecord[]> {
    return getAllBoardsDB();
  }

  async function createCard(
    weekId: string,
    title: string,
    column: CardRecord["column"],
  ): Promise<void> {
    const id = crypto.randomUUID();
    await createCardDB({ id, weekId, column, title });
    const card = await getCardsByWeekDB(weekId, column).then((items) =>
      items.find((item) => item.id === id),
    );
    if (card) cards.value.push(card);
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
    const card = cards.value.find((item) => item.id === cardId);
    if (!card) return;

    if (updates.title !== undefined) card.title = updates.title;
    if (updates.weekId !== undefined) card.weekId = updates.weekId;
    if (updates.column !== undefined) card.column = updates.column;
    if (updates.order !== undefined) card.order = updates.order;
  }

  async function deleteCard(cardId: string): Promise<void> {
    await deleteCardDB(cardId);
    cards.value = cards.value.filter((item) => item.id !== cardId);
  }

  async function saveCardCells(updates: CellCardsUpdate[]): Promise<void> {
    const recordsById = new Map(cards.value.map((card) => [card.id, card]));
    const cellsToSave: Cell[] = updates.map((cell) => ({
      weekId: cell.weekId,
      column: cell.column,
      cards: cell.cardIds
        .map((id) => recordsById.get(id))
        .filter((card): card is CardRecord => card !== undefined),
    }));

    await saveCellsCardsDB(cellsToSave);
    await reloadBoard();
  }

  return {
    currentBoard,
    weeks,
    cards,
    loading,
    columns,
    cardsFirstLineCounts,
    duplicateFirstLines,
    cardsView,
    boardRows,
    getCardsForWeek,
    loadBoard,
    reloadBoard,
    updateBoardTitle,
    clearCurrentBoard,
    createWeek,
    deleteWeek,
    completeWeek,
    loadAllBoards,
    createCard,
    updateCard,
    deleteCard,
    saveCardCells,
  };
});
