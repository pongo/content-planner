import type { BoardRecord } from "@/db/db";
import { getAllTasks } from "@/db/tasks";

export async function exportBoardToMarkdown(board: BoardRecord): Promise<string> {
  const tasks = await getAllTasks();

  const lines: string[] = [];
  lines.push(`# ${board.title}`);
  lines.push("");
  lines.push(`${window.location.origin}/${board.slug}`);

  for (const task of tasks) {
    lines.push(`\n${toMarkdownQuote(task.title)}`);
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
