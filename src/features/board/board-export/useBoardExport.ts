import { reactive } from "vue";
import type { BoardRecord } from "@/db/db.ts";
import { exportBoardToMarkdown } from "@/features/board/board-export/exportMarkdown.ts";
import { getAllCardsForBoardDB } from "@/db/queries/get-all-cards-for-board.ts";

const exportedBoards = reactive<Record<string, boolean>>({});

export function useBoardExport() {
  async function exportBoard(board: BoardRecord) {
    const cards = await getAllCardsForBoardDB(board.id);
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
