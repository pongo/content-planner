import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { BoardRecord, StoryRecord, TaskRecord } from "@/db/db";
import * as boardsApi from "@/db/boards";
import * as storiesApi from "@/db/stories";
import * as tasksApi from "@/db/tasks";
import { generateUniqueSlug } from "@/utils/slug";

const COLUMNS: TaskRecord["column"][] = ["TO_DO", "IN_PROGRESS", "VERIFY", "DONE"];

export const useBoardStore = defineStore("board", () => {
  const currentBoard = ref<BoardRecord | null>(null);
  const stories = ref<StoryRecord[]>([]);
  const tasks = ref<TaskRecord[]>([]);
  const loading = ref(false);

  const columns = computed(() => COLUMNS);

  function getTasksForStory(storyId: string, column: TaskRecord["column"]) {
    return tasks.value
      .filter((t) => t.storyId === storyId && t.column === column)
      .sort((a, b) => a.order - b.order);
  }

  async function loadBoard(slug: string) {
    loading.value = true;
    try {
      const board = await boardsApi.getBoardBySlug(slug);
      if (!board) throw new Error("Board not found");
      currentBoard.value = board;

      const boardId = board.id;
      const [storiesList, allTasks] = await Promise.all([
        storiesApi.getStoriesByBoard(boardId),
        loadAllTasksForBoard(boardId),
      ]);
      stories.value = storiesList;
      tasks.value = allTasks;
    } finally {
      loading.value = false;
    }
  }

  async function loadAllTasksForBoard(boardId: string): Promise<TaskRecord[]> {
    const storiesList = await storiesApi.getStoriesByBoard(boardId);
    const allTasks: TaskRecord[] = [];
    // Load tasks for all stories in parallel
    const taskPromises = storiesList.map((story) => tasksApi.getTasksByStory(story.id));
    const results = await Promise.all(taskPromises);
    for (const result of results) {
      allTasks.push(...result);
    }
    return allTasks;
  }

  async function createBoard(title: string): Promise<string> {
    const id = crypto.randomUUID();
    const existingBoards = await boardsApi.getAllBoards();
    const existingSlugs = new Set(existingBoards.map((b) => b.slug));
    const slug = generateUniqueSlug(title, existingSlugs);

    await boardsApi.createBoard({ id, title, slug });

    return slug;
  }

  async function updateBoardTitle(title: string): Promise<void> {
    if (!currentBoard.value) return;
    const previousTitle = currentBoard.value.title;

    // Optimistic update
    currentBoard.value.title = title;

    try {
      await boardsApi.updateBoard(currentBoard.value.id, { title });
    } catch (error) {
      // Rollback on error
      currentBoard.value.title = previousTitle;
      throw error;
    }
  }

  async function deleteCurrentBoard(): Promise<void> {
    if (!currentBoard.value) return;
    await boardsApi.deleteBoard(currentBoard.value.id);
    currentBoard.value = null;
    stories.value = [];
    tasks.value = [];
  }

  async function createStory(title: string): Promise<void> {
    if (!currentBoard.value) return;
    const id = crypto.randomUUID();
    await storiesApi.createStory({ id, boardId: currentBoard.value.id, title });
    const story = await storiesApi
      .getStoriesByBoard(currentBoard.value.id)
      .then((s) => s.find((x) => x.id === id));
    if (story) stories.value.push(story);
  }

  async function updateStoryTitle(storyId: string, title: string): Promise<void> {
    const story = stories.value.find((s) => s.id === storyId);
    const previousTitle = story?.title;

    // Optimistic update
    if (story) story.title = title;

    try {
      await storiesApi.updateStory(storyId, { title });
    } catch (error) {
      // Rollback on error
      if (story && previousTitle !== undefined) {
        story.title = previousTitle;
      }
      throw error;
    }
  }

  async function deleteStory(storyId: string): Promise<void> {
    await storiesApi.deleteStory(storyId);
    stories.value = stories.value.filter((s) => s.id !== storyId);
    tasks.value = tasks.value.filter((t) => t.storyId !== storyId);
  }

  async function createTask(storyId: string, title: string, assignee: string): Promise<void> {
    const id = crypto.randomUUID();
    await tasksApi.createTask({
      id,
      storyId,
      column: "TO_DO",
      title,
      assignee,
    });
    const task = await tasksApi
      .getTasksByStory(storyId, "TO_DO")
      .then((t) => t.find((x) => x.id === id));
    if (task) tasks.value.push(task);
  }

  async function updateTask(
    taskId: string,
    updates: {
      title?: string;
      assignee?: string;
      storyId?: string;
      column?: TaskRecord["column"];
      order?: number;
    },
  ): Promise<void> {
    await tasksApi.updateTask(taskId, updates);
    const task = tasks.value.find((t) => t.id === taskId);
    if (task) {
      if (updates.title !== undefined) task.title = updates.title;
      if (updates.assignee !== undefined) task.assignee = updates.assignee;
      if (updates.storyId !== undefined) task.storyId = updates.storyId;
      if (updates.column !== undefined) task.column = updates.column;
      if (updates.order !== undefined) task.order = updates.order;
    }
  }

  async function deleteTask(taskId: string): Promise<void> {
    await tasksApi.deleteTask(taskId);
    tasks.value = tasks.value.filter((t) => t.id !== taskId);
  }

  async function deleteAllDoneTasks(): Promise<void> {
    await tasksApi.deleteAllDoneTasks();
    tasks.value = tasks.value.filter((t) => t.column !== "DONE");
  }

  async function moveTask(
    taskId: string,
    newStoryId: string,
    newColumn: TaskRecord["column"],
    targetIndex?: number,
  ): Promise<void> {
    if (!taskId) return;

    // Get tasks in the target cell to compute correct order
    const targetTasks = getTasksForStory(newStoryId, newColumn);
    const index = targetIndex ?? targetTasks.length;

    // Save the moved task with its new location and order
    await tasksApi.moveTask(taskId, newStoryId, newColumn, index);

    // Reload all tasks so cellLists watcher picks up the changes
    if (currentBoard.value) {
      const refreshed = await loadAllTasksForBoard(currentBoard.value.id);
      tasks.value = refreshed;
    }
  }

  /**
   * Atomically save all tasks in a cell.
   * Used by VueDraggable @change handler.
   */
  async function saveCell(
    storyId: string,
    column: TaskRecord["column"],
    cellTasks: TaskRecord[],
  ): Promise<void> {
    await tasksApi.saveCellTasks(storyId, column, cellTasks);

    // Reload all tasks so cellLists watcher picks up the changes
    if (currentBoard.value) {
      const refreshed = await loadAllTasksForBoard(currentBoard.value.id);
      tasks.value = refreshed;
    }
  }

  /**
   * Atomically save both cells in a single transaction.
   * Used for cross-cell moves.
   */
  async function saveBothCells(
    sourceStoryId: string,
    sourceColumn: TaskRecord["column"],
    sourceTasks: TaskRecord[],
    targetStoryId: string,
    targetColumn: TaskRecord["column"],
    targetTasks: TaskRecord[],
  ): Promise<void> {
    await tasksApi.saveBothCellsTasks(
      sourceStoryId,
      sourceColumn,
      sourceTasks,
      targetStoryId,
      targetColumn,
      targetTasks,
    );

    // Reload all tasks so cellLists watcher picks up the changes
    if (currentBoard.value) {
      const refreshed = await loadAllTasksForBoard(currentBoard.value.id);
      tasks.value = refreshed;
    }
  }

  async function loadAllBoards(): Promise<BoardRecord[]> {
    return boardsApi.getAllBoards();
  }

  return {
    currentBoard,
    stories,
    tasks,
    loading,
    columns,
    getTasksForStory,
    loadBoard,
    createBoard,
    updateBoardTitle,
    deleteCurrentBoard,
    createStory,
    updateStoryTitle,
    deleteStory,
    createTask,
    updateTask,
    deleteTask,
    deleteAllDoneTasks,
    moveTask,
    saveCell,
    saveBothCells,
    loadAllBoards,
  };
});
