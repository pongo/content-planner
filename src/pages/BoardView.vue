<script setup lang="ts">
import { ref, watch } from "vue";
import { useBoardStore } from "@/stores/board";
import { useCardCommands } from "@/features/card-edit/useCardCommands";
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

async function addWeek(title: string) {
  await boardStore.createWeek(title);
}

const addCardDraft = ref<AddCardDraft | null>(null);
const isAddingCard = ref(false);

function openAddCard(weekId: string, column: CardRecord["column"], text?: string) {
  addCardDraft.value = { weekId, column, text };
}

function closeAddCard() {
  addCardDraft.value = null;
  isAddingCard.value = false;
}

async function handleCreateCard(title: string) {
  const draft = addCardDraft.value;
  if (!draft || isAddingCard.value) return;

  isAddingCard.value = true;
  try {
    await createCard(draft.weekId, title, draft.column);
    closeAddCard();
  } catch (e) {
    console.error("Failed to save card:", e);
    isAddingCard.value = false;
  }
}

const cardSelectorDraft = ref<CardSelectorDraft | null>(null);

function openSelector(weekId: string, column: CardRecord["column"]) {
  cardSelectorDraft.value = { weekId, column };
}

function handleSelectorSelect(title: string) {
  const draft = cardSelectorDraft.value;
  if (draft) {
    openAddCard(draft.weekId, draft.column, title);
  }
  closeSelector();
}

function closeSelector() {
  cardSelectorDraft.value = null;
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
      @add-card="openAddCard"
      @add-card-with-selector="openSelector"
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
    v-if="cardSelectorDraft"
    @select="handleSelectorSelect"
    @close="closeSelector"
  />

  <!-- Add Card Dialog -->
  <CardDialog
    v-if="addCardDraft"
    :initial-title="addCardDraft.text"
    mode="create"
    :saving="isAddingCard"
    @save="handleCreateCard"
    @close="closeAddCard"
  />
</template>
