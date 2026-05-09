import { ref, watch, type Ref } from "vue";
import type { DraggableEvent } from "vue-draggable-plus";
import type { CardRecord, WeekRecord } from "@/shared/db/db";
import { saveBothCellsCards, saveCellCards } from "@/entities/card/api";
import { getFirstLine } from "@/shared/utils/card-title";
import type { useBoardStore } from "@/stores/board";

type BoardStore = ReturnType<typeof useBoardStore>;
type CardColumn = CardRecord["column"];

interface UseCardDragOptions {
  weeks: Ref<WeekRecord[]>;
  getCards: (weekId: string, column: CardColumn) => CardRecord[];
  boardStore: BoardStore;
  addCard: (weekId: string, column: CardColumn, text?: string) => void;
}

export function useCardDrag(options: UseCardDragOptions) {
  const cellLists = ref<Record<string, CardRecord[]>>({});
  const draggedCard = ref<CardRecord | null>(null);

  function cellKey(weekId: string, column: CardColumn) {
    return `${weekId}:${column}`;
  }

  function getWeekColumns(week: WeekRecord): { key: CardColumn; colspan?: number }[] {
    if (week.title === "Categories") {
      return [{ key: "ALL", colspan: 7 }];
    }
    return options.boardStore.columns.map((column) => ({ key: column }));
  }

  function syncCellLists() {
    for (const week of options.weeks.value) {
      const colsToSync = getWeekColumns(week);
      for (const colInfo of colsToSync) {
        const key = cellKey(week.id, colInfo.key);
        const newCards = [...options.getCards(week.id, colInfo.key)];
        if (!cellLists.value[key]) {
          cellLists.value[key] = newCards;
        } else {
          const existing = cellLists.value[key]!;
          existing.length = 0;
          existing.push(...newCards);
        }
      }
    }
  }

  function handleDragStart(e: DraggableEvent) {
    const cardId = (e.item as HTMLElement).dataset.cardId;
    if (cardId) {
      draggedCard.value = options.boardStore.cards.find((card) => card.id === cardId) ?? null;
    }
  }

  async function handleDragEnd(e: DraggableEvent, weekId: string, column: CardColumn) {
    const dragged = draggedCard.value;
    draggedCard.value = null;

    const { targetWeekId, targetCol } = getDragEndTargets(e);
    if (!targetWeekId || !targetCol) return;

    if (dragged && getOriginalEvent(e)?.ctrlKey) {
      syncCellLists();
      options.addCard(targetWeekId, targetCol, getFirstLine(dragged.title));
      return;
    }

    const sourceKey = cellKey(weekId, column);
    const sourceCards = cellLists.value[sourceKey] ?? [];

    if (e.to === e.from) {
      await saveCellCards(weekId, column, sourceCards);
      await options.boardStore.reloadBoard();
      return;
    }

    const targetKey = cellKey(targetWeekId, targetCol);
    const targetCards = cellLists.value[targetKey] ?? [];
    await saveBothCellsCards(weekId, column, sourceCards, targetWeekId, targetCol, targetCards);
    await options.boardStore.reloadBoard();
  }

  watch([options.weeks, () => options.boardStore.cards], () => syncCellLists(), {
    deep: true,
    immediate: true,
  });

  return { cellLists, cellKey, getWeekColumns, handleDragStart, handleDragEnd, syncCellLists };
}

function getOriginalEvent(e: DraggableEvent) {
  return (e as unknown as { originalEvent?: MouseEvent }).originalEvent;
}

function getDragEndTargets(e: DraggableEvent) {
  const targetTd = e.to.closest("td[data-week-id]") as HTMLTableCellElement | null;
  const targetWeekId = targetTd?.dataset.weekId;
  const targetCol = targetTd?.dataset.column as CardColumn | undefined;
  return { targetWeekId, targetCol };
}
