import type { BoardRecord } from "@/shared/db/db";
import { deleteBoard as deleteBoardRecord } from "@/entities/board";

export function useBoardDelete() {
  async function deleteBoard(board: BoardRecord, onDeleted?: () => void) {
    if (!confirm(`Удалить доску "${board.title}"?`)) return;
    await deleteBoardRecord(board.id);
    onDeleted?.();
  }

  return { deleteBoard };
}
