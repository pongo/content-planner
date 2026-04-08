<script setup lang="ts">
import { ref, computed } from "vue";
import { useBoardStore } from "@/stores/board";
import { generatePastelColor } from "@/utils/pastelColor";
import TaskDialog from "@/components/TaskDialog.vue";
import { User, X } from "@lucide/vue";
import type { TaskRecord } from "@/db/db";

const props = defineProps<{ task: TaskRecord }>();

const boardStore = useBoardStore();
const isEditing = ref(false);
const isHovered = ref(false);

const colors = computed(() => {
  if (props.task.assignee) {
    const base = generatePastelColor(props.task.assignee);
    return { base, accent: `color-mix(in srgb, ${base}, black 15%)` };
  }
  return { base: "#fff", accent: "#f2f6ff" };
});

function handleDelete() {
  if (confirm("Delete this task?")) {
    boardStore.deleteTask(props.task.id);
  }
}

function startEdit() {
  isEditing.value = true;
}

function closeEdit() {
  isEditing.value = false;
}
</script>

<template>
  <div
    class="group relative flex h-30 w-32 flex-col overflow-hidden rounded-[1px] border-0 border-black/10 shadow-sm transition-shadow select-none"
    :style="{ backgroundColor: colors.base }"
    :data-task-id="task.id"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @dblclick="startEdit"
  >
    <!-- Top Accent Bar -->
    <div class="h-2.5 w-full" :style="{ backgroundColor: colors.accent }"></div>

    <div class="relative flex flex-1 flex-col justify-between pt-2">
      <!-- Delete button on hover -->
      <button
        v-show="isHovered"
        @click.stop="handleDelete"
        class="rounded-0 absolute -top-2.5 right-0 px-0.5 text-gray-400 hover:text-red-500"
        :style="{ backgroundColor: colors.base }"
        title="Delete"
      >
        <X class="h-2.5 w-3" />
      </button>

      <!-- Task Title -->
      <p
        class="line-clamp-5 min-w-0 px-1 text-center text-xs font-medium wrap-break-word whitespace-pre-wrap text-gray-800"
      >
        {{ task.title }}
      </p>

      <!-- Assignee -->
      <div
        v-if="task.assignee"
        class="absolute bottom-0.5 left-0.5 flex items-center gap-0.5 self-start text-xs text-gray-600"
      >
        <User class="h-2.5 w-2.5" />
        <span class="truncate">{{ task.assignee }}</span>
      </div>
    </div>

    <!-- Edit Dialog -->
    <TaskDialog
      v-if="isEditing"
      :story-id="task.storyId"
      mode="edit"
      :task="task"
      @close="closeEdit"
    />
  </div>
</template>
