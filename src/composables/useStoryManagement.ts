import { ref } from "vue";
import type { useBoardStore } from "@/stores/board";

export function useStoryManagement(boardStore: ReturnType<typeof useBoardStore>) {
  const isAddingStory = ref(false);
  const newStoryTitle = ref("");

  function startAddStory() {
    isAddingStory.value = true;
    newStoryTitle.value = "";
  }

  async function addStory(title: string) {
    await boardStore.createStory(title);
    newStoryTitle.value = "";
    isAddingStory.value = false;
  }

  function cancelAddStory() {
    isAddingStory.value = false;
    newStoryTitle.value = "";
  }

  return {
    isAddingStory,
    newStoryTitle,
    startAddStory,
    addStory,
    cancelAddStory,
  };
}
