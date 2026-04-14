import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/views/BoardsList.vue"),
    },
    {
      path: "/new",
      name: "new-board",
      component: () => import("@/views/NewBoard.vue"),
    },
    {
      path: "/:slug",
      name: "board",
      component: () => import("@/views/BoardView.vue"),
      props: true,
    },
  ],
});

export default router;
