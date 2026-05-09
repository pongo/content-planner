<script setup lang="ts">
import { ref, computed } from "vue";
import { useBoardStore } from "@/stores/board";
import { useCardCommands } from "@/features/card/useCardCommands.ts";
import { generatePastelColor } from "@/shared/utils/pastelColor";
import CardDialog from "@/components/CardDialog.vue";
import { X, Copy } from "@lucide/vue";
import type { CardRecord } from "@/shared/db/db";
import { parseTitle } from "@/shared/utils/card-title";

// import { useAppVariants } from "@/variants.ts";
// const { variants } = useAppVariants();

const props = defineProps<{ card: CardRecord }>();

const boardStore = useBoardStore();
const { deleteCard, updateCard } = useCardCommands(boardStore);
const isEditing = ref(false);
const isSaving = ref(false);
const isHovered = ref(false);

const colors = computed(() => {
  const base = generatePastelColor(props.card.title);
  return { base, accent: `color-mix(in srgb, ${base}, black 15%)` };
});

const titleInfo = computed(() => parseTitle(props.card.title));

const isDuplicate = computed(() => {
  if (props.card.title.startsWith("-")) return false;
  return boardStore.duplicateFirstLines.has(titleInfo.value.firstLine);
});

function handleDelete() {
  if (confirm("Удалить?")) {
    deleteCard(props.card.id);
  }
}

function startEdit() {
  isEditing.value = true;
}

function closeEdit() {
  isEditing.value = false;
}

async function handleUpdateCard(title: string) {
  if (isSaving.value) return;

  isSaving.value = true;
  try {
    await updateCard(props.card.id, { title });
    closeEdit();
  } catch (e) {
    console.error("Failed to save card:", e);
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div
    class="group relative flex w-30 flex-col overflow-hidden rounded-[1px] border-0 border-black/10 shadow-sm transition-shadow select-none"
    :style="{ backgroundColor: colors.base, minHeight: 'var(--card-card-height)' }"
    :data-card-id="card.id"
    data-testid="board-card"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @dblclick.stop="startEdit"
  >
    <div class="relative flex flex-1 flex-col items-center justify-center py-1.25">
      <!-- Delete button on hover -->
      <button
        v-show="isHovered"
        @click.stop="handleDelete"
        class="absolute top-0 right-0 rounded p-0.5 text-gray-400 hover:text-red-500"
        title="Удалить"
        data-testid="delete-card-button"
      >
        <X class="h-2.5 w-3" />
      </button>

      <!-- Duplicate icon -->
      <div
        v-if="isDuplicate"
        class="absolute top-0.5 left-1 text-gray-500/50"
        title="У карточки есть дубликат"
      >
        <Copy class="h-2.5 w-2.5" />
      </div>

      <!-- Title -->
      <div class="w-full text-center">
        <p class="px-1 text-xs leading-tight font-semibold text-gray-800">
          {{ titleInfo.firstLine }}
        </p>
        <template v-if="titleInfo.isMultiline">
          <hr
            class="my-1 border-black/10"
            :class="{ 'border-t-[3px] border-double': titleInfo.isPermanent }"
          />
          <p class="px-1 text-xs leading-tight whitespace-pre-wrap text-gray-800 italic">
            {{ titleInfo.remainingLines }}
          </p>
        </template>
      </div>
    </div>

    <!-- Edit Dialog -->
    <CardDialog
      v-if="isEditing"
      mode="edit"
      :initial-title="card.title"
      :saving="isSaving"
      @save="handleUpdateCard"
      @close="closeEdit"
    />
  </div>
</template>
