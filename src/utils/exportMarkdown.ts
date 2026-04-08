import type { BoardRecord, TaskRecord } from "@/db/db";
import * as storiesApi from "@/db/stories";
import * as tasksApi from "@/db/tasks";

const columnLabels: Record<TaskRecord["column"], string> = {
  TO_DO: "To Do",
  IN_PROGRESS: "In Progress",
  VERIFY: "Verify",
  DONE: "Done",
};

const columns: TaskRecord["column"][] = ["TO_DO", "IN_PROGRESS", "VERIFY", "DONE"];

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
        const assignee = task.assignee ? ` @${task.assignee}` : "";
        const label = col === "DONE" ? "[x]" : "[ ]";
        lines.push(`- ${label}${assignee} ${task.title}`);
      }
    }
  }

  return lines.join("\n") + "\n";
}
