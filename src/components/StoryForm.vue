<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { Check, X } from "@lucide/vue";

const props = defineProps<{
  initialTitle?: string;
}>();

const emit = defineEmits<{
  submit: [title: string];
  cancel: [];
}>();

const title = ref(props.initialTitle ?? "");
const inputRef = ref<HTMLInputElement | null>(null);
let submitted = false;

onMounted(async () => {
  await nextTick();
  inputRef.value?.focus();
});

function handleSubmit() {
  if (submitted) return;
  const trimmed = title.value.trim();
  if (!trimmed) {
    emit("cancel");
    return;
  }
  submitted = true;
  emit("submit", trimmed);
}

function handleCancel() {
  emit("cancel");
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Enter") {
    e.preventDefault();
    handleSubmit();
  } else if (e.key === "Escape") {
    handleCancel();
  }
}
</script>

<template>
  <div class="flex w-full flex-col gap-1 p-2">
    <input
      ref="inputRef"
      v-model="title"
      @keydown="handleKeydown"
      @blur="handleSubmit"
      type="text"
      class="w-full rounded-sm border border-blue-400 px-2 py-1.5 text-sm outline-none"
    />
    <div class="flex gap-1">
      <button
        @click.stop="handleSubmit"
        class="flex flex-1 items-center justify-center rounded-sm bg-green-600 py-1 text-white hover:bg-green-700"
      >
        <Check class="h-4 w-4" />
      </button>
      <button
        @click.stop="handleCancel"
        class="flex flex-1 items-center justify-center rounded-sm bg-gray-500 py-1 text-white hover:bg-gray-600"
      >
        <X class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
