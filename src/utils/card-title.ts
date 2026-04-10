export function firstLine(text: string): string {
  const i = text.search(/\r?\n/);
  return i === -1 ? text : text.slice(0, i);
}

export function parseTitle(title: string) {
  const index = title.indexOf("\n");

  if (index === -1) {
    return {
      firstLine: title,
      remainingLines: "",
      isMultiline: false,
    };
  }

  return {
    firstLine: title.slice(0, index),
    remainingLines: title.slice(index + 1).trim(),
    isMultiline: true,
  };
}
