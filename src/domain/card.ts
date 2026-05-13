import type { ParsedTitle } from "@/shared/utils/card-title.ts";
import type { CardColumn, WeekRecord } from "@/db/db.ts";

export interface Card {
  id: string;
  title: string;
  titleInfo: ParsedTitle;
  isDuplicate: boolean;
}

export interface CellLocation {
  weekId: string;
  column: CardColumn;
}

export interface BoardCell extends CellLocation {
  colspan?: number;
  cards: Card[];
}

export interface BoardRow {
  week: WeekRecord;
  cells: BoardCell[];
}

export interface CellCardsUpdate extends CellLocation {
  cardIds: string[];
}
