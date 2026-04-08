import { getDB } from "./db";
import type { StoryRecord } from "./db";

export async function getStoriesByBoard(boardId: string): Promise<StoryRecord[]> {
  const db = await getDB();
  const stories = await db.getAllFromIndex("stories", "by-board", boardId);
  return stories.sort((a, b) => a.order - b.order);
}

export async function createStory(story: Omit<StoryRecord, "order">): Promise<string> {
  const db = await getDB();
  const existing = await getStoriesByBoard(story.boardId);
  const order = existing.length > 0 ? existing[existing.length - 1]!.order + 1 : 0;
  const record: StoryRecord = { ...story, order };
  await db.add("stories", record);
  return record.id;
}

export async function updateStory(
  id: string,
  updates: Partial<Omit<StoryRecord, "id" | "boardId">>,
): Promise<void> {
  const db = await getDB();
  const story = await db.get("stories", id);
  if (!story) throw new Error(`Story ${id} not found`);
  Object.assign(story, updates);
  await db.put("stories", story);
}

export async function deleteStory(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["stories", "tasks"], "readwrite");
  const storiesStore = tx.objectStore("stories");
  const tasksStore = tx.objectStore("tasks");

  // Get all tasks associated with the story
  const taskIds = await tasksStore.index("by-story").getAllKeys(id);

  // Delete all tasks and the story in parallel, wait for tx to commit
  await Promise.all([
    ...taskIds.map((taskId) => tasksStore.delete(taskId)),
    storiesStore.delete(id),
    tx.done,
  ]);
}

export async function reorderStories(boardId: string, reorderedIds: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("stories", "readwrite");
  const store = tx.objectStore("stories");
  for (let i = 0; i < reorderedIds.length; i++) {
    const story = await store.get(reorderedIds[i]!);
    if (story && story.boardId === boardId) {
      story.order = i;
      await store.put(story);
    }
  }
  await tx.done;
}
