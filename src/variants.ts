import { createVariants } from "./composables/useVariants";

export const { provideAppVariants, useAppVariants } = createVariants({
  // TaskCard: { key: "1", variants: [false, true] as const },
  // TaskWidth: { key: "2", variants: ["w-32", "w-35"] as const },
});
