import { ref } from "vue";
import type { useBoardStore } from "@/stores/board";

export function useStoryManagement(boardStore: ReturnType<typeof useBoardStore>) {
  const isAddingStory = ref(false);
  const newStoryTitle = ref("");

  async function addStory(title: string) {
    await boardStore.createStory(title);
    newStoryTitle.value = "";
    isAddingStory.value = false;
  }

  return {
    isAddingStory,
    newStoryTitle,
    addStory,
  };
}
