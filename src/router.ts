import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/pages/BoardsList.vue"),
    },
    {
      path: "/new",
      name: "new-board",
      component: () => import("@/pages/NewBoard.vue"),
    },
    {
      path: "/:slug",
      name: "board",
      component: () => import("@/pages/BoardView.vue"),
      props: true,
    },
  ],
});

export default router;
