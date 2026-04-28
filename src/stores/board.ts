import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { BoardRecord, WeekRecord, CardRecord } from "@/db/db";
import * as boardsApi from "@/db/boards";
import * as weeksApi from "@/db/weeks.ts";
import * as cardsApi from "@/db/cards";
import { generateUniqueSlug } from "@/utils/slug";
import { getFirstLine } from "@/utils/card-title";

const COLUMNS: CardRecord["column"][] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export const useBoardStore = defineStore("board", () => {
  const currentBoard = ref<BoardRecord | null>(null);
  const weeks = ref<WeekRecord[]>([]);
  const cards = ref<CardRecord[]>([]);
  const loading = ref(false);

  const columns = computed(() => COLUMNS);

  const duplicateFirstLines = computed(() => {
    const counts = new Map<string, number>();
    for (const card of cards.value) {
      if (card.title.startsWith("-")) continue;
      const firstLine = getFirstLine(card.title);
      if (!firstLine) continue;
      counts.set(firstLine, (counts.get(firstLine) || 0) + 1);
    }

    const duplicates = new Set<string>();
    for (const [line, count] of counts) {
      if (count > 1) duplicates.add(line);
    }
    return duplicates;
  });

  function getCardsForWeek(weekId: string, column: CardRecord["column"]) {
    return cards.value
      .filter((t) => t.weekId === weekId && t.column === column)
      .toSorted((a, b) => a.title.localeCompare(b.title));
  }

  async function loadBoard(slug: string) {
    loading.value = true;
    try {
      const board = await boardsApi.getBoardBySlug(slug);
      if (!board) throw new Error("Board not found");
      currentBoard.value = board;

      const boardId = board.id;
      const [weeksList, allCards] = await Promise.all([
        weeksApi.getWeeksByBoard(boardId),
        loadAllCardsForBoard(boardId),
      ]);
      weeks.value = weeksList;
      cards.value = allCards;
    } finally {
      loading.value = false;
    }
  }

  async function loadAllCardsForBoard(boardId: string): Promise<CardRecord[]> {
    const weeksList = await weeksApi.getWeeksByBoard(boardId);
    // Load cards for all weeks in parallel
    const cardPromises = weeksList.map((week) => cardsApi.getCardsByWeek(week.id));
    return (await Promise.all(cardPromises)).flat();
  }

  async function createBoard(title: string): Promise<string> {
    const id = crypto.randomUUID();
    const existingBoards = await boardsApi.getAllBoards();
    const existingSlugs = new Set(existingBoards.map((b) => b.slug));
    const slug = generateUniqueSlug(title, existingSlugs);

    await boardsApi.createBoard({ id, title, slug });

    return slug;
  }

  async function updateBoardTitle(title: string): Promise<void> {
    if (!currentBoard.value) return;
    const previousTitle = currentBoard.value.title;

    // Optimistic update
    currentBoard.value.title = title;

    try {
      await boardsApi.updateBoard(currentBoard.value.id, { title });
    } catch (error) {
      // Rollback on error
      currentBoard.value.title = previousTitle;
      throw error;
    }
  }

  async function deleteCurrentBoard(): Promise<void> {
    if (!currentBoard.value) return;
    await boardsApi.deleteBoard(currentBoard.value.id);
    currentBoard.value = null;
    weeks.value = [];
    cards.value = [];
  }

  async function createWeek(title: string): Promise<void> {
    if (!currentBoard.value) return;
    const id = crypto.randomUUID();
    await weeksApi.createWeek({ id, boardId: currentBoard.value.id, title });
    const week = await weeksApi
      .getWeeksByBoard(currentBoard.value.id)
      .then((s) => s.find((x) => x.id === id));
    if (week) weeks.value.push(week);
  }

  async function deleteWeek(weekId: string): Promise<void> {
    await weeksApi.deleteWeek(weekId);
    weeks.value = weeks.value.filter((s) => s.id !== weekId);
    cards.value = cards.value.filter((t) => t.weekId !== weekId);
  }

  async function completeWeek(weekId: string): Promise<void> {
    const categoriesWeek = weeks.value.find((s) => s.title === "Categories");
    if (!categoriesWeek) return;

    await weeksApi.completeWeek(weekId, categoriesWeek.id);

    // Refresh store
    if (currentBoard.value) {
      const boardId = currentBoard.value.id;
      const [weeksList, allCards] = await Promise.all([
        weeksApi.getWeeksByBoard(boardId),
        loadAllCardsForBoard(boardId),
      ]);
      weeks.value = weeksList;
      cards.value = allCards;
    }
  }

  async function createCard(
    weekId: string,
    title: string,
    column: CardRecord["column"],
  ): Promise<void> {
    const id = crypto.randomUUID();
    await cardsApi.createCard({
      id,
      weekId,
      column,
      title,
    });
    const card = await cardsApi
      .getCardsByWeek(weekId, column)
      .then((t) => t.find((x) => x.id === id));
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
    await cardsApi.updateCard(cardId, updates);
    const card = cards.value.find((t) => t.id === cardId);
    if (!card) return;

    if (updates.title !== undefined) card.title = updates.title;
    if (updates.weekId !== undefined) card.weekId = updates.weekId;
    if (updates.column !== undefined) card.column = updates.column;
    if (updates.order !== undefined) card.order = updates.order;
  }

  async function deleteCard(cardId: string): Promise<void> {
    await cardsApi.deleteCard(cardId);
    cards.value = cards.value.filter((t) => t.id !== cardId);
  }

  async function moveCard(
    cardId: string,
    newWeekId: string,
    newColumn: CardRecord["column"],
    targetIndex?: number,
  ): Promise<void> {
    if (!cardId) return;

    // Get cards in the target cell to compute correct order
    const targetCards = getCardsForWeek(newWeekId, newColumn);
    const index = targetIndex ?? targetCards.length;

    // Save the moved card with its new location and order
    await cardsApi.moveCard(cardId, newWeekId, newColumn, index);

    // Reload all cards so cellLists watcher picks up the changes
    if (currentBoard.value) {
      const refreshed = await loadAllCardsForBoard(currentBoard.value.id);
      cards.value = refreshed;
    }
  }

  async function saveCell(
    weekId: string,
    column: CardRecord["column"],
    cellCards: CardRecord[],
  ): Promise<void> {
    await cardsApi.saveCellCards(weekId, column, cellCards);

    // Reload all cards so cellLists watcher picks up the changes
    if (currentBoard.value) {
      const refreshed = await loadAllCardsForBoard(currentBoard.value.id);
      cards.value = refreshed;
    }
  }

  async function saveBothCells(
    sourceWeekId: string,
    sourceColumn: CardRecord["column"],
    sourceCards: CardRecord[],
    targetWeekId: string,
    targetColumn: CardRecord["column"],
    targetCards: CardRecord[],
  ): Promise<void> {
    await cardsApi.saveBothCellsCards(
      sourceWeekId,
      sourceColumn,
      sourceCards,
      targetWeekId,
      targetColumn,
      targetCards,
    );

    // Reload all cards so cellLists watcher picks up the changes
    if (currentBoard.value) {
      const refreshed = await loadAllCardsForBoard(currentBoard.value.id);
      cards.value = refreshed;
    }
  }

  async function loadAllBoards(): Promise<BoardRecord[]> {
    return boardsApi.getAllBoards();
  }

  return {
    currentBoard,
    weeks,
    cards,
    loading,
    columns,
    duplicateFirstLines,
    getCardsForWeek,
    loadBoard,
    createBoard,
    updateBoardTitle,
    deleteCurrentBoard,
    createWeek,
    deleteWeek,
    completeWeek,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    saveCell,
    saveBothCells,
    loadAllBoards,
  };
});
