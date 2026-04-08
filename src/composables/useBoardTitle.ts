import { ref, nextTick, watch } from "vue";
import type { useBoardStore } from "@/stores/board";

export function useBoardTitle(boardStore: ReturnType<typeof useBoardStore>) {
  const isEditingTitle = ref(false);
  const titleInput = ref("");
  const titleInputRef = ref<HTMLInputElement | null>(null);

  watch(
    () => boardStore.currentBoard?.title,
    (title) => {
      document.title = title ? `${title} - Content-planner` : "Content-planner";
    },
    { immediate: true },
  );

  function startEditing() {
    titleInput.value = boardStore.currentBoard?.title ?? "";
    isEditingTitle.value = true;
    nextTick(() => {
      titleInputRef.value?.focus();
    });
  }

  async function saveTitle() {
    const trimmed = titleInput.value.trim();
    if (!trimmed || !boardStore.currentBoard) {
      isEditingTitle.value = false;
      return;
    }
    isEditingTitle.value = false;
    await boardStore.updateBoardTitle(trimmed);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      isEditingTitle.value = false;
    }
  }

  return {
    isEditingTitle,
    titleInput,
    titleInputRef,
    startEditing,
    saveTitle,
    handleKeydown,
  };
}
