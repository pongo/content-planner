<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Menu } from "@lucide/vue";
import { useBoardStore } from "@/stores/board";
import { useBoardTitle } from "@/composables/useBoardTitle";
import BoardDrawer from "@/components/BoardDrawer.vue";

const boardStore = useBoardStore();

const {
  isEditingTitle,
  titleInput,
  startEditing: startEditingTitle,
  saveTitle,
  handleKeydown: handleTitleKeydown,
} = useBoardTitle(boardStore);

const drawerOpen = ref(false);

function openDrawer() {
  drawerOpen.value = true;
}

// Close drawer on Escape
onMounted(() => {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawerOpen.value) drawerOpen.value = false;
  });
});
</script>

<template>
  <header class="flex items-center gap-3 border-b border-gray-200 bg-white px-6 py-4">
    <!-- Hamburger -->
    <button
      @click="openDrawer"
      class="rounded p-1 text-gray-600 hover:bg-gray-100 hover:text-gray-800"
      title="Open boards menu"
    >
      <Menu class="size-6" />
    </button>

    <!-- Title -->
    <div v-if="isEditingTitle" class="flex-1">
      <input
        ref="titleInputRef"
        v-model="titleInput"
        @blur="saveTitle"
        @keyup.enter="($event.target as HTMLInputElement).blur()"
        @keydown="handleTitleKeydown"
        type="text"
        class="field-sizing-content min-w-10 rounded border border-gray-300 px-2 py-1 text-lg font-semibold outline-none focus:border-blue-500"
        autofocus
      />
    </div>
    <h1 v-else class="flex-1 text-xl font-semibold text-gray-800">
      <span @dblclick="startEditingTitle" title="Double click to edit">{{
        boardStore.currentBoard!.title
      }}</span>
    </h1>

    <!-- Drawer -->
    <BoardDrawer :open="drawerOpen" @close="drawerOpen = false" />
  </header>
</template>
