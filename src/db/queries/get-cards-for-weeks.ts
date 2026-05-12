import type { WeekRecord, CardRecord } from "../db.ts";
import { getCardsByWeekDB } from "./get-cards-by-week.ts";

export async function getCardsForWeeksDB(weeks: WeekRecord[]): Promise<CardRecord[]> {
  return (await Promise.all(weeks.map((week) => getCardsByWeekDB(week.id))))
    .flat()
    .toSorted((a, b) => a.title.localeCompare(b.title));
}
