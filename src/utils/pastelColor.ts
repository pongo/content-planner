import ColorHash from "color-hash";

const colorHash = new ColorHash({ saturation: 0.7, lightness: 0.9 });

/**
 * Generate a pastel color from a given string
 */
export function generatePastelColor(text: string): string {
  if (!text.trim()) return "#fff";
  return colorHash.hex(text);
}
