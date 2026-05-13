import { getDB } from "@/db/db";
import type { BoardRecord } from "@/db/db";

export async function updateBoardDB(
  id: string,
  updates: Partial<Omit<BoardRecord, "id" | "createdAt">>,
): Promise<void> {
  const db = await getDB();
  const board = await db.get("boards", id);
  if (!board) throw new Error(`Board ${id} not found`);
  Object.assign(board, updates);
  await db.put("boards", board);
}
