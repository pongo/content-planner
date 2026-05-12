<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { Trash2, Share, Check } from "@lucide/vue";
import type { BoardRecord } from "@/db/db.ts";
import { useBoardActions } from "@/features/boards-list/useBoardActions.ts";
import { getAllBoardsDB } from "@/db/queries/get-all-boards.ts";

const router = useRouter();
const { exportBoard, deleteBoard, isExported } = useBoardActions();

const boards = ref<BoardRecord[]>([]);
const loading = ref(true);

onMounted(async () => {
  boards.value = await getAllBoardsDB();
  loading.value = false;
});

function navigateToCreate() {
  router.push("/new");
}

async function handleDelete(board: BoardRecord) {
  await deleteBoard(board, () => {
    boards.value = boards.value.filter((b) => b.id !== board.id);
  });
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50">
    <div v-if="!loading" class="w-full max-w-2xl p-4">
      <h1 class="mb-8 text-center text-3xl font-bold text-gray-800">Content-planner</h1>

      <div
        v-if="boards.length > 0"
        data-testid="boards-list"
        class="rounded-lg border border-gray-200 bg-white shadow-sm"
      >
        <ul>
          <li
            v-for="board in boards"
            :key="board.id"
            data-testid="board-list-item"
            class="group flex items-center gap-2 border-b border-gray-100 px-4 py-3 transition-colors last:border-b-0"
          >
            <RouterLink
              :to="`/${board.slug}`"
              data-testid="board-link"
              class="flex-1 truncate text-sm text-gray-700 hover:text-gray-900 hover:underline"
            >
              {{ board.title }}
            </RouterLink>
            <button
              @click="exportBoard(board)"
              data-testid="export-board-button"
              class="shrink-0 rounded p-1.5 text-gray-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-green-50 hover:text-green-600"
              :title="isExported(board.id) ? 'Скопировано!' : 'Экспортировать как Markdown'"
            >
              <Check v-if="isExported(board.id)" class="size-4" />
              <Share v-else class="size-4" />
            </button>
            <button
              @click="handleDelete(board)"
              data-testid="delete-board-button"
              class="shrink-0 rounded p-1.5 text-gray-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
              title="Удалить доску"
            >
              <Trash2 class="size-4" />
            </button>
          </li>
        </ul>
      </div>

      <div class="mt-6 flex justify-center">
        <button
          @click="navigateToCreate"
          data-testid="create-board-button"
          class="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          Создать новую доску
        </button>
      </div>
    </div>
  </div>
</template>
