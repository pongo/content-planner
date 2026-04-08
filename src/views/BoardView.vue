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
  await boardStore.createStory(title);
}

const addTaskStoryId = ref<string | null>(null);
const addTaskColumn = ref<TaskRecord["column"] | null>(null);

function openAddTask(storyId: string, column: TaskRecord["column"]) {
  addTaskStoryId.value = storyId;
  addTaskColumn.value = column;
}

function closeAddTask() {
  addTaskStoryId.value = null;
  addTaskColumn.value = null;
}

function getTasks(storyId: string, column: TaskRecord["column"]) {
  return boardStore.getTasksForStory(storyId, column);
}

async function handleStoryTitleUpdate(id: string, title: string) {
  await boardStore.updateStoryTitle(id, title);
}

async function handleStoryDelete(id: string) {
  await boardStore.deleteStory(id);
}

async function handleStoryComplete(id: string) {
  await boardStore.completeStory(id);
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
      :stories="boardStore.stories"
      :get-tasks="getTasks"
      @add-task="openAddTask"
      @add-story="addWeek"
      @story-title-update="handleStoryTitleUpdate"
      @story-delete="handleStoryDelete"
      @story-complete="handleStoryComplete"
    />
  </div>

  <div v-else class="flex min-h-screen items-center justify-center">
    <p class="text-gray-500">Board not found</p>
  </div>

  <!-- Add Task Dialog -->
  <CardDialog
    v-if="addTaskStoryId && addTaskColumn"
    :story-id="addTaskStoryId"
    :column="addTaskColumn"
    mode="create"
    @close="closeAddTask"
  />
</template>
