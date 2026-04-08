import type { BoardRecord, TaskRecord } from "@/db/db";
import * as storiesApi from "@/db/weeks.ts";
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
  const stories = await storiesApi.getStoriesByBoard(board.id);
  const storyTasksMap: Record<string, TaskRecord[]> = {};

  await Promise.all(
    stories.map(async (story) => {
      storyTasksMap[story.id] = await tasksApi.getTasksByStory(story.id);
    }),
  );

  const lines: string[] = [];
  lines.push(`# ${board.title}`);
  lines.push("");
  lines.push(`${window.location.origin}/${board.slug}`);

  for (const story of stories) {
    lines.push("");
    lines.push(`## ${story.title}`);

    const storyTasks = storyTasksMap[story.id] ?? [];

    for (const col of columns) {
      lines.push("");
      lines.push(`### ${columnLabels[col]}`);

      const colTasks = storyTasks.filter((t) => t.column === col).sort((a, b) => a.order - b.order);

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
