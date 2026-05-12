import type { BoardRecord } from "@/db/db.ts";
import { deleteBoardDB } from "@/db/commands/delete-board.ts";

export function useBoardDelete() {
  async function deleteBoard(board: BoardRecord, onDeleted?: () => void) {
    if (!confirm(`Удалить доску "${board.title}"?`)) return;
    await deleteBoardDB(board.id);
    onDeleted?.();
  }

  return { deleteBoard };
}
