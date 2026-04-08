import type { BoardRecord, TaskRecord } from "@/db/db";
import * as weeksApi from "@/db/weeks.ts";
import * as tasksApi from "@/db/tasks";

const columnLabels: Record<string, string> = {
  MON: "ПН",
  TUE: "ВТ",
  WED: "СР",
  THU: "ЧТ",
  FRI: "ПТ",
  SAT: "СБ",
  SUN: "ВС",
};

const columns: TaskRecord["column"][] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export async function exportBoardToMarkdown(board: BoardRecord): Promise<string> {
  const weeks = await weeksApi.getWeeksByBoard(board.id);
  const weekTasksMap: Record<string, TaskRecord[]> = {};

  await Promise.all(
    weeks.map(async (week) => {
      weekTasksMap[week.id] = await tasksApi.getTasksByWeek(week.id);
    }),
  );

  const lines: string[] = [];
  lines.push(`# ${board.title}`);
  lines.push("");
  lines.push(`${window.location.origin}/${board.slug}`);

  for (const week of weeks) {
    lines.push("");
    lines.push(`## ${week.title}`);

    const weekTasks = weekTasksMap[week.id] ?? [];

    for (const col of columns) {
      lines.push("");
      lines.push(`### ${columnLabels[col]}`);

      const colTasks = weekTasks.filter((t) => t.column === col).sort((a, b) => a.order - b.order);

      if (colTasks.length > 0) {
        lines.push("");
      }

      for (const task of colTasks) {
        const label = "[ ]";
        lines.push(`- ${label} ${task.title}`);
      }
    }
  }

  return lines.join("\n") + "\n";
}
