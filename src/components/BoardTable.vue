<script setup lang="ts">
import { computed, onMounted, onUnmounted, toRef } from "vue";
import { VueDraggable } from "vue-draggable-plus";
import { useBoardStore } from "@/stores/board";
import Card from "@/components/Card.vue";
import { Plus, Check } from "@lucide/vue";
import { useCardDrag } from "@/features/card-drag/useCardDrag";
import type { CardRecord, WeekRecord } from "@/shared/db/db";

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

const boardStore = useBoardStore();
const columns = boardStore.columns;

const isBoardEmpty = computed(() => boardStore.cards.length === 0);

const { cellLists, cellKey, getWeekColumns, handleDragStart, handleDragEnd } = useCardDrag({
  weeks: toRef(props, "weeks"),
  getCards: props.getCards,
  boardStore,
  addCard: (weekId, column, text) => emit("addCard", weekId, column, text),
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
