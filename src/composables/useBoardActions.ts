import { reactive } from "vue";
import type { BoardRecord } from "@/db/db";
import { exportBoardToMarkdown } from "@/utils/exportMarkdown";
import * as boardsApi from "@/db/boards";

const exportedBoards = reactive<Record<string, boolean>>({});

export function useBoardActions() {
  async function handleExport(board: BoardRecord) {
    const markdown = await exportBoardToMarkdown(board);
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
