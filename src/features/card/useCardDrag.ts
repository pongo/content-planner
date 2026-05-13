import { ref, watch, type Ref } from "vue";
import type { DraggableEvent } from "vue-draggable-plus";
import type { Card } from "@/domain/card.ts";
import type { BoardRow, CellCardsUpdate, CellLocation } from "@/domain/cell.ts";
import type { CardColumn } from "@/db/db.ts";

export interface CardMovePayload {
  source: CellLocation;
  target: CellLocation;
  sourceCardIds: string[];
  targetCardIds: string[];
}

interface UseCardDragOptions {
  rows: Ref<BoardRow[]>;
  moveCards: (payload: CardMovePayload) => void | Promise<void>;
  copyCard: (weekId: string, column: CardColumn, text: string) => void;
}

export function useCardDrag(options: UseCardDragOptions) {
  const cellLists = ref<Record<string, Card[]>>({});
  const draggedCard = ref<Card | null>(null);

  function cellKey(weekId: string, column: CardColumn) {
    return `${weekId}:${column}`;
  }

  function syncCellLists() {
    const activeKeys = new Set<string>();

    for (const row of options.rows.value) {
      for (const cell of row.cells) {
        const key = cellKey(cell.weekId, cell.column);
        activeKeys.add(key);
        if (!cellLists.value[key]) {
          cellLists.value[key] = [...cell.cards];
        } else {
          const existing = cellLists.value[key]!;
          existing.length = 0;
          existing.push(...cell.cards);
        }
      }
    }

    for (const key of Object.keys(cellLists.value)) {
      if (!activeKeys.has(key)) delete cellLists.value[key];
    }
  }

  function handleDragStart(e: DraggableEvent) {
    const cardId = (e.item as HTMLElement).dataset.cardId;
    if (!cardId) return;

    draggedCard.value =
      options.rows.value
        .flatMap((row) => row.cells)
        .flatMap((cell) => cell.cards)
        .find((card) => card.id === cardId) ?? null;
  }

  async function handleDragEnd(e: DraggableEvent, source: CellLocation) {
    const dragged = draggedCard.value;
    draggedCard.value = null;

    const target = getDragEndTarget(e);
    if (!target) {
      syncCellLists();
      return;
    }

    if (dragged && getOriginalEvent(e)?.ctrlKey) {
      syncCellLists();
      options.copyCard(target.weekId, target.column, dragged.titleInfo.firstLine);
      return;
    }

    await options.moveCards({
      source,
      target,
      sourceCardIds: getCardIds(source),
      targetCardIds: getCardIds(target),
    });

    function getCardIds(location: CellLocation) {
      return (cellLists.value[cellKey(location.weekId, location.column)] ?? []).map(
        (card) => card.id,
      );
    }
  }

  watch(options.rows, () => syncCellLists(), {
    deep: true,
    immediate: true,
  });

  return { cellLists, cellKey, handleDragStart, handleDragEnd, syncCellLists };
}

export function toCellUpdates(payload: CardMovePayload): CellCardsUpdate[] {
  const updates: CellCardsUpdate[] = [{ ...payload.source, cardIds: payload.sourceCardIds }];

  if (
    payload.source.weekId !== payload.target.weekId ||
    payload.source.column !== payload.target.column
  ) {
    updates.push({ ...payload.target, cardIds: payload.targetCardIds });
  }

  return updates;
}

function getOriginalEvent(e: DraggableEvent) {
  return (e as unknown as { originalEvent?: MouseEvent }).originalEvent;
}

function getDragEndTarget(e: DraggableEvent): CellLocation | null {
  const targetTd = e.to.closest("td[data-week-id]") as HTMLTableCellElement | null;
  const weekId = targetTd?.dataset.weekId;
  const column = targetTd?.dataset.column as CardColumn | undefined;
  return weekId && column ? { weekId, column } : null;
}
