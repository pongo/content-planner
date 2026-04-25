import { reactive } from "vue";
import type { BoardRecord, CardRecord } from "@/db/db";
import { exportBoardToMarkdown } from "@/utils/exportMarkdown";
import * as boardsApi from "@/db/boards";
import * as weeksApi from "@/db/weeks.ts";
import * as cardsApi from "@/db/cards";

const exportedBoards = reactive<Record<string, boolean>>({});

export function useBoardActions() {
  async function handleExport(board: BoardRecord) {
    const cards = await loadAllCardsForBoard(board.id);
    const markdown = exportBoardToMarkdown(board, cards);

    await navigator.clipboard.writeText(markdown);

    exportedBoards[board.id] = true;
    setTimeout(() => {
      exportedBoards[board.id] = false;
    }, 2000);
  }

  async function deleteBoard(board: BoardRecord, onDeleted?: () => void) {
    if (!confirm(`Удалить доску "${board.title}"?`)) return;
    await boardsApi.deleteBoard(board.id);
    onDeleted?.();
  }

  function isExported(boardId: string) {
    return exportedBoards[boardId] ?? false;
  }

  return { handleExport, deleteBoard, isExported };
}

async function loadAllCardsForBoard(boardId: string): Promise<CardRecord[]> {
  const weeksList = await weeksApi.getWeeksByBoard(boardId);
  const allCards: CardRecord[] = [];
  // Load cards for all weeks in parallel
  const cardPromises = weeksList.map((week) => cardsApi.getCardsByWeek(week.id));
  const results = await Promise.all(cardPromises);
  for (const result of results) {
    allCards.push(...result);
  }
  return allCards;
}
