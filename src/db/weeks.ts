import { getDB } from "./db";
import type { WeekRecord } from "./db";

export async function getWeeksByBoard(boardId: string): Promise<WeekRecord[]> {
  const db = await getDB();
  const weeks = await db.getAllFromIndex("weeks", "by-board", boardId);
  return weeks.sort((a, b) => a.order - b.order);
}

export async function createWeek(week: Omit<WeekRecord, "order">): Promise<string> {
  const db = await getDB();
  const existing = await getWeeksByBoard(week.boardId);
  const order = existing.length > 0 ? existing[existing.length - 1]!.order + 1 : 0;
  const record: WeekRecord = { ...week, order };
  await db.add("weeks", record);
  return record.id;
}

export async function updateWeek(
  id: string,
  updates: Partial<Omit<WeekRecord, "id" | "boardId">>,
): Promise<void> {
  const db = await getDB();
  const week = await db.get("weeks", id);
  if (!week) throw new Error(`Week ${id} not found`);
  Object.assign(week, updates);
  await db.put("weeks", week);
}

export async function deleteWeek(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["weeks", "tasks"], "readwrite");
  const weeksStore = tx.objectStore("weeks");
  const tasksStore = tx.objectStore("tasks");

  // Get all tasks associated with the week
  const taskIds = await tasksStore.index("by-week").getAllKeys(id);

  // Delete all tasks and the week in parallel, wait for tx to commit
  await Promise.all([
    ...taskIds.map((taskId) => tasksStore.delete(taskId)),
    weeksStore.delete(id),
    tx.done,
  ]);
}

export async function completeWeek(weekId: string, targetWeekId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["weeks", "tasks"], "readwrite");
  const weeksStore = tx.objectStore("weeks");
  const tasksStore = tx.objectStore("tasks");

  // Get all tasks associated with the source week
  const taskIds = await tasksStore.index("by-week").getAllKeys(weekId);

  // Get target tasks to determine order
  const targetTasks = await tasksStore.index("by-week").getAll(targetWeekId);
  let nextOrder = targetTasks.length;

  // Move tasks and update their properties
  for (const taskId of taskIds) {
    const task = await tasksStore.get(taskId);
    if (task) {
      task.weekId = targetWeekId;
      task.column = "ALL";
      task.order = nextOrder++;
      await tasksStore.put(task);
    }
  }

  // Delete the source week
  await weeksStore.delete(weekId);

  await tx.done;
}
