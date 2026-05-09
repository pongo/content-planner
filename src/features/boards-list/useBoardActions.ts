import type { BoardRecord } from "@/shared/db/db";
import { useBoardDelete } from "@/features/board-delete/useBoardDelete";
import { useBoardExport } from "@/features/board-export/useBoardExport";

export function useBoardActions() {
  const { exportBoard, isExported } = useBoardExport();
  const { deleteBoard } = useBoardDelete();

  const handleExport = (board: BoardRecord) => exportBoard(board);
  return { handleExport, deleteBoard, isExported };
}
