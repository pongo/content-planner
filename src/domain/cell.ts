import type { CardColumn, WeekRecord } from "@/db/db.ts";
import type { Card } from "@/domain/card.ts";

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
