import { createVariants } from "./composables/useVariants";

export const { provideAppVariants, useAppVariants } = createVariants({
  // TaskCard: { key: "1", variants: [false, true] as const },
  // TaskWidth: { key: "2", variants: ["w-32", "w-35"] as const },
  // border: { key: "1", variants: ["border-black/10", "border-gray-400/30"] as const },
  cardPY: { key: "2", variants: [/* "py-1", */ "py-1.25", "py-1.5" /* "py-2" */] as const },
});
