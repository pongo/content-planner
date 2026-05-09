import { reactive } from "vue";
import type { BoardRecord } from "@/shared/db/db";
import { loadAllCardsForBoard } from "@/entities/board/queries";
import { exportBoardToMarkdown } from "@/features/board-export/exportMarkdown";

const exportedBoards = reactive<Record<string, boolean>>({});

export function useBoardExport() {
  async function exportBoard(board: BoardRecord) {
    const cards = await loadAllCardsForBoard(board.id);
    const markdown = exportBoardToMarkdown(board, cards);

    await navigator.clipboard.writeText(markdown);

    exportedBoards[board.id] = true;
    setTimeout(() => {
      exportedBoards[board.id] = false;
    }, 2000);
  }

  function isExported(boardId: string) {
    return exportedBoards[boardId] ?? false;
  }

  return { exportBoard, isExported };
}
