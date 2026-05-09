import "fake-indexeddb/auto";

import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import BoardsList from "./BoardsList.vue";
import { getDB, type BoardRecord, type CardRecord, type WeekRecord } from "@/db/db";

const routerMock = vi.hoisted(() => ({
  push: vi.fn<(path: string) => void>(),
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: routerMock.push,
  }),
  RouterLink: defineComponent({
    props: {
      to: {
        type: String,
        required: true,
      },
    },
    setup(props, { slots, attrs }) {
      return () => h("a", { ...attrs, href: props.to }, slots.default?.());
    },
  }),
}));

async function clearDB() {
  const db = await getDB();
  const tx = db.transaction(["boards", "weeks", "cards"], "readwrite");
  tx.objectStore("cards").clear();
  tx.objectStore("weeks").clear();
  tx.objectStore("boards").clear();
  await tx.done;
}

async function seedRecords(records: {
  boards?: BoardRecord[];
  weeks?: WeekRecord[];
  cards?: CardRecord[];
}) {
  const db = await getDB();
  const tx = db.transaction(["boards", "weeks", "cards"], "readwrite");

  for (const board of records.boards ?? []) {
    await tx.objectStore("boards").add(board);
  }
  for (const week of records.weeks ?? []) {
    await tx.objectStore("weeks").add(week);
  }
  for (const card of records.cards ?? []) {
    await tx.objectStore("cards").add(card);
  }

  await tx.done;
}

function makeBoard(overrides: Partial<BoardRecord> = {}): BoardRecord {
  return {
    id: "board-1",
    title: "Первая доска",
    slug: "first-board",
    createdAt: 1,
    ...overrides,
  };
}

function mountView() {
  return mount(BoardsList, {
    attachTo: document.body,
  });
}

async function waitFor(assertion: () => void) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 0));
      await flushPromises();
    }
  }

  throw lastError;
}

describe("BoardsList", () => {
  beforeEach(async () => {
    document.body.innerHTML = "";
    routerMock.push.mockReset();
    vi.useRealTimers();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined),
      },
    });
    Object.defineProperty(window, "confirm", {
      configurable: true,
      value: vi.fn<(message?: string) => boolean>().mockReturnValue(true),
    });
    await clearDB();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("renders boards loaded from IndexedDB", async () => {
    await seedRecords({
      boards: [
        makeBoard(),
        makeBoard({ id: "board-2", title: "Вторая доска", slug: "second-board" }),
      ],
    });

    const wrapper = mountView();

    await waitFor(() => {
      expect(wrapper.findAll("[data-testid='board-list-item']")).toHaveLength(2);
    });

    expect(wrapper.text()).toContain("Первая доска");
    expect(wrapper.text()).toContain("Вторая доска");
  });

  it("renders board links to board slugs", async () => {
    await seedRecords({ boards: [makeBoard({ slug: "content-plan" })] });

    const wrapper = mountView();

    await waitFor(() => {
      expect(wrapper.get("[data-testid='board-link']").attributes("href")).toBe("/content-plan");
    });
  });

  it("navigates to new board creation", async () => {
    const wrapper = mountView();

    await waitFor(() => {
      expect(wrapper.find("[data-testid='create-board-button']").exists()).toBe(true);
    });
    await wrapper.get("[data-testid='create-board-button']").trigger("click");

    expect(routerMock.push).toHaveBeenCalledWith("/new");
  });

  it("deletes a confirmed board from UI and IndexedDB", async () => {
    await seedRecords({ boards: [makeBoard()] });
    const wrapper = mountView();

    await waitFor(() => {
      expect(wrapper.findAll("[data-testid='board-list-item']")).toHaveLength(1);
    });
    await wrapper.get("[data-testid='delete-board-button']").trigger("click");
    await waitFor(() => {
      expect(wrapper.findAll("[data-testid='board-list-item']")).toHaveLength(0);
    });

    const db = await getDB();
    expect(await db.getAll("boards")).toHaveLength(0);
  });

  it("keeps a board when deletion is cancelled", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    await seedRecords({ boards: [makeBoard()] });
    const wrapper = mountView();

    await waitFor(() => {
      expect(wrapper.findAll("[data-testid='board-list-item']")).toHaveLength(1);
    });
    await wrapper.get("[data-testid='delete-board-button']").trigger("click");
    await flushPromises();

    const db = await getDB();
    expect(wrapper.findAll("[data-testid='board-list-item']")).toHaveLength(1);
    expect(await db.getAll("boards")).toHaveLength(1);
  });

  it("exports board Markdown to clipboard and shows copied state", async () => {
    await seedRecords({
      boards: [makeBoard({ id: "board-export", title: "Контент план", slug: "content-plan" })],
      weeks: [{ id: "week-export", boardId: "board-export", title: "Week", order: 0 }],
      cards: [
        {
          id: "card-export",
          weekId: "week-export",
          column: "MON",
          title: "Опубликовать пост",
          order: 0,
        },
      ],
    });
    const wrapper = mountView();

    await waitFor(() => {
      expect(wrapper.find("[data-testid='export-board-button']").exists()).toBe(true);
    });
    await wrapper.get("[data-testid='export-board-button']").trigger("click");
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "# Контент план\n\nhttp://localhost:3000/content-plan\n\n> Опубликовать пост\n",
    );
    expect(wrapper.get("[data-testid='export-board-button']").attributes("title")).toBe(
      "Скопировано!",
    );
  });
});
