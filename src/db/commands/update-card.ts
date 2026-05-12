import { type CardRecord, getDB } from "../db.ts";

export async function updateCardDB(
  id: string,
  updates: Partial<Omit<CardRecord, "id">>,
): Promise<void> {
  const db = await getDB();
  const card = await db.get("cards", id);
  if (!card) throw new Error(`Card ${id} not found`);
  Object.assign(card, updates);
  await db.put("cards", card);
}
