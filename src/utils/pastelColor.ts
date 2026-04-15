import ColorHash from "color-hash";
import { firstLine } from "./card-title.ts";

const colorHash = new ColorHash({ saturation: 0.7, lightness: 0.9 });

/**
 * Generate a pastel color from a given string
 */
export function generatePastelColor(text: string): string {
  text = firstLine(text).replace(/^-/, "").trim();
  if (!text) return "#fff";
  return colorHash.hex(text);
}
