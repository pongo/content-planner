import type { useBoardStore } from "@/stores/board";
import type { TaskRecord } from "@/db/db";

export function useDragAndDrop(boardStore: ReturnType<typeof useBoardStore>) {
  /** Called after VueDraggable drag ends. Persists the moved task only. */
  async function handleSortEnd(
    movedTaskId: string,
    targetStoryId: string,
    targetColumn: TaskRecord["column"],
    targetIndex: number,
  ) {
    await boardStore.moveTask(movedTaskId, targetStoryId, targetColumn, targetIndex);
  }

  return {
    handleSortEnd,
  };
}
