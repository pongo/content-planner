import { getDB } from "./db";
import type { TaskRecord } from "./db";

type TaskColumn = TaskRecord["column"];

export async function getTasksByStory(storyId: string, column?: TaskColumn): Promise<TaskRecord[]> {
  const db = await getDB();
  let result: TaskRecord[];
  if (column) {
    result = await db.getAllFromIndex("tasks", "by-story-column", [storyId, column]);
  } else {
    result = await db.getAllFromIndex("tasks", "by-story", storyId);
  }
  return result.sort((a, b) => a.order - b.order);
}

export async function createTask(task: Omit<TaskRecord, "order">): Promise<string> {
  const db = await getDB();
  const existing = await getTasksByStory(task.storyId, task.column);
  const order = existing.length > 0 ? existing[existing.length - 1]!.order + 1 : 0;
  const record: TaskRecord = { ...task, order };
  await db.add("tasks", record);
  return record.id;
}

export async function updateTask(
  id: string,
  updates: Partial<Omit<TaskRecord, "id">>,
): Promise<void> {
  const db = await getDB();
  const task = await db.get("tasks", id);
  if (!task) throw new Error(`Task ${id} not found`);
  Object.assign(task, updates);
  await db.put("tasks", task);
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("tasks", id);
}

export async function moveTask(
  taskId: string,
  newStoryId: string,
  newColumn: TaskColumn,
  insertIndex?: number,
): Promise<void> {
  const db = await getDB();
  const task = await db.get("tasks", taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  // Update task location and order
  task.storyId = newStoryId;
  task.column = newColumn;
  task.order = insertIndex ?? task.order;
  await db.put("tasks", task);
}

/**
 * Save all tasks in a cell atomically within a single transaction.
 */
export async function saveCellTasks(
  storyId: string,
  column: TaskColumn,
  tasks: TaskRecord[],
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("tasks", "readwrite");
  const store = tx.objectStore("tasks");

  // Put all tasks with correct metadata. Existing records are overwritten by ID.
  // Await each put to keep the transaction alive via idb's promise wrapping
  for (let i = 0; i < tasks.length; i++) {
    const t = { ...tasks[i]!, order: i, storyId, column };
    await store.put(t);
  }

  await tx.done;
}

/**
 * Save two cells atomically in a single transaction.
 * Used for cross-cell moves.
 */
export async function saveBothCellsTasks(
  sourceStoryId: string,
  sourceColumn: TaskColumn,
  sourceTasks: TaskRecord[],
  targetStoryId: string,
  targetColumn: TaskColumn,
  targetTasks: TaskRecord[],
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("tasks", "readwrite");
  const store = tx.objectStore("tasks");

  for (let i = 0; i < sourceTasks.length; i++) {
    const t = { ...sourceTasks[i]!, order: i, storyId: sourceStoryId, column: sourceColumn };
    await store.put(t);
  }
  for (let i = 0; i < targetTasks.length; i++) {
    const t = { ...targetTasks[i]!, order: i, storyId: targetStoryId, column: targetColumn };
    await store.put(t);
  }

  await tx.done;
}

/**
 * Delete all tasks in the DONE column across all stories.
 */
export async function deleteAllDoneTasks(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("tasks", "readwrite");
  const store = tx.objectStore("tasks");

  const allTasks = await store.getAll();
  const doneTaskIds = allTasks.filter((t) => t.column === "DONE").map((t) => t.id);

  await Promise.all([...doneTaskIds.map((id) => store.delete(id)), tx.done]);
}
