import { type BoardRecord, getDB } from "../db.ts";

export async function getBoardBySlugDB(slug: string): Promise<BoardRecord | undefined> {
  const db = await getDB();
  return db.getFromIndex("boards", "by-slug", slug);
}
