<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useBoardStore } from "@/stores/board";

const emit = defineEmits<{
  select: [title: string];
  close: [];
}>();

const boardStore = useBoardStore();
const selectedTitle = ref("");
const selectRef = ref<HTMLSelectElement | null>(null);

const titles = computed(() => {
  const result: { title: string; count: number }[] = [];
  for (const [title, count] of boardStore.cardsFirstLineCounts.entries()) {
    result.push({ title, count });
  }
  result.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
  return result;
});

onMounted(() => {
  const first = titles.value[0];
  if (first) {
    selectedTitle.value = first.title;
  }
  selectRef.value?.focus();
});

function handleConfirm() {
  if (selectedTitle.value) {
    emit("select", selectedTitle.value);
  }
}

function handleCancel() {
  emit("close");
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.preventDefault();
    handleCancel();
  } else if (e.key === "Enter") {
    e.preventDefault();
    handleConfirm();
  }
}

const overlayMousedown = ref(false);

function handleOverlayMousedown() {
  overlayMousedown.value = true;
}

function handleOverlayClick() {
  if (!overlayMousedown.value) return;
  overlayMousedown.value = false;
  handleCancel();
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
        class="w-full max-w-sm rounded border-2 border-gray-800 bg-white p-0 shadow-xl"
        @click.stop
        @mousedown.stop
      >
        <div class="p-4">
          <label class="mb-2 block text-sm font-semibold text-gray-700">Выберите заголовок</label>
          <select
            ref="selectRef"
            v-model="selectedTitle"
            class="max-h-[80vh] w-full overflow-auto overflow-x-hidden rounded border border-gray-300 bg-white px-3 py-2 text-gray-800 outline-none focus:border-gray-800"
            :size="titles.length"
            :disabled="titles.length === 0"
            data-testid="card-title-select"
            @keydown="handleKeydown"
            @dblclick="handleConfirm"
          >
            <option v-for="{ title, count } in titles" :key="title" :value="title">
              {{ title }} {{ count > 1 ? `(${count})` : "" }}
            </option>
          </select>
        </div>

        <div class="flex border-t border-gray-200/60">
          <button
            @click="handleConfirm"
            :disabled="!selectedTitle"
            class="flex flex-1 items-center justify-center gap-1 bg-green-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="select-card-title-button"
          >
            <span>Выбрать</span
            ><kbd
              class="relative top-px ml-1 inline-flex items-center rounded border border-white/30 bg-white/10 px-1 pt-0.5 pb-[0.15em] text-[10px] leading-[1.2] font-normal opacity-80"
              >Enter</kbd
            >
          </button>
          <button
            @click="handleCancel"
            class="flex flex-1 items-center justify-center gap-1 bg-gray-400 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-500"
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
