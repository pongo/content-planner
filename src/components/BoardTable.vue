<script setup lang="ts">
import { ref, watch } from "vue";
import { VueDraggable, type DraggableEvent } from "vue-draggable-plus";
import { useBoardStore } from "@/stores/board";
import Card from "@/components/Card.vue";
import { Plus, Check } from "@lucide/vue";
import type { TaskRecord, WeekRecord } from "@/db/db";

const props = defineProps<{
  weeks: WeekRecord[];
  getTasks: (weekId: string, column: TaskRecord["column"]) => TaskRecord[];
}>();

const emit = defineEmits<{
  addTask: [weekId: string, column: TaskRecord["column"]];
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

const columns: TaskRecord["column"][] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function cellKey(weekId: string, column: TaskRecord["column"]) {
  return `${weekId}:${column}`;
}

async function handleDragEnd(e: DraggableEvent, weekId: string, column: TaskRecord["column"]) {
  const sourceKey = cellKey(weekId, column);
  const sourceTasks = cellLists.value[sourceKey] ?? [];

  const targetTd = e.to.closest("td[data-week-id]") as HTMLTableCellElement | null;
  const targetWeekId = targetTd?.dataset.weekId;
  const targetCol = targetTd?.dataset.column as TaskRecord["column"] | undefined;

  if (!targetWeekId || !targetCol) return;

  const targetKey = cellKey(targetWeekId, targetCol);

  if (e.to === e.from) {
    await boardStore.saveCell(weekId, column, sourceTasks);
  } else {
    const targetTasks = cellLists.value[targetKey] ?? [];
    await boardStore.saveBothCells(
      weekId,
      column,
      sourceTasks,
      targetWeekId,
      targetCol,
      targetTasks,
    );
  }
}

function getWeekColumns(week: WeekRecord): { key: TaskRecord["column"]; colspan?: number }[] {
  if (week.title === "Categories") {
    return [{ key: "ALL", colspan: 7 }];
  }
  return columns.map((col) => ({ key: col }));
}

// Each cell gets its own mutable array that vue-draggable can reorder
const cellLists = ref<Record<string, TaskRecord[]>>({});
const boardStore = useBoardStore();

// Sync cellLists with store data — mutate in-place to keep VueDraggable's reference
function syncCellLists() {
  for (const week of props.weeks) {
    const colsToSync = getWeekColumns(week);
    for (const colInfo of colsToSync) {
      const col = colInfo.key;
      const key = cellKey(week.id, col);
      const newTasks = [...props.getTasks(week.id, col)];
      if (!cellLists.value[key]) {
        cellLists.value[key] = newTasks;
      } else {
        // Mutate existing array in-place so VueDraggable's v-model reference stays valid
        const existing = cellLists.value[key]!;
        existing.length = 0;
        existing.push(...newTasks);
      }
    }
  }
}

// Initial sync + watch for store changes (weeks and tasks)
watch([() => props.weeks, () => boardStore.tasks], () => syncCellLists(), {
  deep: true,
  immediate: true,
});
</script>

<template>
  <div class="flex-1 overflow-auto">
    <table class="w-full" style="border-collapse: separate; border-spacing: 0">
      <colgroup>
        <col class="w-10" />
        <col v-for="col in columns" :key="col" class="min-w-40" />
      </colgroup>

      <!-- Header -->
      <thead>
        <tr class="bg-white">
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
        <tr v-for="week in weeks" :key="week.id">
          <!-- Add Card or Complete Week Button Cell -->
          <td
            class="h-[calc(var(--task-card-height)+8px*2+1px)] border-r border-b border-gray-200 bg-white p-2"
          >
            <button
              v-if="week.title === 'Categories'"
              class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              title="Добавить карточку"
              @click="emit('addTask', week.id, 'ALL')"
            >
              <Plus class="h-4 w-4" />
            </button>
            <button
              v-else
              class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-green-600"
              title="Завершить неделю и вернуть карточки"
              @click="emit('weekComplete', week.id)"
            >
              <Check class="h-4 w-4" />
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
            style="height: 1px"
          >
            <div class="flex h-full flex-col">
              <VueDraggable
                :key="cellKey(week.id, colInfo.key)"
                v-model="cellLists[cellKey(week.id, colInfo.key)]!"
                :group="{ name: 'tasks', pull: true, put: true }"
                class="flex flex-1 flex-wrap content-start items-start gap-2"
                :animation="150"
                ghost-class="sortable-ghost"
                chosen-class="sortable-chosen"
                fallback-class="sortable-fallback"
                :fallback-tolerance="3"
                @end="(e: any) => handleDragEnd(e, week.id, colInfo.key)"
              >
                <Card
                  v-for="task in cellLists[cellKey(week.id, colInfo.key)]"
                  :key="task.id"
                  :task="task"
                />
              </VueDraggable>
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
              class="skip-ink-none flex w-full items-center justify-center py-3 text-sm text-gray-400 hover:underline"
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

.sortable-ghost {
  @apply opacity-40 outline-2 outline-blue-400/50 outline-dashed;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 6px,
    rgba(59, 130, 246, 0.15) 6px,
    rgba(59, 130, 246, 0.15) 12px
  ) !important;
  box-shadow: none !important;
}

.sortable-fallback {
  @apply opacity-80;
}
</style>
