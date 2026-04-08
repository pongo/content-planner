<script setup lang="ts">
import { ref, watch, reactive } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { Trash2, Share, Check } from "@lucide/vue";
import { useBoardStore } from "@/stores/board";
import type { BoardRecord } from "@/db/db";
import { exportBoardToMarkdown } from "@/utils/exportMarkdown";

const { open } = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const boardStore = useBoardStore();
const router = useRouter();

const boards = ref<BoardRecord[]>([]);
const exportedBoards = reactive<Record<string, boolean>>({});

watch(
  () => open,
  async (val) => {
    if (val) boards.value = await boardStore.loadAllBoards();
  },
);

function navigateToCreate() {
  router.push("/new");
  emit("close");
}

async function handleExport(board: BoardRecord) {
  const markdown = await exportBoardToMarkdown(board);
  await navigator.clipboard.writeText(markdown);
  exportedBoards[board.id] = true;
  setTimeout(() => {
    exportedBoards[board.id] = false;
  }, 2000);
}

async function deleteBoard(board: BoardRecord) {
  if (!confirm(`Delete board "${board.title}"?`)) return;
  const isCurrent = boardStore.currentBoard?.id === board.id;
  const boardsApi = await import("@/db/boards");
  await boardsApi.deleteBoard(board.id);
  boards.value = boards.value.filter((b) => b.id !== board.id);
  if (isCurrent) {
    emit("close");
    router.push("/new");
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="fixed inset-0 z-50 flex">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/30" @click="emit('close')" />

        <!-- Drawer panel -->
        <div class="relative flex w-80 flex-col border-r border-gray-200 bg-white shadow-xl">
          <!-- Drawer header -->
          <div class="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
            <h2 class="flex-1 text-lg font-semibold text-gray-800">
              <RouterLink to="/" class="hover:underline">Content-planner</RouterLink>
            </h2>
            <a
              href="https://github.com/pongo/content-planner"
              target="_blank"
              rel="noopener noreferrer"
              class="rounded p-1 text-gray-500 hover:bg-gray-100"
              title="GitHub"
            >
              <svg class="size-4" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <title>GitHub</title>
                <path
                  d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                />
              </svg>
            </a>
          </div>

          <!-- Board list -->
          <ul class="flex-1 overflow-y-auto">
            <li v-for="board in boards" :key="board.id">
              <div
                class="group flex items-center gap-2 px-4 py-2 transition-colors hover:bg-gray-50"
                :class="{
                  'bg-blue-50 font-semibold text-blue-700':
                    boardStore.currentBoard?.id === board.id,
                }"
              >
                <RouterLink
                  :to="`/${board.slug}`"
                  @click="emit('close')"
                  class="flex-1 truncate text-sm text-gray-700 hover:text-gray-900"
                >
                  {{ board.title }}
                </RouterLink>
                <button
                  @click="handleExport(board)"
                  class="shrink-0 rounded p-1 text-gray-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-green-50 hover:text-green-600"
                  :title="exportedBoards[board.id] ? 'Copied!' : 'Export as Markdown'"
                >
                  <Check v-if="exportedBoards[board.id]" class="size-4" />
                  <Share v-else class="size-4" />
                </button>
                <button
                  @click="deleteBoard(board)"
                  class="shrink-0 rounded p-1 text-gray-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                  title="Delete board"
                >
                  <Trash2 class="size-4" />
                </button>
              </div>
            </li>
          </ul>

          <!-- Create board button -->
          <div class="flex justify-center border-b border-gray-200 px-4 py-2">
            <button
              @click="navigateToCreate"
              class="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              title="Create new board"
            >
              Create new board
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
</style>
