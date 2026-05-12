import type { WeekRecord, CardRecord } from "../db.ts";
import { getCardsByWeekDB } from "./get-cards-by-week.ts";

export async function getCardsForWeeksDB(weeks: WeekRecord[]): Promise<CardRecord[]> {
  const cardPromises = weeks.map((week) => getCardsByWeekDB(week.id));
  return (await Promise.all(cardPromises)).flat();
}
