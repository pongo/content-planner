import type { BoardRecord, CardRecord } from "@/shared/db/db";

export function exportBoardToMarkdown(board: BoardRecord, cards: CardRecord[]): string {
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
