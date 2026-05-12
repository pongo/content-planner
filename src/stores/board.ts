import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { BoardRecord, WeekRecord, CardRecord } from "@/db/db";
import { getFirstLine } from "@/shared/utils/card-title";
import { getWeeksByBoardDB } from "@/db/queries/get-weeks-by-board.ts";
import { getAllBoardsDB } from "@/db/queries/get-all-boards.ts";
import { createWeekDB } from "@/db/commands/create-week.ts";
import { getCardsForWeeksDB } from "@/db/queries/get-cards-for-weeks.ts";
import { getBoardBySlugDB } from "@/db/queries/get-board-by-slug.ts";
import { updateBoardDB } from "@/db/commands/update-board.ts";
import { deleteWeekDB } from "@/db/commands/delete-week.ts";
import { completeWeekDB } from "@/db/commands/complete-week.ts";

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
    const categoriesWeek = weeks.value.find((s) => s.title === "Categories");
    if (!categoriesWeek) return;

    await completeWeekDB(weekId, categoriesWeek.id);
    await reloadBoard();
  }

  async function loadAllBoards(): Promise<BoardRecord[]> {
    return getAllBoardsDB();
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
