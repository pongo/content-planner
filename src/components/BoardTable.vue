<script setup lang="ts">
import { ref, watch } from "vue";
import { VueDraggable } from "vue-draggable-plus";
import { useBoardStore } from "@/stores/board";
import StoryCard from "@/components/StoryCard.vue";
import StoryForm from "@/components/StoryForm.vue";
import TaskCard from "@/components/TaskCard.vue";
import { Plus } from "@lucide/vue";
import type { TaskRecord, StoryRecord } from "@/db/db";

const props = defineProps<{
  stories: StoryRecord[];
  isAddingStory: boolean;
  getTasks: (storyId: string, column: TaskRecord["column"]) => TaskRecord[];
}>();

const emit = defineEmits<{
  addTask: [storyId: string, column: TaskRecord["column"]];
  startAddStory: [];
  addStory: [title: string];
  cancelAddStory: [];
  storyTitleUpdate: [id: string, title: string];
  storyDelete: [id: string];
}>();

const newStoryTitle = defineModel<string>("newStoryTitle", { default: "" });

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

function cellKey(storyId: string, column: TaskRecord["column"]) {
  return `${storyId}:${column}`;
}

// Each cell gets its own mutable array that vue-draggable can reorder
const cellLists = ref<Record<string, TaskRecord[]>>({});
const boardStore = useBoardStore();

// Sync cellLists with store data — mutate in-place to keep VueDraggable's reference
function syncCellLists() {
  for (const story of props.stories) {
    const colsToSync = story.title === "Categories" ? ["ALL" as const] : columns;
    for (const col of colsToSync) {
      const key = cellKey(story.id, col);
      const newTasks = [...props.getTasks(story.id, col)];
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

// Initial sync + watch for store changes (stories and tasks)
watch([() => props.stories, () => boardStore.tasks], () => syncCellLists(), {
  deep: true,
  immediate: true,
});
</script>

<template>
  <div class="flex-1 overflow-auto">
    <table class="w-full" style="border-collapse: separate; border-spacing: 0">
      <colgroup>
        <col class="w-50" />
        <col class="w-10" />
        <col v-for="col in columns" :key="col" class="min-w-40" />
      </colgroup>

      <!-- Header -->
      <thead>
        <tr class="bg-white">
          <th
            class="border-r border-b border-gray-200 bg-white px-3 py-3 text-center text-sm font-semibold tracking-wide text-gray-400 uppercase"
          ></th>
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

      <!-- Story Rows -->
      <tbody>
        <tr v-for="story in stories" :key="story.id">
          <!-- Story Cell -->
          <td class="border-r border-b border-gray-200 bg-white p-0 align-top" style="height: 1px">
            <div class="h-full">
              <StoryCard
                :story="story"
                @title-update="(id, title) => emit('storyTitleUpdate', id, title)"
                @delete="(id) => emit('storyDelete', id)"
              />
            </div>
          </td>

          <template v-if="story.title === 'Categories'">
            <!-- Add Task Button Cell -->
            <td
              class="border-r border-b border-gray-200 bg-white p-2"
              @click="emit('addTask', story.id, 'ALL')"
            >
              <button
                class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                title="Add Task"
              >
                <Plus class="h-4 w-4" />
              </button>
            </td>
            <!-- Task Cells with VueDraggable (colspan for Categories) -->
            <td
              colspan="7"
              class="relative border-r border-b border-gray-200 bg-gray-50 p-2 align-top last:border-r-0"
              :data-story-id="story.id"
              data-column="ALL"
              style="height: 1px"
            >
              <div class="flex h-full flex-col">
                <VueDraggable
                  :key="cellKey(story.id, 'ALL')"
                  v-model="cellLists[cellKey(story.id, 'ALL')]!"
                  :group="{ name: 'tasks', pull: true, put: true }"
                  class="flex flex-1 flex-wrap content-start items-start gap-2"
                  :animation="150"
                  ghost-class="sortable-ghost"
                  chosen-class="sortable-chosen"
                  fallback-class="sortable-fallback"
                  :fallback-tolerance="3"
                  @end="
                    async (e: any) => {
                      const sourceKey = cellKey(story.id, 'ALL');
                      const sourceTasks = cellLists[sourceKey] ?? [];

                      const targetTd = e.to.closest('td[data-story-id]');
                      const targetStoryId = targetTd?.dataset.storyId;
                      const targetCol = targetTd?.dataset.column;

                      if (!targetStoryId || !targetCol) return;

                      const targetKey = cellKey(targetStoryId, targetCol);

                      if (e.to === e.from) {
                        await boardStore.saveCell(story.id, 'ALL', sourceTasks);
                      } else {
                        const targetTasks = cellLists[targetKey] ?? [];
                        await boardStore.saveBothCells(
                          story.id,
                          'ALL',
                          sourceTasks,
                          targetStoryId,
                          targetCol,
                          targetTasks,
                        );
                      }
                    }
                  "
                >
                  <TaskCard
                    v-for="task in cellLists[cellKey(story.id, 'ALL')]"
                    :key="task.id"
                    :task="task"
                  />
                </VueDraggable>
              </div>
            </td>
          </template>

          <template v-else>
            <!-- Add Task Button Cell -->
            <td
              class="border-r border-b border-gray-200 bg-white p-2"
              @click="emit('addTask', story.id, 'MON')"
            >
              <button
                class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                title="Add Task"
              >
                <Plus class="h-4 w-4" />
              </button>
            </td>

            <!-- Task Cells with VueDraggable -->
            <td
              v-for="col in columns"
              :key="col"
              class="relative border-r border-b border-gray-200 bg-gray-50 p-2 align-top last:border-r-0"
              :data-story-id="story.id"
              :data-column="col"
              style="height: 1px"
            >
              <div class="flex h-full flex-col">
                <VueDraggable
                  :key="cellKey(story.id, col)"
                  v-model="cellLists[cellKey(story.id, col)]!"
                  :group="{ name: 'tasks', pull: true, put: true }"
                  class="flex flex-1 flex-wrap content-start items-start gap-2"
                  :animation="150"
                  ghost-class="sortable-ghost"
                  chosen-class="sortable-chosen"
                  fallback-class="sortable-fallback"
                  :fallback-tolerance="3"
                  @end="
                    async (e: any) => {
                      const sourceKey = cellKey(story.id, col);
                      const sourceTasks = cellLists[sourceKey] ?? [];

                      const targetTd = e.to.closest('td[data-story-id]');
                      const targetStoryId = targetTd?.dataset.storyId;
                      const targetCol = targetTd?.dataset.column;

                      if (!targetStoryId || !targetCol) return;

                      const targetKey = cellKey(targetStoryId, targetCol);

                      if (e.to === e.from) {
                        await boardStore.saveCell(story.id, col, sourceTasks);
                      } else {
                        const targetTasks = cellLists[targetKey] ?? [];
                        await boardStore.saveBothCells(
                          story.id,
                          col,
                          sourceTasks,
                          targetStoryId,
                          targetCol,
                          targetTasks,
                        );
                      }
                    }
                  "
                >
                  <TaskCard
                    v-for="task in cellLists[cellKey(story.id, col)]"
                    :key="task.id"
                    :task="task"
                  />
                </VueDraggable>
              </div>
            </td>
          </template>
        </tr>
      </tbody>

      <!-- New Story Row -->
      <tfoot>
        <tr>
          <td colspan="9" class="border-r border-b border-gray-200 bg-white last:border-r-0">
            <StoryForm
              v-if="isAddingStory"
              :initial-title="newStoryTitle"
              @submit="(title) => emit('addStory', title)"
              @cancel="emit('cancelAddStory')"
            />
            <button
              v-else
              @click="emit('startAddStory')"
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
