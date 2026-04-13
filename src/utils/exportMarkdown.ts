import type { BoardRecord } from "@/db/db";
import { getAllCards } from "@/db/cards";

export async function exportBoardToMarkdown(board: BoardRecord): Promise<string> {
  const cards = await getAllCards();

  const lines: string[] = [];
  lines.push(`# ${board.title}`);
  lines.push("");
  lines.push(`${window.location.origin}/${board.slug}`);

  for (const card of cards) {
    lines.push(`\n${toMarkdownQuote(card.title)}`);
  }

  return lines.join("\n") + "\n";
}

const reEOL = /\r?\n/;

function toMarkdownQuote(text: string): string {
  return text
    .split(reEOL)
    .map((line) => `> ${line}`)
    .join("\n");
}
