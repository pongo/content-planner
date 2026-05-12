import type { CardRecord, WeekRecord } from "@/db/db";
import { getWeeksByBoard } from "@/entities/week";
import { getCardsByWeek } from "@/entities/card";

export async function loadAllCardsForBoard(boardId: string): Promise<CardRecord[]> {
  const weeks = await getWeeksByBoard(boardId);
  return loadCardsForWeeks(weeks);
}

export async function loadCardsForWeeks(weeks: WeekRecord[]): Promise<CardRecord[]> {
  const cardPromises = weeks.map((week) => getCardsByWeek(week.id));
  return (await Promise.all(cardPromises)).flat();
}
