import "fake-indexeddb/auto";

import { mount, flushPromises } from "@vue/test-utils";
import { createPinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import NewBoardPage from "./NewBoardPage.vue";
import { clearDB, waitFor } from "../../tests/pageTestUtils";
import { getDB } from "@/db/db";

const routerMock = vi.hoisted(() => ({
  push: vi.fn<(path: string) => void>(),
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: routerMock.push,
  }),
}));

function mockStorage() {
  Object.defineProperty(navigator, "storage", {
    configurable: true,
    value: {
      persisted: vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
      persist: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
    },
  });
}

function mountPage() {
  return mount(NewBoardPage, {
    attachTo: document.body,
    global: {
      plugins: [createPinia()],
    },
  });
}

async function getRecords() {
  const db = await getDB();
  return {
    boards: await db.getAll("boards"),
    weeks: await db.getAll("weeks"),
  };
}

describe("NewBoardPage", () => {
  beforeEach(async () => {
    document.body.innerHTML = "";
    routerMock.push.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    mockStorage();
    await clearDB();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("focuses title input and disables create button initially", async () => {
    const wrapper = mountPage();
    await nextTick();

    expect(document.activeElement).toBe(wrapper.get("[data-testid='board-title-input']").element);
    expect(wrapper.get("[data-testid='create-board-button']").attributes("disabled")).toBeDefined();
  });

  it("keeps whitespace title from creating a board", async () => {
    const wrapper = mountPage();

    await wrapper.get("[data-testid='board-title-input']").setValue("   ");
    await wrapper.get("[data-testid='create-board-button']").trigger("click");
    await flushPromises();

    const { boards, weeks } = await getRecords();
    expect(boards).toHaveLength(0);
    expect(weeks).toHaveLength(0);
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("creates a board with a default Categories week and navigates on click", async () => {
    const wrapper = mountPage();

    await wrapper.get("[data-testid='board-title-input']").setValue("My Board");
    await wrapper.get("[data-testid='create-board-button']").trigger("click");
    await waitFor(() => {
      expect(routerMock.push).toHaveBeenCalledWith("/my-board");
    });

    const { boards, weeks } = await getRecords();
    expect(boards).toMatchObject([{ title: "My Board", slug: "my-board" }]);
    expect(weeks).toMatchObject([{ title: "Categories", boardId: boards[0]!.id, order: 0 }]);
  });

  it("creates a board when pressing Enter in the title input", async () => {
    const wrapper = mountPage();

    await wrapper.get("[data-testid='board-title-input']").setValue("Enter Board");
    await wrapper.get("[data-testid='board-title-input']").trigger("keydown", { key: "Enter" });
    await waitFor(() => {
      expect(routerMock.push).toHaveBeenCalledWith("/enter-board");
    });

    const { boards, weeks } = await getRecords();
    expect(boards).toMatchObject([{ title: "Enter Board", slug: "enter-board" }]);
    expect(weeks).toHaveLength(1);
  });

  it("prevents duplicate creates while creation is already running", async () => {
    const wrapper = mountPage();
    const button = wrapper.get("[data-testid='create-board-button']");

    await wrapper.get("[data-testid='board-title-input']").setValue("One Board");
    const firstClick = button.trigger("click");
    await button.trigger("click");
    await firstClick;
    await waitFor(() => {
      expect(routerMock.push).toHaveBeenCalledWith("/one-board");
    });

    const { boards, weeks } = await getRecords();
    expect(boards).toHaveLength(1);
    expect(weeks).toHaveLength(1);
    expect(routerMock.push).toHaveBeenCalledTimes(1);
  });

  it("logs creation errors and restores idle state", async () => {
    const db = await getDB();
    await db.add("boards", {
      id: "duplicate-id",
      title: "Existing",
      slug: "existing",
      createdAt: Date.now(),
    });
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "duplicate-id" as `${string}-${string}-${string}-${string}-${string}`,
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const wrapper = mountPage();
    const button = wrapper.get("[data-testid='create-board-button']");

    await wrapper.get("[data-testid='board-title-input']").setValue("Broken Board");
    const click = button.trigger("click");
    await nextTick();
    expect(button.text()).toBe("Создание...");
    await click;
    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith("Failed to create board:", expect.any(Error));
    });

    expect(button.text()).toBe("Создать");
    expect(routerMock.push).not.toHaveBeenCalled();
  });
});
