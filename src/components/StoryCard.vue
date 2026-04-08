<script setup lang="ts">
import { ref } from "vue";
import { X } from "@lucide/vue";
import StoryForm from "@/components/StoryForm.vue";
import type { StoryRecord } from "@/db/db";

const props = defineProps<{ story: StoryRecord }>();
const emit = defineEmits<{
  titleUpdate: [id: string, title: string];
  delete: [id: string];
}>();

const isEditing = ref(false);

function startEditing() {
  isEditing.value = true;
}

function handleDelete() {
  if (confirm("Delete this story and all its tasks?")) {
    emit("delete", props.story.id);
  }
}
</script>

<template>
  <div class="group relative flex h-full items-center justify-center">
    <!-- Delete button on hover (hidden while editing) -->
    <button
      v-if="!isEditing"
      @click.stop="handleDelete"
      class="absolute top-1 right-1 hidden rounded p-0.5 text-gray-400 group-hover:block hover:text-red-500"
      title="Delete Story"
    >
      <X class="h-3.5 w-3.5" />
    </button>

    <!-- Edit mode -->
    <StoryForm
      v-if="isEditing"
      :initial-title="story.title"
      @submit="
        (title) => {
          emit('titleUpdate', story.id, title);
          isEditing = false;
        }
      "
      @cancel="isEditing = false"
    />

    <!-- Story Title -->
    <div v-else class="text-center text-sm" @dblclick="startEditing" title="Double click to edit">
      {{ story.title }}
    </div>
  </div>
</template>
