<script setup lang="ts">
import { ref, onMounted } from "vue";
import { generatePastelColor } from "@/shared/utils/pastelColor";

const props = defineProps<{
  mode: "create" | "edit";
  initialTitle?: string;
  saving?: boolean;
}>();

const emit = defineEmits<{
  save: [title: string];
  close: [];
}>();

const title = ref(props.initialTitle ?? "");
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
  if (!trimmed || props.saving) return;

  emit("save", trimmed);
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
            data-testid="card-title-input"
            class="field-sizing-content max-h-[80vh] w-full resize-none overflow-auto overflow-x-hidden border-none bg-transparent text-center text-lg font-semibold text-gray-800 outline-none"
          />
        </div>

        <!-- Actions -->
        <div class="flex border-t border-gray-200/60">
          <button
            @click="handleSave"
            :disabled="saving || !title.trim()"
            class="flex flex-1 items-center justify-center gap-1 bg-green-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="save-card-button"
          >
            <span>{{ mode === "create" ? "Создать" : "Сохранить" }}</span>
            <kbd
              class="relative top-px ml-1 inline-flex items-center rounded border border-white/30 bg-white/10 px-1 pt-0.5 pb-[0.15em] text-[10px] leading-[1.2] font-normal opacity-80"
              >Ctrl+Enter</kbd
            >
          </button>
          <button
            @click="handleCancel"
            class="flex flex-1 items-center justify-center gap-1 bg-gray-400 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-500"
            data-testid="cancel-card-button"
          >
            <span>Отмена</span>
            <kbd
              class="relative top-px ml-1 inline-flex items-center rounded border border-white/30 bg-white/10 px-1 pt-0.5 pb-[0.15em] text-[10px] leading-[1.2] font-normal opacity-80"
              >Esc</kbd
            >
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@supports not (field-sizing: content) {
  textarea.field-sizing-content {
    min-height: 50vh;
  }
}
</style>
