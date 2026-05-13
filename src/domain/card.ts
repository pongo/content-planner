import type { ParsedTitle } from "@/shared/utils/card-title.ts";

export interface Card {
  id: string;
  title: string;
  titleInfo: ParsedTitle;
  isDuplicate: boolean;
}
