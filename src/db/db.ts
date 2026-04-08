import { type DBSchema, openDB } from "idb";
import { generateUniqueSlug } from "@/utils/slug";

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
  column: "TO_DO" | "IN_PROGRESS" | "VERIFY" | "DONE";
  title: string;
  assignee: string;
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
const DB_VERSION = 2;

export async function initDB() {
  return openDB<ContentPlannerDB>(DB_NAME, DB_VERSION, {
    async upgrade(db, oldVersion, _newVersion, tx) {
      // Version 1 setup
      if (oldVersion < 1) {
        // Boards store
        if (!db.objectStoreNames.contains("boards")) {
          db.createObjectStore("boards", { keyPath: "id" });
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
      }

      // Migration to version 2: add slugs and unique index
      if (oldVersion < 2) {
        const boardStore = tx.objectStore("boards");
        const boards = await boardStore.getAll();
        const usedSlugs = new Set<string>();

        // We use boardStore.put directly within the upgrade transaction
        for (const board of boards) {
          if (!board.slug) {
            const slug = generateUniqueSlug(board.title, usedSlugs);
            board.slug = slug;
            usedSlugs.add(slug);
            await boardStore.put(board);
          } else {
            usedSlugs.add(board.slug);
          }
        }

        // Create index AFTER populating values to ensure no duplicate undefined keys (if any)
        if (!boardStore.indexNames.contains("by-slug")) {
          boardStore.createIndex("by-slug", "slug", { unique: true });
        }
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
