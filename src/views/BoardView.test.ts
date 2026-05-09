import "fake-indexeddb/auto";

import { mount, flushPromises } from "@vue/test-utils";
import { createPinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import BoardView from "./BoardView.vue";
import { getDB, type BoardRecord, type CardRecord, type WeekRecord } from "@/db/db";
import { createBoard } from "@/db/boards";
import { createCard } from "@/db/cards";
import { createWeek } from "@/db/weeks";

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
  for (const board of records.boards ?? []) {
    await createBoard({ id: board.id, title: board.title, slug: board.slug });
  }
  for (const week of records.weeks ?? []) {
    await createWeek({ id: week.id, boardId: week.boardId, title: week.title });
  }
  for (const card of records.cards ?? []) {
    await createCard({
      id: card.id,
      weekId: card.weekId,
      column: card.column,
      title: card.title,
    });
  }
}

function makeBoard(overrides: Partial<BoardRecord> = {}): BoardRecord {
  return {
    id: "board-1",
    title: "Контент план",
    slug: "content-plan",
    createdAt: 1,
    ...overrides,
  };
}

function makeWeek(overrides: Partial<WeekRecord> = {}): WeekRecord {
  return {
    id: "week-categories",
    boardId: "board-1",
    title: "Categories",
    order: 0,
    ...overrides,
  };
}

function makeCard(overrides: Partial<CardRecord> = {}): CardRecord {
  return {
    id: "card-1",
    weekId: "week-categories",
    column: "ALL",
    title: "Идея поста",
    order: 0,
    ...overrides,
  };
}

function mountView(slug = "content-plan") {
  return mount(BoardView, {
    attachTo: document.body,
    props: { slug },
    global: {
      plugins: [createPinia()],
      stubs: {
        teleport: true,
        VueDraggable: defineComponent({
          setup(_, { slots, attrs }) {
            return () => h("div", attrs, slots.default?.());
          },
        }),
      },
    },
  });
}

async function getRecords() {
  const db = await getDB();
  return {
    weeks: await db.getAll("weeks"),
    cards: await db.getAll("cards"),
  };
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

describe("BoardView", () => {
  beforeEach(async () => {
    document.body.innerHTML = "";
    routerMock.push.mockReset();
    Object.defineProperty(window, "confirm", {
      configurable: true,
      value: vi.fn<(message?: string) => boolean>().mockReturnValue(true),
    });
    await clearDB();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads a board with weeks and cards from IndexedDB", async () => {
    await seedRecords({
      boards: [makeBoard()],
      weeks: [makeWeek(), makeWeek({ id: "week-1", title: "Неделя 1", order: 1 })],
      cards: [
        makeCard({ id: "card-category", title: "Идея из категорий" }),
        makeCard({
          id: "card-monday",
          weekId: "week-1",
          column: "MON",
          title: "Пост в понедельник",
        }),
      ],
    });

    const wrapper = mountView();

    await waitFor(() => {
      expect(wrapper.find("[data-testid='board-view']").exists()).toBe(true);
      expect(wrapper.findAll("[data-testid='board-card']")).toHaveLength(2);
    });

    expect(wrapper.text()).toContain("Контент план");
    expect(wrapper.text()).toContain("Идея из категорий");
    expect(wrapper.text()).toContain("Пост в понедельник");
  });

  it("creates a week from the add week control", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "week-new" as `${string}-${string}-${string}-${string}-${string}`,
    );
    await seedRecords({ boards: [makeBoard()], weeks: [makeWeek()] });
    const wrapper = mountView();

    await waitFor(() => {
      expect(wrapper.find("[data-testid='add-week-button']").exists()).toBe(true);
    });
    await wrapper.get("[data-testid='add-week-button']").trigger("click");
    await waitFor(() => {
      expect(wrapper.find("[data-week-id='week-new']").exists()).toBe(true);
    });

    const { weeks } = await getRecords();
    expect(weeks).toMatchObject([
      { id: "week-categories", boardId: "board-1", title: "Categories", order: 0 },
      { id: "week-new", boardId: "board-1", order: 1 },
    ]);
  });

  it("creates a card from the Categories add button", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "card-new" as `${string}-${string}-${string}-${string}-${string}`,
    );
    await seedRecords({ boards: [makeBoard()], weeks: [makeWeek()] });
    const wrapper = mountView();

    await waitFor(() => {
      expect(wrapper.find("[data-testid='add-category-card-button']").exists()).toBe(true);
    });
    await wrapper.get("[data-testid='add-category-card-button']").trigger("click");
    await wrapper.get("[data-testid='card-title-input']").setValue("Новая карточка");
    await wrapper.get("[data-testid='save-card-button']").trigger("click");
    await waitFor(() => {
      expect(wrapper.text()).toContain("Новая карточка");
    });

    const { cards } = await getRecords();
    expect(cards).toMatchObject([
      {
        id: "card-new",
        weekId: "week-categories",
        column: "ALL",
        title: "Новая карточка",
        order: 0,
      },
    ]);
  });

  it("opens a create dialog for the double-clicked table cell", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "card-dblclick" as `${string}-${string}-${string}-${string}-${string}`,
    );
    await seedRecords({
      boards: [makeBoard()],
      weeks: [makeWeek(), makeWeek({ id: "week-1", title: "Неделя 1", order: 1 })],
    });
    const wrapper = mountView();

    await waitFor(() => {
      expect(wrapper.find("[data-week-id='week-1'][data-column='TUE']").exists()).toBe(true);
    });
    await wrapper.get("[data-week-id='week-1'][data-column='TUE']").trigger("dblclick");
    await wrapper.get("[data-testid='card-title-input']").setValue("Карточка вторника");
    await wrapper.get("[data-testid='save-card-button']").trigger("click");
    await waitFor(() => {
      expect(wrapper.text()).toContain("Карточка вторника");
    });

    const { cards } = await getRecords();
    expect(cards).toMatchObject([
      {
        id: "card-dblclick",
        weekId: "week-1",
        column: "TUE",
        title: "Карточка вторника",
        order: 0,
      },
    ]);
  });

  it("edits a card on double click", async () => {
    await seedRecords({
      boards: [makeBoard()],
      weeks: [makeWeek()],
      cards: [makeCard({ title: "Старый заголовок" })],
    });
    const wrapper = mountView();

    await waitFor(() => {
      expect(wrapper.find("[data-testid='board-card']").exists()).toBe(true);
    });
    await wrapper.get("[data-testid='board-card']").trigger("dblclick");
    await wrapper.get("[data-testid='card-title-input']").setValue("Новый заголовок");
    await wrapper.get("[data-testid='save-card-button']").trigger("click");
    await waitFor(() => {
      expect(wrapper.text()).toContain("Новый заголовок");
    });

    const { cards } = await getRecords();
    expect(cards).toMatchObject([{ id: "card-1", title: "Новый заголовок" }]);
  });

  it("deletes a card from the card delete button", async () => {
    await seedRecords({
      boards: [makeBoard()],
      weeks: [makeWeek()],
      cards: [makeCard()],
    });
    const wrapper = mountView();

    await waitFor(() => {
      expect(wrapper.find("[data-testid='board-card']").exists()).toBe(true);
    });
    await wrapper.get("[data-testid='board-card']").trigger("mouseenter");
    await wrapper.get("[data-testid='delete-card-button']").trigger("click");
    await waitFor(() => {
      expect(wrapper.find("[data-testid='board-card']").exists()).toBe(false);
    });

    const { cards } = await getRecords();
    expect(cards).toHaveLength(0);
    expect(window.confirm).toHaveBeenCalledWith("Удалить?");
  });

  it("creates a selected-title card on ctrl double click", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "card-selected" as `${string}-${string}-${string}-${string}-${string}`,
    );
    await seedRecords({
      boards: [makeBoard()],
      weeks: [makeWeek(), makeWeek({ id: "week-1", title: "Неделя 1", order: 1 })],
      cards: [makeCard({ title: "Рубрика\nподробности" })],
    });
    const wrapper = mountView();

    await waitFor(() => {
      expect(wrapper.find("[data-week-id='week-1'][data-column='MON']").exists()).toBe(true);
    });
    await wrapper.get("[data-week-id='week-1'][data-column='MON']").trigger("dblclick", {
      ctrlKey: true,
    });
    await wrapper.get("[data-testid='select-card-title-button']").trigger("click");
    await waitFor(() => {
      expect(wrapper.get("[data-testid='card-title-input']").element).toHaveProperty(
        "value",
        "Рубрика",
      );
    });
    await wrapper.get("[data-testid='save-card-button']").trigger("click");
    await waitFor(() => {
      expect(wrapper.findAll("[data-testid='board-card']")).toHaveLength(2);
    });

    const { cards } = await getRecords();
    expect(cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "card-selected",
          weekId: "week-1",
          column: "MON",
          title: "Рубрика",
        }),
      ]),
    );
  });

  it("completes a week by moving regular cards to Categories and dropping dashed cards", async () => {
    await seedRecords({
      boards: [makeBoard()],
      weeks: [makeWeek(), makeWeek({ id: "week-1", title: "Неделя 1", order: 1 })],
      cards: [
        makeCard({
          id: "card-regular",
          weekId: "week-1",
          column: "MON",
          title: "Регулярная\nдетали",
        }),
        makeCard({
          id: "card-permanent",
          weekId: "week-1",
          column: "TUE",
          title: "Постоянная\n=\nдетали",
        }),
        makeCard({
          id: "card-dashed",
          weekId: "week-1",
          column: "WED",
          title: "- Черновик",
        }),
      ],
    });
    const wrapper = mountView();

    await waitFor(() => {
      expect(wrapper.find("[data-testid='complete-week-button']").exists()).toBe(true);
    });
    await wrapper.get("[data-testid='complete-week-button']").trigger("click");
    await waitFor(() => {
      expect(wrapper.find("[data-week-id='week-1']").exists()).toBe(false);
    });

    const { weeks, cards } = await getRecords();
    expect(weeks).toMatchObject([{ id: "week-categories", title: "Categories" }]);
    expect(cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "card-regular",
          weekId: "week-categories",
          column: "ALL",
          title: "Регулярная",
        }),
        expect.objectContaining({
          id: "card-permanent",
          weekId: "week-categories",
          column: "ALL",
          title: "Постоянная\n=\nдетали",
        }),
      ]),
    );
    expect(cards).not.toEqual([expect.objectContaining({ id: "card-dashed" })]);
  });
});
