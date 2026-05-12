import { type BoardRecord, getDB } from "../db.ts";

export async function getAllBoardsDB(): Promise<BoardRecord[]> {
  const db = await getDB();
  return db.getAll("boards");
}
