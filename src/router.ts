import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/pages/boards-list/BoardsListPage.vue"),
    },
    {
      path: "/new",
      name: "new-board",
      component: () => import("@/pages/new-board/NewBoardPage.vue"),
    },
    {
      path: "/:slug",
      name: "board",
      component: () => import("@/pages/board/BoardPage.vue"),
      props: true,
    },
  ],
});

export default router;
