export function firstLine(text: string): string {
  const i = text.search(/\r?\n/);
  return i === -1 ? text : text.slice(0, i);
}
