import { type BoardRecord, getDB } from "../db.ts";

export async function createBoardDB(board: Omit<BoardRecord, "createdAt">): Promise<string> {
  const db = await getDB();
  const record: BoardRecord = { ...board, createdAt: Date.now() };
  await db.add("boards", record);
  return record.id;
}
