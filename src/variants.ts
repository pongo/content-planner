import { createVariants } from "./composables/useVariants";

export const { provideAppVariants, useAppVariants } = createVariants({
  // border: { key: "1", variants: ["border-black/10", "border-gray-400/30"] as const },
  cardPY: { key: "2", variants: [/* "py-1", */ "py-1.25", "py-1.5" /* "py-2" */] as const },
});
