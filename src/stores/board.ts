import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { BoardRecord, WeekRecord, CardRecord } from "@/db/db";
import { getFirstLine, parseTitle } from "@/shared/utils/card-title";
import type { Card } from "@/domain/card.ts";
import type { BoardRow, CellCardsUpdate } from "@/domain/cell.ts";
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

const COLUMNS: CardRecord["column"][] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export const useBoardStore = defineStore("board", () => {
  const currentBoard = ref<BoardRecord | null>(null);
  const weeks = ref<WeekRecord[]>([]);
  const cards = ref<CardRecord[]>([]);
  const loading = ref(false);

  const columns = computed(() => COLUMNS);

  const cardsFirstLineCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const card of cards.value) {
      if (card.title.startsWith("-")) continue;

      const firstLine = getFirstLine(card.title);
      if (!firstLine) continue;

      counts.set(firstLine, (counts.get(firstLine) || 0) + 1);
    }
    return counts;
  });

  const duplicateFirstLines = computed(() => {
    const duplicates = new Set<string>();
    for (const [line, count] of cardsFirstLineCounts.value) {
      if (count > 1) duplicates.add(line);
    }
    return duplicates;
  });

  const cardsView = computed<Card[]>(() =>
    cards.value.map((card) => {
      const titleInfo = parseTitle(card.title);
      return {
        id: card.id,
        title: card.title,
        titleInfo,
        isDuplicate:
          !card.title.startsWith("-") && duplicateFirstLines.value.has(titleInfo.firstLine),
      };
    }),
  );

  const cardsViewById = computed(() => new Map(cardsView.value.map((card) => [card.id, card])));

  const boardRows = computed<BoardRow[]>(() =>
    weeks.value.map((week) => ({
      week,
      cells: getColumnsForWeek(week).map((cell) => ({
        weekId: week.id,
        column: cell.column,
        colspan: cell.colspan,
        cards: getCardsForWeek(week.id, cell.column)
          .map((record) => cardsViewById.value.get(record.id))
          .filter((card): card is Card => card !== undefined),
      })),
    })),
  );

  function getCardsForWeek(weekId: string, column: CardRecord["column"]) {
    return cards.value.filter((t) => t.weekId === weekId && t.column === column);
  }

  function getColumnsForWeek(
    week: WeekRecord,
  ): { column: CardRecord["column"]; colspan?: number }[] {
    if (week.title === "Categories") return [{ column: "ALL", colspan: 7 }];
    return COLUMNS.map((column) => ({ column }));
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
    const categoriesWeek = weeks.value.find((s) => s.title === "Categories");
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
