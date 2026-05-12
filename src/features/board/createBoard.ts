import { createBoardDB } from "@/db/commands/create-board.ts";
import { createWeekDB } from "@/db/commands/create-week.ts";
import { requestPersistentStorage } from "@/db/db.ts";
import { getAllBoardsDB } from "@/db/queries/get-all-boards.ts";
import { generateUniqueSlug } from "@/shared/utils/slug.ts";

export async function createBoardWithInitialWeek(title: string): Promise<string> {
  const id = crypto.randomUUID();
  const existingBoards = await getAllBoardsDB();
  const existingSlugs = new Set(existingBoards.map((board) => board.slug));
  const slug = generateUniqueSlug(title, existingSlugs);

  await createBoardDB({ id, title, slug });
  await createWeekDB({ id: crypto.randomUUID(), boardId: id, title: "Categories" });
  await requestPersistentStorage();

  return slug;
}
