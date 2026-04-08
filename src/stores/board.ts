import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { BoardRecord, WeekRecord, TaskRecord } from "@/db/db";
import * as boardsApi from "@/db/boards";
import * as weeksApi from "@/db/weeks.ts";
import * as tasksApi from "@/db/tasks";
import { generateUniqueSlug } from "@/utils/slug";

const COLUMNS: TaskRecord["column"][] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export const useBoardStore = defineStore("board", () => {
  const currentBoard = ref<BoardRecord | null>(null);
  const weeks = ref<WeekRecord[]>([]);
  const tasks = ref<TaskRecord[]>([]);
  const loading = ref(false);

  const columns = computed(() => COLUMNS);

  function getTasksForWeek(weekId: string, column: TaskRecord["column"]) {
    return tasks.value
      .filter((t) => t.weekId === weekId && t.column === column)
      .toSorted((a, b) => a.title.localeCompare(b.title));
  }

  async function loadBoard(slug: string) {
    loading.value = true;
    try {
      const board = await boardsApi.getBoardBySlug(slug);
      if (!board) throw new Error("Board not found");
      currentBoard.value = board;

      const boardId = board.id;
      const [weeksList, allTasks] = await Promise.all([
        weeksApi.getWeeksByBoard(boardId),
        loadAllTasksForBoard(boardId),
      ]);
      weeks.value = weeksList;
      tasks.value = allTasks;
    } finally {
      loading.value = false;
    }
  }

  async function loadAllTasksForBoard(boardId: string): Promise<TaskRecord[]> {
    const weeksList = await weeksApi.getWeeksByBoard(boardId);
    const allTasks: TaskRecord[] = [];
    // Load tasks for all weeks in parallel
    const taskPromises = weeksList.map((week) => tasksApi.getTasksByWeek(week.id));
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
    weeks.value = [];
    tasks.value = [];
  }

  async function createWeek(title: string): Promise<void> {
    if (!currentBoard.value) return;
    const id = crypto.randomUUID();
    await weeksApi.createWeek({ id, boardId: currentBoard.value.id, title });
    const week = await weeksApi
      .getWeeksByBoard(currentBoard.value.id)
      .then((s) => s.find((x) => x.id === id));
    if (week) weeks.value.push(week);
  }

  async function deleteWeek(weekId: string): Promise<void> {
    await weeksApi.deleteWeek(weekId);
    weeks.value = weeks.value.filter((s) => s.id !== weekId);
    tasks.value = tasks.value.filter((t) => t.weekId !== weekId);
  }

  async function completeWeek(weekId: string): Promise<void> {
    const categoriesWeek = weeks.value.find((s) => s.title === "Categories");
    if (!categoriesWeek) return;

    await weeksApi.completeWeek(weekId, categoriesWeek.id);

    // Refresh store
    if (currentBoard.value) {
      const boardId = currentBoard.value.id;
      const [weeksList, allTasks] = await Promise.all([
        weeksApi.getWeeksByBoard(boardId),
        loadAllTasksForBoard(boardId),
      ]);
      weeks.value = weeksList;
      tasks.value = allTasks;
    }
  }

  async function createTask(
    weekId: string,
    title: string,
    column: TaskRecord["column"],
  ): Promise<void> {
    const id = crypto.randomUUID();
    await tasksApi.createTask({
      id,
      weekId,
      column,
      title,
    });
    const task = await tasksApi
      .getTasksByWeek(weekId, column)
      .then((t) => t.find((x) => x.id === id));
    if (task) tasks.value.push(task);
  }

  async function updateTask(
    taskId: string,
    updates: {
      title?: string;
      weekId?: string;
      column?: TaskRecord["column"];
      order?: number;
    },
  ): Promise<void> {
    await tasksApi.updateTask(taskId, updates);
    const task = tasks.value.find((t) => t.id === taskId);
    if (task) {
      if (updates.title !== undefined) task.title = updates.title;
      if (updates.weekId !== undefined) task.weekId = updates.weekId;
      if (updates.column !== undefined) task.column = updates.column;
      if (updates.order !== undefined) task.order = updates.order;
    }
  }

  async function deleteTask(taskId: string): Promise<void> {
    await tasksApi.deleteTask(taskId);
    tasks.value = tasks.value.filter((t) => t.id !== taskId);
  }

  async function moveTask(
    taskId: string,
    newWeekId: string,
    newColumn: TaskRecord["column"],
    targetIndex?: number,
  ): Promise<void> {
    if (!taskId) return;

    // Get tasks in the target cell to compute correct order
    const targetTasks = getTasksForWeek(newWeekId, newColumn);
    const index = targetIndex ?? targetTasks.length;

    // Save the moved task with its new location and order
    await tasksApi.moveTask(taskId, newWeekId, newColumn, index);

    // Reload all tasks so cellLists watcher picks up the changes
    if (currentBoard.value) {
      const refreshed = await loadAllTasksForBoard(currentBoard.value.id);
      tasks.value = refreshed;
    }
  }

  async function saveCell(
    weekId: string,
    column: TaskRecord["column"],
    cellTasks: TaskRecord[],
  ): Promise<void> {
    await tasksApi.saveCellTasks(weekId, column, cellTasks);

    // Reload all tasks so cellLists watcher picks up the changes
    if (currentBoard.value) {
      const refreshed = await loadAllTasksForBoard(currentBoard.value.id);
      tasks.value = refreshed;
    }
  }

  async function saveBothCells(
    sourceWeekId: string,
    sourceColumn: TaskRecord["column"],
    sourceTasks: TaskRecord[],
    targetWeekId: string,
    targetColumn: TaskRecord["column"],
    targetTasks: TaskRecord[],
  ): Promise<void> {
    await tasksApi.saveBothCellsTasks(
      sourceWeekId,
      sourceColumn,
      sourceTasks,
      targetWeekId,
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
    weeks,
    tasks,
    loading,
    columns,
    getTasksForWeek,
    loadBoard,
    createBoard,
    updateBoardTitle,
    deleteCurrentBoard,
    createWeek,
    deleteWeek,
    completeWeek,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    saveCell,
    saveBothCells,
    loadAllBoards,
  };
});
