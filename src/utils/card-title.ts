const reEOL = /\r?\n/;

export function firstLine(text: string): string {
  const i = text.search(reEOL);
  return i === -1 ? text : text.slice(0, i);
}

export type SingleLineTitle = {
  firstLine: string;
  remainingLines: "";
  isMultiline: false;
  isPermanent: false;
};

export type MultiLineTitle = {
  firstLine: string;
  remainingLines: string;
  isMultiline: true;
  isPermanent: boolean;
};

export type ParsedTitle = SingleLineTitle | MultiLineTitle;

export function parseTitle(title: string): ParsedTitle {
  const [firstLine = "", secondLine, ...restLines] = title.split(reEOL);

  if (secondLine === undefined) {
    return {
      firstLine,
      remainingLines: "",
      isMultiline: false,
      isPermanent: false,
    };
  }

  const isPermanent = secondLine.trim() === "=" && restLines.length > 0;
  const remainingLines = (isPermanent ? restLines : [secondLine, ...restLines]).join("\n").trim();
  return {
    firstLine,
    remainingLines,
    isMultiline: true,
    isPermanent,
  };
}
