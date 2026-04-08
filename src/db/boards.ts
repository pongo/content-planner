import { getDB } from "./db";
import type { BoardRecord } from "./db";

export async function getAllBoards(): Promise<BoardRecord[]> {
  const db = await getDB();
  return db.getAll("boards");
}

export async function getBoard(id: string): Promise<BoardRecord | undefined> {
  const db = await getDB();
  return db.get("boards", id);
}

export async function getBoardBySlug(slug: string): Promise<BoardRecord | undefined> {
  const db = await getDB();
  return db.getFromIndex("boards", "by-slug", slug);
}

export async function createBoard(board: Omit<BoardRecord, "createdAt">): Promise<string> {
  const db = await getDB();
  const record: BoardRecord = { ...board, createdAt: Date.now() };
  await db.add("boards", record);
  return record.id;
}

export async function updateBoard(
  id: string,
  updates: Partial<Omit<BoardRecord, "id" | "createdAt">>,
): Promise<void> {
  const db = await getDB();
  const board = await db.get("boards", id);
  if (!board) throw new Error(`Board ${id} not found`);
  Object.assign(board, updates);
  await db.put("boards", board);
}

export async function deleteBoard(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["boards", "weeks", "tasks"], "readwrite");
  const boardsStore = tx.objectStore("boards");
  const weeksStore = tx.objectStore("weeks");
  const tasksStore = tx.objectStore("tasks");

  // Get all weeks for this board
  const weekIds = await weeksStore.index("by-board").getAllKeys(id);

  // Get all tasks for all weeks
  const allTaskIds: string[] = [];
  for (const weekId of weekIds) {
    const taskIds = await tasksStore.index("by-week").getAllKeys(weekId);
    allTaskIds.push(...taskIds);
  }

  // Delete everything in parallel, wait for tx to commit
  await Promise.all([
    ...allTaskIds.map((taskId) => tasksStore.delete(taskId)),
    ...weekIds.map((weekId) => weeksStore.delete(weekId)),
    boardsStore.delete(id),
    tx.done,
  ]);
}
