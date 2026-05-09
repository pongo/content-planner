import { useBoardDelete } from "@/features/board/useBoardDelete.ts";
import { useBoardExport } from "@/features/board-export/useBoardExport";

export function useBoardActions() {
  const { exportBoard, isExported } = useBoardExport();
  const { deleteBoard } = useBoardDelete();

  return { exportBoard, deleteBoard, isExported };
}
