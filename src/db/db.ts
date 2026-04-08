import { type DBSchema, openDB } from "idb";

export interface BoardRecord {
  id: string;
  title: string;
  slug: string;
  createdAt: number;
}

export interface StoryRecord {
  id: string;
  boardId: string;
  title: string;
  order: number;
}

export interface TaskRecord {
  id: string;
  storyId: string;
  column: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN" | "ALL";
  title: string;
  order: number;
}

export interface ContentPlannerDB extends DBSchema {
  boards: {
    key: string;
    value: BoardRecord;
    indexes: { "by-slug": string };
  };
  stories: {
    key: string;
    value: StoryRecord;
    indexes: { "by-board": string };
  };
  tasks: {
    key: string;
    value: TaskRecord;
    indexes: { "by-story": string; "by-story-column": [string, string] };
  };
}

const DB_NAME = "content-planner";
const DB_VERSION = 1;

export async function initDB() {
  return openDB<ContentPlannerDB>(DB_NAME, DB_VERSION, {
    async upgrade(db) {
      // Boards store
      if (!db.objectStoreNames.contains("boards")) {
        const boardStore = db.createObjectStore("boards", { keyPath: "id" });
        boardStore.createIndex("by-slug", "slug", { unique: true });
      }

      // Stories store
      if (!db.objectStoreNames.contains("stories")) {
        const storyStore = db.createObjectStore("stories", { keyPath: "id" });
        storyStore.createIndex("by-board", "boardId");
      }

      // Tasks store
      if (!db.objectStoreNames.contains("tasks")) {
        const taskStore = db.createObjectStore("tasks", { keyPath: "id" });
        taskStore.createIndex("by-story", "storyId");
        taskStore.createIndex("by-story-column", ["storyId", "column"], {
          multiEntry: false,
        });
      }
    },
  });
}

// Helper to get DB instance (singleton)
let dbPromise: ReturnType<typeof initDB> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = initDB();
  }
  return dbPromise;
}
