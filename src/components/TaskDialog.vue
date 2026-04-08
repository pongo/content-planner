<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useBoardStore } from "@/stores/board";
import { generatePastelColor } from "@/utils/pastelColor";
import { Check, X } from "@lucide/vue";
import type { TaskRecord } from "@/db/db";

const props = defineProps<{
  storyId: string;
  mode: "create" | "edit";
  task?: TaskRecord;
}>();

const emit = defineEmits<{ close: [] }>();

const boardStore = useBoardStore();

const title = ref(props.mode === "edit" && props.task ? props.task.title : "");
const assignee = ref(props.mode === "edit" && props.task ? props.task.assignee : "");
const isSaving = ref(false);
const overlayMousedown = ref(false);

const assigneeSuggestions = computed(() => {
  const assignees = boardStore.tasks.map((t) => t.assignee).filter((a) => a.trim() !== "");
  return [...new Set(assignees)].sort();
});

const textareaRef = ref<HTMLTextAreaElement | null>(null);

function handleOverlayMousedown() {
  overlayMousedown.value = true;
}

function handleOverlayClick() {
  // Only close if the mousedown also happened on the overlay
  // (prevents closing when selecting text inside and releasing outside)
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
      await boardStore.createTask(props.storyId, trimmed, assignee.value.trim());
    } else if (props.task) {
      await boardStore.updateTask(props.task.id, {
        title: trimmed,
        assignee: assignee.value.trim(),
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
        :style="assignee.trim() ? { backgroundColor: generatePastelColor(assignee) } : {}"
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

        <!-- Assignee Input -->
        <div class="border-t border-gray-200/60 px-3 py-2">
          <input
            v-model="assignee"
            type="text"
            list="assignee-suggestions"
            placeholder="UNASSIGNED"
            @keydown="handleKeydown"
            @keyup.enter.prevent="handleSave"
            class="w-full rounded-sm border border-gray-300/60 bg-white/80 px-2 py-1 text-sm text-gray-600 outline-none focus:border-blue-500"
          />
          <datalist id="assignee-suggestions">
            <option v-for="name in assigneeSuggestions" :key="name" :value="name" />
          </datalist>
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
