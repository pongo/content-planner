<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useBoardStore } from "@/stores/board";

const router = useRouter();
const boardStore = useBoardStore();

const title = ref("");
const inputRef = ref<HTMLInputElement | null>(null);
const isCreating = ref(false);

onMounted(() => {
  inputRef.value?.focus();
});

async function handleCreate() {
  const trimmed = title.value.trim();
  if (!trimmed || isCreating.value) return;

  isCreating.value = true;
  try {
    const slug = await boardStore.createBoard(trimmed);
    await boardStore.loadBoard(slug);
    await boardStore.createWeek("Categories");
    router.push(`/${slug}`);
  } catch (e) {
    console.error("Failed to create board:", e);
  } finally {
    isCreating.value = false;
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Enter") {
    handleCreate();
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50">
    <div class="w-full max-w-md px-4">
      <h1 class="mb-8 text-center text-3xl font-bold text-gray-800">Content-planner</h1>
      <div class="flex gap-2">
        <input
          ref="inputRef"
          v-model="title"
          @keydown="handleKeydown"
          type="text"
          placeholder="Название доски"
          class="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-800 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          :disabled="isCreating"
        />
        <button
          @click="handleCreate"
          :disabled="isCreating || !title.trim()"
          class="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ isCreating ? "Создание..." : "Создать" }}
        </button>
      </div>
    </div>
  </div>
</template>
