import { type WeekRecord, getDB } from "../db.ts";
import { getWeeksByBoardDB } from "../queries/get-weeks-by-board.ts";

export async function createWeekDB(week: Omit<WeekRecord, "order">): Promise<string> {
  const db = await getDB();
  const existing = await getWeeksByBoardDB(week.boardId);
  const order = existing.length > 0 ? existing[existing.length - 1]!.order + 1 : 0;
  const record: WeekRecord = { ...week, order };
  await db.add("weeks", record);
  return record.id;
}
