const reEOL = /\r?\n/;

export function firstLine(text: string): string {
  const i = text.search(reEOL);
  return i === -1 ? text : text.slice(0, i);
}

export function parseTitle(title: string) {
  const index = title.search(reEOL);
  return index === -1
    ? {
        firstLine: title,
        remainingLines: "",
        isMultiline: false,
      }
    : {
        firstLine: title.slice(0, index),
        remainingLines: title.slice(index + 1).trim(),
        isMultiline: true,
      };
}
