import { getDB } from "@/db/db";
import type { BoardRecord } from "@/db/db";

export async function getAllBoards(): Promise<BoardRecord[]> {
  const db = await getDB();
  return db.getAll("boards");
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
  const tx = db.transaction(["boards", "weeks", "cards"], "readwrite");
  const boardsStore = tx.objectStore("boards");
  const weeksStore = tx.objectStore("weeks");
  const cardsStore = tx.objectStore("cards");

  // Get all weeks for this board
  const weekIds = await weeksStore.index("by-board").getAllKeys(id);

  // Get all cards for all weeks
  const allCardIds: string[] = [];
  for (const weekId of weekIds) {
    const cardIds = await cardsStore.index("by-week").getAllKeys(weekId);
    allCardIds.push(...cardIds);
  }

  // Delete everything in parallel, wait for tx to commit
  await Promise.all([
    ...allCardIds.map((cardId) => cardsStore.delete(cardId)),
    ...weekIds.map((weekId) => weeksStore.delete(weekId)),
    boardsStore.delete(id),
    tx.done,
  ]);
}
