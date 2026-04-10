<script setup lang="ts">
import { ref, computed } from "vue";
import { useBoardStore } from "@/stores/board";
import { generatePastelColor } from "@/utils/pastelColor";
import CardDialog from "@/components/CardDialog.vue";
import { X } from "@lucide/vue";
import type { TaskRecord } from "@/db/db";

import { useAppVariants } from "@/variants.ts";
const { variants } = useAppVariants();

const props = defineProps<{ task: TaskRecord }>();

const boardStore = useBoardStore();
const isEditing = ref(false);
const isHovered = ref(false);

const colors = computed(() => {
  const base = generatePastelColor(props.task.title);
  return { base, accent: `color-mix(in srgb, ${base}, black 15%)` };
});

const titleInfo = computed(() => {
  const title = props.task.title;
  const index = title.indexOf("\n");

  if (index === -1) {
    return {
      firstLine: title,
      remainingLines: "",
      isMultiline: false,
    };
  }

  return {
    firstLine: title.slice(0, index),
    remainingLines: title.slice(index + 1).trim(),
    isMultiline: true,
  };
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
    class="group relative flex w-30 flex-col overflow-hidden rounded-[1px] border-0 border-black/10 shadow-sm transition-shadow select-none"
    :style="{ backgroundColor: colors.base, minHeight: 'var(--task-card-height)' }"
    :data-task-id="task.id"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @dblclick="startEdit"
  >
    <div class="relative flex flex-1 flex-col items-center justify-center py-1">
      <!-- Delete button on hover -->
      <button
        v-show="isHovered"
        @click.stop="handleDelete"
        class="absolute top-0 right-0 rounded p-0.5 text-gray-400 hover:text-red-500"
        title="Delete"
      >
        <X class="h-2.5 w-3" />
      </button>

      <!-- Title -->
      <div class="w-full text-center">
        <p class="px-1 text-xs leading-tight font-semibold text-gray-800">
          {{ titleInfo.firstLine }}
        </p>
        <template v-if="titleInfo.isMultiline">
          <hr class="my-1" :class="[variants.border]" />
          <p class="px-1 text-xs leading-tight whitespace-pre-wrap text-gray-800 italic">
            {{ titleInfo.remainingLines }}
          </p>
        </template>
      </div>
    </div>

    <!-- Edit Dialog -->
    <CardDialog
      v-if="isEditing"
      :week-id="task.weekId"
      mode="edit"
      :task="task"
      @close="closeEdit"
    />
  </div>
</template>
