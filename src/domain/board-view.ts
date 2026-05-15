import type { CardColumn, CardRecord, WeekRecord } from "@/db/db.ts";
import type { Card } from "@/domain/card.ts";
import type { BoardRow } from "@/domain/cell.ts";
import { getFirstLine, parseTitle } from "@/shared/utils/card-title.ts";

export const BOARD_COLUMNS: CardColumn[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
export const CATEGORIES_WEEK_TITLE = "Categories";

export function getCardsFirstLineCounts(cards: CardRecord[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const card of cards) {
    if (card.title.startsWith("-")) continue;

    const firstLine = getFirstLine(card.title);
    if (!firstLine) continue;

    counts.set(firstLine, (counts.get(firstLine) || 0) + 1);
  }
  return counts;
}

export function getDuplicateFirstLines(cards: CardRecord[]): Set<string> {
  const duplicates = new Set<string>();
  for (const [line, count] of getCardsFirstLineCounts(cards)) {
    if (count > 1) duplicates.add(line);
  }
  return duplicates;
}

export function createCardsView(cards: CardRecord[]): Card[] {
  const duplicateFirstLines = getDuplicateFirstLines(cards);

  return cards.map((card) => {
    const titleInfo = parseTitle(card.title);
    return {
      id: card.id,
      title: card.title,
      titleInfo,
      isDuplicate: !card.title.startsWith("-") && duplicateFirstLines.has(titleInfo.firstLine),
    };
  });
}

export function getColumnsForWeek(week: WeekRecord): { column: CardColumn; colspan?: number }[] {
  if (week.title === CATEGORIES_WEEK_TITLE) return [{ column: "ALL", colspan: 7 }];
  return BOARD_COLUMNS.map((column) => ({ column }));
}

export function createBoardRows(weeks: WeekRecord[], cards: CardRecord[]): BoardRow[] {
  const cardsViewById = new Map(createCardsView(cards).map((card) => [card.id, card]));

  return weeks.map((week) => ({
    week,
    cells: getColumnsForWeek(week).map((cell) => ({
      weekId: week.id,
      column: cell.column,
      colspan: cell.colspan,
      cards: cards
        .filter((card) => card.weekId === week.id && card.column === cell.column)
        .map((record) => cardsViewById.get(record.id))
        .filter((card): card is Card => card !== undefined),
    })),
  }));
}
