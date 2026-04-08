<script setup lang="ts">
import { ref, computed } from "vue";
import { useBoardStore } from "@/stores/board";
import { generatePastelColor } from "@/utils/pastelColor";
import CardDialog from "@/components/CardDialog.vue";
import { X } from "@lucide/vue";
import type { TaskRecord } from "@/db/db";

// import { useAppVariants } from "@/variants.ts";
// const { variants } = useAppVariants();

const props = defineProps<{ task: TaskRecord }>();

const boardStore = useBoardStore();
const isEditing = ref(false);
const isHovered = ref(false);

const colors = computed(() => {
  const base = generatePastelColor(props.task.title);
  return { base, accent: `color-mix(in srgb, ${base}, black 15%)` };
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
    :style="{ backgroundColor: colors.base, height: 'var(--task-card-height)' }"
    :data-task-id="task.id"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @dblclick="startEdit"
  >
    <div class="relative flex flex-1 items-center justify-center px-1">
      <!-- Delete button on hover -->
      <button
        v-show="isHovered"
        @click.stop="handleDelete"
        class="absolute top-0 right-0 rounded p-0.5 text-gray-400 hover:text-red-500"
        title="Delete"
      >
        <X class="h-2.5 w-3" />
      </button>

      <!-- Task Title -->
      <p
        class="line-clamp-3 w-full text-center text-xs leading-tight font-semibold wrap-break-word whitespace-pre-wrap text-gray-800"
      >
        {{ task.title }}
      </p>
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
