const reEOL = /\r?\n/;

export function firstLine(text: string): string {
  const i = text.search(reEOL);
  return i === -1 ? text : text.slice(0, i);
}

export function parseTitle(title: string) {
  const lines = title.split(reEOL);
  const firstLine = lines[0] ?? "";
  const isPermanent = lines.length > 1 && lines[1]!.trim() === "=";

  let remainingLines = "";
  if (lines.length > 1) {
    const startIdx = isPermanent ? 2 : 1;
    remainingLines = lines.slice(startIdx).join("\n").trim();
  }

  return {
    firstLine,
    remainingLines,
    isMultiline: lines.length > 1,
    isPermanent,
  };
}
