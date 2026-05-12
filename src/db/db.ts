import { type DBSchema, openDB } from "idb";

export interface BoardRecord {
  id: string;
  title: string;
  slug: string;
  createdAt: number;
}

export interface WeekRecord {
  id: string;
  boardId: string;
  title: string;
  order: number;
}

export interface CardRecord {
  id: string;
  weekId: string;
  column: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN" | "ALL";
  title: string;
  order: number;
}

export type CardColumn = CardRecord["column"];

export interface ContentPlannerDB extends DBSchema {
  boards: {
    key: string;
    value: BoardRecord;
    indexes: { "by-slug": string };
  };
  weeks: {
    key: string;
    value: WeekRecord;
    indexes: { "by-board": string };
  };
  cards: {
    key: string;
    value: CardRecord;
    indexes: { "by-week": string; "by-week-column": [string, string] };
  };
}

const DB_NAME = "content-planner";
const DB_VERSION = 1;

async function initDB() {
  return openDB<ContentPlannerDB>(DB_NAME, DB_VERSION, {
    async upgrade(db) {
      // Boards store
      if (!db.objectStoreNames.contains("boards")) {
        const boardStore = db.createObjectStore("boards", { keyPath: "id" });
        boardStore.createIndex("by-slug", "slug", { unique: true });
      }

      // Weeks store
      if (!db.objectStoreNames.contains("weeks")) {
        const weekStore = db.createObjectStore("weeks", { keyPath: "id" });
        weekStore.createIndex("by-board", "boardId");
      }

      // Cards store
      if (!db.objectStoreNames.contains("cards")) {
        const cardStore = db.createObjectStore("cards", { keyPath: "id" });
        cardStore.createIndex("by-week", "weekId");
        cardStore.createIndex("by-week-column", ["weekId", "column"], {
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
