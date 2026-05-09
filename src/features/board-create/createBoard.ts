import { requestPersistentStorage } from "@/shared/db/db";
import { createBoard, getAllBoards } from "@/entities/board";
import { createWeek } from "@/entities/week";
import { generateUniqueSlug } from "@/shared/utils/slug";

export async function createBoardWithInitialWeek(title: string): Promise<string> {
  const id = crypto.randomUUID();
  const existingBoards = await getAllBoards();
  const existingSlugs = new Set(existingBoards.map((board) => board.slug));
  const slug = generateUniqueSlug(title, existingSlugs);

  await createBoard({ id, title, slug });
  await createWeek({ id: crypto.randomUUID(), boardId: id, title: "Categories" });
  await requestPersistentStorage();

  return slug;
}
