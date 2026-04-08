<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useBoardStore } from "@/stores/board";
import { generatePastelColor } from "@/utils/pastelColor";
import { Check, X } from "@lucide/vue";
import type { TaskRecord } from "@/db/db";

const props = defineProps<{
  weekId: string;
  column?: TaskRecord["column"];
  mode: "create" | "edit";
  task?: TaskRecord;
}>();

const emit = defineEmits<{ close: [] }>();

const boardStore = useBoardStore();

const title = ref(props.mode === "edit" && props.task ? props.task.title : "");
const isSaving = ref(false);
const overlayMousedown = ref(false);

const textareaRef = ref<HTMLTextAreaElement | null>(null);

function handleOverlayMousedown() {
  overlayMousedown.value = true;
}

function handleOverlayClick() {
  if (!overlayMousedown.value) return;
  overlayMousedown.value = false;
  handleCancel();
}

onMounted(() => {
  textareaRef.value?.focus();
});

async function handleSave() {
  const trimmed = title.value.trim();
  if (!trimmed || isSaving.value) return;

  isSaving.value = true;
  try {
    if (props.mode === "create") {
      if (!props.column) throw new Error("Column is required for creation");
      await boardStore.createTask(props.weekId, trimmed, props.column);
    } else if (props.task) {
      await boardStore.updateTask(props.task.id, {
        title: trimmed,
      });
    }
    emit("close");
  } catch (e) {
    console.error("Failed to save task:", e);
  } finally {
    isSaving.value = false;
  }
}

function handleCancel() {
  emit("close");
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.preventDefault();
    handleCancel();
  } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    handleSave();
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      @mousedown="handleOverlayMousedown"
      @click="handleOverlayClick"
    >
      <div
        class="w-full max-w-sm rounded border-2 border-gray-800 bg-white p-0 shadow-xl transition-colors"
        :style="title.trim() ? { backgroundColor: generatePastelColor(title.trim()) } : {}"
        @click.stop
        @mousedown.stop
      >
        <!-- Title Area -->
        <div class="p-3">
          <textarea
            ref="textareaRef"
            v-model="title"
            @keydown="handleKeydown"
            rows="3"
            placeholder=""
            class="field-sizing-content max-h-[80vh] w-full resize-none overflow-auto border-none bg-transparent text-center text-lg font-medium text-gray-800 outline-none"
          />
        </div>

        <!-- Actions -->
        <div class="flex border-t border-gray-200/60">
          <button
            @click="handleSave"
            :disabled="isSaving || !title.trim()"
            class="flex flex-1 items-center justify-center gap-1 bg-green-600 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check class="h-4 w-4" />
            <span>{{ mode === "create" ? "Create" : "Save" }}</span>
          </button>
          <button
            @click="handleCancel"
            class="flex flex-1 items-center justify-center gap-1 bg-gray-400 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-500"
          >
            <X class="h-4 w-4" />
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
