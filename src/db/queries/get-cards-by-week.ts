import { type CardColumn, type CardRecord, getDB } from "../db.ts";

export async function getCardsByWeekDB(weekId: string, column?: CardColumn): Promise<CardRecord[]> {
  const db = await getDB();
  let result: CardRecord[];
  if (column) {
    result = await db.getAllFromIndex("cards", "by-week-column", [weekId, column]);
  } else {
    result = await db.getAllFromIndex("cards", "by-week", weekId);
  }
  return result.toSorted((a, b) => a.title.localeCompare(b.title));
}
