<script setup lang="ts">
import { ref, watch } from "vue";
import { useBoardStore } from "@/stores/board";
import { useCardCommands } from "@/features/card/useCardCommands.ts";
import BoardTable from "@/components/BoardTable.vue";
import CardDialog from "@/components/CardDialog.vue";
import CardSelectorDialog from "@/components/CardSelectorDialog.vue";
import BoardHeader from "@/components/BoardHeader.vue";
import type { CardRecord } from "@/shared/db/db";

const props = defineProps<{ slug: string }>();

type AddCardDraft = {
  weekId: string;
  column: CardRecord["column"];
  text?: string;
};

type CardSelectorDraft = {
  weekId: string;
  column: CardRecord["column"];
};

const boardStore = useBoardStore();
const { createCard } = useCardCommands(boardStore);
const addCardDialog = useAddCardDialog(createCard);
const cardSelectorDialog = useCardSelectorDialog(addCardDialog.open);

async function addWeek(title: string) {
  await boardStore.createWeek(title);
}

function useAddCardDialog(
  createCard: (weekId: string, title: string, column: CardRecord["column"]) => Promise<void>,
) {
  const draft = ref<AddCardDraft | null>(null);
  const isSaving = ref(false);

  function open(weekId: string, column: CardRecord["column"], text?: string) {
    draft.value = { weekId, column, text };
  }

  function close() {
    draft.value = null;
    isSaving.value = false;
  }

  async function save(title: string) {
    const currentDraft = draft.value;
    if (!currentDraft || isSaving.value) return;

    isSaving.value = true;
    try {
      await createCard(currentDraft.weekId, title, currentDraft.column);
      close();
    } catch (e) {
      console.error("Failed to save card:", e);
      isSaving.value = false;
    }
  }

  return { draft, isSaving, open, close, save };
}

function useCardSelectorDialog(
  openAddCard: (weekId: string, column: CardRecord["column"], text?: string) => void,
) {
  const draft = ref<CardSelectorDraft | null>(null);

  function open(weekId: string, column: CardRecord["column"]) {
    draft.value = { weekId, column };
  }

  function close() {
    draft.value = null;
  }

  function select(title: string) {
    const currentDraft = draft.value;
    if (currentDraft) {
      openAddCard(currentDraft.weekId, currentDraft.column, title);
    }
    close();
  }

  return { draft, open, close, select };
}

function getCards(weekId: string, column: CardRecord["column"]) {
  return boardStore.getCardsForWeek(weekId, column);
}

async function handleWeekDelete(id: string) {
  await boardStore.deleteWeek(id);
}

async function handleWeekComplete(id: string) {
  await boardStore.completeWeek(id);
}

watch(
  () => props.slug,
  async (slug) => {
    await boardStore.loadBoard(slug);
  },
  { immediate: true },
);
</script>

<template>
  <div v-if="boardStore.loading" class="flex min-h-screen items-center justify-center"></div>

  <div
    v-else-if="boardStore.currentBoard"
    class="flex h-screen flex-col overflow-hidden bg-gray-50"
    data-testid="board-view"
  >
    <!-- Board Header -->
    <BoardHeader />

    <!-- Board Table -->
    <BoardTable
      :weeks="boardStore.weeks"
      :get-cards="getCards"
      @add-card="addCardDialog.open"
      @add-card-with-selector="cardSelectorDialog.open"
      @add-week="addWeek"
      @week-delete="handleWeekDelete"
      @week-complete="handleWeekComplete"
    />
  </div>

  <div v-else class="flex min-h-screen items-center justify-center" data-testid="board-not-found">
    <p class="text-gray-500">Board not found</p>
  </div>

  <!-- Select Card Title Dialog -->
  <CardSelectorDialog
    v-if="cardSelectorDialog.draft.value"
    @select="cardSelectorDialog.select"
    @close="cardSelectorDialog.close"
  />

  <!-- Add Card Dialog -->
  <CardDialog
    v-if="addCardDialog.draft.value"
    :initial-title="addCardDialog.draft.value.text"
    mode="create"
    :saving="addCardDialog.isSaving.value"
    @save="addCardDialog.save"
    @close="addCardDialog.close"
  />
</template>
