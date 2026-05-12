import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { BoardRecord, WeekRecord, CardRecord } from "@/db/db";
import * as boardsApi from "@/entities/board";
import * as weeksApi from "@/entities/week";
import { loadCardsForWeeks } from "@/entities/board-queries";
import { getFirstLine } from "@/shared/utils/card-title";

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
      await reloadBoard();
    } finally {
      loading.value = false;
    }
  }

  async function reloadBoard() {
    if (!currentBoard.value) return;
    const boardId = currentBoard.value.id;
    const weeksList = await weeksApi.getWeeksByBoard(boardId);
    const allCards = await loadCardsForWeeks(weeksList);
    weeks.value = weeksList;
    cards.value = allCards;
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

  function clearCurrentBoard(): void {
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
    await reloadBoard();
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
    cardsFirstLineCounts,
    duplicateFirstLines,
    getCardsForWeek,
    loadBoard,
    reloadBoard,
    updateBoardTitle,
    clearCurrentBoard,
    createWeek,
    deleteWeek,
    completeWeek,
    loadAllBoards,
  };
});
