<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { VueDraggable, type DraggableEvent } from "vue-draggable-plus";
import { useBoardStore } from "@/stores/board";
import Card from "@/components/Card.vue";
import { Plus, Check } from "@lucide/vue";
import { getFirstLine } from "@/utils/card-title";
import type { CardRecord, WeekRecord } from "@/db/db";

const props = defineProps<{
  weeks: WeekRecord[];
  getCards: (weekId: string, column: CardRecord["column"]) => CardRecord[];
}>();

const emit = defineEmits<{
  addCard: [weekId: string, column: CardRecord["column"], text?: string];
  addCardWithSelector: [weekId: string, column: CardRecord["column"]];
  addWeek: [title: string];
  weekDelete: [id: string];
  weekComplete: [id: string];
}>();

function handleAddWeek() {
  emit("addWeek", new Date().toISOString());
}

const columnLabels: Record<string, string> = {
  MON: "ПН",
  TUE: "ВТ",
  WED: "СР",
  THU: "ЧТ",
  FRI: "ПТ",
  SAT: "СБ",
  SUN: "ВС",
};

const columns: CardRecord["column"][] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function cellKey(weekId: string, column: CardRecord["column"]) {
  return `${weekId}:${column}`;
}

const draggedCard = ref<CardRecord | null>(null);

async function handleDragEnd(e: DraggableEvent, weekId: string, column: CardRecord["column"]) {
  const dragged = draggedCard.value;
  draggedCard.value = null;

  const { targetWeekId, targetCol } = getDragEndTargets(e);
  if (!targetWeekId || !targetCol) return;

  // Ctrl+drop: copy mode — original stays, dialog opens with first line
  if (dragged && getOriginalEvent(e)?.ctrlKey) {
    syncCellLists();
    emit("addCard", targetWeekId, targetCol, getFirstLine(dragged.title));
    return;
  }

  const sourceKey = cellKey(weekId, column);
  const sourceCards = cellLists.value[sourceKey] ?? [];
  const targetKey = cellKey(targetWeekId, targetCol);

  // Move within the same cell
  if (e.to === e.from) {
    await boardStore.saveCell(weekId, column, sourceCards);
    return;
  }

  // Move to another cell
  const targetCards = cellLists.value[targetKey] ?? [];
  await boardStore.saveBothCells(weekId, column, sourceCards, targetWeekId, targetCol, targetCards);
}

function getOriginalEvent(e: DraggableEvent) {
  return (e as unknown as { originalEvent?: MouseEvent }).originalEvent;
}

function getDragEndTargets(e: DraggableEvent) {
  const targetTd = e.to.closest("td[data-week-id]") as HTMLTableCellElement | null;
  const targetWeekId = targetTd?.dataset.weekId;
  const targetCol = targetTd?.dataset.column as CardRecord["column"] | undefined;
  return { targetWeekId, targetCol };
}

function handleDragStart(e: DraggableEvent) {
  const cardId = (e.item as HTMLElement).dataset.cardId;
  if (cardId) {
    draggedCard.value = boardStore.cards.find((t) => t.id === cardId) ?? null;
  }
}

function getWeekColumns(week: WeekRecord): { key: CardRecord["column"]; colspan?: number }[] {
  if (week.title === "Categories") {
    return [{ key: "ALL", colspan: 7 }];
  }
  return columns.map((col) => ({ key: col }));
}

// Each cell gets its own mutable array that vue-draggable can reorder
const cellLists = ref<Record<string, CardRecord[]>>({});
const boardStore = useBoardStore();

const isBoardEmpty = computed(() => boardStore.cards.length === 0);

// Sync cellLists with store data — mutate in-place to keep VueDraggable's reference
function syncCellLists() {
  for (const week of props.weeks) {
    const colsToSync = getWeekColumns(week);
    for (const colInfo of colsToSync) {
      const col = colInfo.key;
      const key = cellKey(week.id, col);
      const newCards = [...props.getCards(week.id, col)];
      if (!cellLists.value[key]) {
        cellLists.value[key] = newCards;
      } else {
        // Mutate existing array in-place so VueDraggable's v-model reference stays valid
        const existing = cellLists.value[key]!;
        existing.length = 0;
        existing.push(...newCards);
      }
    }
  }
}

// Initial sync + watch for store changes (weeks and cards)
watch([() => props.weeks, () => boardStore.cards], () => syncCellLists(), {
  deep: true,
  immediate: true,
});

function handleDragover(e: DragEvent) {
  if (e.dataTransfer && e.ctrlKey) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }
}

onMounted(() => {
  document.addEventListener("dragover", handleDragover);
});

onUnmounted(() => {
  document.removeEventListener("dragover", handleDragover);
});
</script>

<template>
  <div class="flex-1 overflow-auto">
    <table class="w-full table-fixed" style="border-collapse: separate; border-spacing: 0">
      <colgroup>
        <col class="w-10" />
        <col v-for="col in columns" :key="col" class="min-w-40" />
      </colgroup>

      <!-- Header -->
      <thead>
        <tr class="bg-white select-none">
          <th class="border-r border-b border-gray-200 bg-white" />
          <th
            v-for="col in columns"
            :key="col"
            class="relative border-r border-b border-gray-200 bg-white px-3 py-3 text-center text-sm font-semibold text-gray-400 last:border-r-0"
          >
            {{ columnLabels[col] }}
          </th>
        </tr>
      </thead>

      <!-- Week Rows -->
      <tbody>
        <tr v-for="week in weeks" :key="week.id" class="week">
          <!-- Add Card or Complete Week Button Cell -->
          <td
            class="h-[calc(var(--card-card-height)+8px*2+1px)] border-r border-b border-gray-200 bg-white"
          >
            <button
              v-if="week.title === 'Categories'"
              class="group flex h-full w-full items-center justify-center text-gray-400 transition-colors"
              title="Добавить карточку"
              data-testid="add-category-card-button"
              @click="emit('addCard', week.id, 'ALL')"
            >
              <Plus
                class="h-6 w-6 rounded p-1 transition-colors group-hover:bg-gray-100 group-hover:text-gray-600"
              />
            </button>
            <button
              v-else
              class="group flex h-full w-full items-center justify-center text-gray-400 transition-colors"
              title="Завершить неделю и вернуть карточки"
              data-testid="complete-week-button"
              @click="emit('weekComplete', week.id)"
            >
              <Check
                class="h-6 w-6 rounded p-1 transition-colors group-hover:bg-gray-100 group-hover:text-green-600"
              />
            </button>
          </td>

          <!-- Card Cells with VueDraggable -->
          <td
            v-for="colInfo in getWeekColumns(week)"
            :key="colInfo.key"
            :colspan="colInfo.colspan"
            class="relative border-r border-b border-gray-200 bg-gray-50 p-2 align-top last:border-r-0"
            :data-week-id="week.id"
            :data-column="colInfo.key"
            data-testid="board-cell"
            style="height: 1px"
            @dblclick.exact="emit('addCard', week.id, colInfo.key)"
            @dblclick.ctrl="emit('addCardWithSelector', week.id, colInfo.key)"
          >
            <div class="flex h-full flex-col">
              <!-- vue-draggable-plus -->
              <VueDraggable
                :key="cellKey(week.id, colInfo.key)"
                v-model="cellLists[cellKey(week.id, colInfo.key)]!"
                :group="{ name: 'cards', pull: true, put: true }"
                class="flex w-full flex-1 flex-wrap content-start items-start gap-2"
                :animation="150"
                :sort="false"
                ghost-class="sortable-ghost"
                chosen-class="sortable-chosen"
                fallback-class="sortable-fallback"
                :fallback-tolerance="3"
                :set-data="
                  (dt) => {
                    dt.effectAllowed = 'copyMove';
                  }
                "
                :dragover-bubble="true"
                @start="(e) => handleDragStart(e)"
                @end="(e) => handleDragEnd(e, week.id, colInfo.key)"
              >
                <Card
                  v-for="card in cellLists[cellKey(week.id, colInfo.key)]"
                  :key="card.id"
                  :card="card"
                />
              </VueDraggable>
              <div
                v-if="isBoardEmpty && week.title === 'Categories'"
                class="pointer-events-none absolute inset-0 flex items-center pl-2 text-sm text-gray-400 select-none"
              >
                ← Добавьте карточку
              </div>
            </div>
          </td>
        </tr>
      </tbody>

      <!-- New Week Row -->
      <tfoot>
        <tr>
          <td colspan="8" class="border-r border-b border-gray-200 bg-white last:border-r-0">
            <button
              @click="handleAddWeek"
              class="skip-ink-none flex w-full items-center justify-center py-3 text-sm text-gray-400 select-none hover:underline"
              data-testid="add-week-button"
            >
              Добавить неделю
            </button>
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

thead th {
  position: sticky;
  top: 0;
  z-index: 10;
}

tbody td,
tfoot td {
  position: relative;
  z-index: 1;
}

tbody td:has(.sortable-ghost) {
  @apply bg-blue-100/60!;
}

.sortable-ghost {
  @apply opacity-0!;
}

.sortable-dragover {
  @apply bg-blue-100/60!;
}

/* firefox */
@-moz-document url-prefix() {
  table {
    -moz-user-select: none;
    user-select: none;
  }
  tr.week {
    height: 1px;
  }
  tr.week > td[data-column] {
    height: 100% !important;
  }
}
</style>
