import type { CardRecord } from "../db.ts";
import { getCardsForWeeksDB } from "./get-cards-for-weeks.ts";
import { getWeeksByBoardDB } from "./get-weeks-by-board.ts";

export async function getAllCardsForBoardDB(boardId: string): Promise<CardRecord[]> {
  const weeks = await getWeeksByBoardDB(boardId);
  return getCardsForWeeksDB(weeks);
}
