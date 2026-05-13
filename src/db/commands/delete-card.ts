import { getDB } from "../db.ts";

export async function deleteCardDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("cards", id);
}
