import { type CardRecord, getDB } from "../db.ts";
import { getCardsByWeekDB } from "../queries/get-cards-by-week.ts";

export async function createCardDB(card: Omit<CardRecord, "order">): Promise<string> {
  const db = await getDB();
  const existing = await getCardsByWeekDB(card.weekId, card.column);
  const order = existing.length > 0 ? existing[existing.length - 1]!.order + 1 : 0;
  const record: CardRecord = { ...card, order };
  await db.add("cards", record);
  return record.id;
}
