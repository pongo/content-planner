<script setup lang="ts">
import { ref, watch } from "vue";
import { useBoardStore } from "@/stores/board";
import BoardTable from "@/components/BoardTable.vue";
import CardDialog from "@/components/CardDialog.vue";
import BoardHeader from "@/components/BoardHeader.vue";
import type { TaskRecord } from "@/db/db";

const props = defineProps<{ slug: string }>();

const boardStore = useBoardStore();

async function addWeek(title: string) {
  await boardStore.createWeek(title);
}

const addTaskWeekId = ref<string | null>(null);
const addTaskColumn = ref<TaskRecord["column"] | null>(null);

function openAddTask(weekId: string, column: TaskRecord["column"]) {
  addTaskWeekId.value = weekId;
  addTaskColumn.value = column;
}

function closeAddTask() {
  addTaskWeekId.value = null;
  addTaskColumn.value = null;
}

function getTasks(weekId: string, column: TaskRecord["column"]) {
  return boardStore.getTasksForWeek(weekId, column);
}

async function handleWeekTitleUpdate(id: string, title: string) {
  await boardStore.updateWeekTitle(id, title);
}

async function handleWeekDelete(id: string) {
  await boardStore.deleteWeek(id);
}

async function handleWeekComplete(id: string) {
  await boardStore.completeWeek(id);
}

watch(
  () => props.slug,
  async (slug) => {
    await boardStore.loadBoard(slug);
  },
  { immediate: true },
);
</script>

<template>
  <div v-if="boardStore.loading" class="flex min-h-screen items-center justify-center"></div>

  <div
    v-else-if="boardStore.currentBoard"
    class="flex h-screen flex-col overflow-hidden bg-gray-50"
  >
    <!-- Board Header -->
    <BoardHeader />

    <!-- Board Table -->
    <BoardTable
      :weeks="boardStore.weeks"
      :get-tasks="getTasks"
      @add-task="openAddTask"
      @add-week="addWeek"
      @week-title-update="handleWeekTitleUpdate"
      @week-delete="handleWeekDelete"
      @week-complete="handleWeekComplete"
    />
  </div>

  <div v-else class="flex min-h-screen items-center justify-center">
    <p class="text-gray-500">Board not found</p>
  </div>

  <!-- Add Task Dialog -->
  <CardDialog
    v-if="addTaskWeekId && addTaskColumn"
    :week-id="addTaskWeekId"
    :column="addTaskColumn"
    mode="create"
    @close="closeAddTask"
  />
</template>
