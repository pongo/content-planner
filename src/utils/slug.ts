import slugify from "slugify";

const RESERVED_SLUGS = new Set(["new"]);

/**
 * Generate a unique slug from a title, avoiding collisions and reserved words.
 * If slug exists OR reserved, it appends "-2" (or increments the existing number suffix).
 *
 * Examples:
 * "Hello" (exists) -> "hello-2"
 * "Hello 2" (exists) -> "hello-3"
 * "new" -> "new-2"
 */
export function generateUniqueSlug(title: string, existingSlugs: ReadonlySet<string>): string {
  const baseSlug = slugify(title, { lower: true, strict: true }) || "board";

  if (!existingSlugs.has(baseSlug) && !RESERVED_SLUGS.has(baseSlug)) {
    return baseSlug;
  }

  let base = baseSlug;
  let counter = 2;

  const match = base.match(/-(\d+)$/);
  if (match && match[1]) {
    base = base.substring(0, base.lastIndexOf("-"));
    counter = parseInt(match[1], 10) + 1;
  }

  let slug = `${base}-${counter}`;
  while (existingSlugs.has(slug) || RESERVED_SLUGS.has(slug)) {
    counter++;
    slug = `${base}-${counter}`;
  }

  return slug;
}
