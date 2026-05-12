import { type WeekRecord, getDB } from "../db.ts";

export async function getWeeksByBoardDB(boardId: string): Promise<WeekRecord[]> {
  const db = await getDB();
  const weeks = await db.getAllFromIndex("weeks", "by-board", boardId);
  return weeks.sort((a, b) => a.order - b.order);
}
