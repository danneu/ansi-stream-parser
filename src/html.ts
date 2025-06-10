import { getColorHexCode } from "./index.js";
import { createParser, Decoration, type StyledText } from "./parser.js";

// Only html-escapes the text content.
// If users can provide their own transform function, will have to consider what I
// should do with their output.

export type AnsiToHtmlTransformer = {
  push(input: string): string[];
  reset(): void;
};

export type ClassOrStyle =
  | { type: "class"; classes: string[] }
  | { type: "style"; styles: Record<string, string> };

export type HtmlTransformFunction = (chunk: StyledText) => ClassOrStyle[];

export function createAnsiToHtmlTransformer(): AnsiToHtmlTransformer {
  const parser = createParser();

  const push = (input: string): string[] => {
    const chunks = parser.push(input);
    return chunks.map((chunk) => chunkToHtml(chunk));
  };

  const reset = (): void => {
    parser.reset();
  };

  return {
    push,
    reset,
  };
}

function chunkToHtml(
  chunk: StyledText,
  transform: HtmlTransformFunction = defaultTransform,
): string {
  const classes = new Set<string>();
  const styles: Record<string, string> = Object.create(null);
  for (const classOrStyle of transform(chunk)) {
    switch (classOrStyle.type) {
      case "class":
        for (const className of classOrStyle.classes) {
          classes.add(className);
        }
        break;
      case "style":
        Object.assign(styles, classOrStyle.styles);
        break;
      default: {
        const exhaustiveCheck: never = classOrStyle;
        throw new Error(`Unknown classOrStyle: ${exhaustiveCheck}`);
      }
    }
  }

  const classString =
    classes.size > 0 ? ` class="${Array.from(classes).join(" ")}"` : "";
  const styleString =
    Object.keys(styles).length > 0
      ? ` style="${Object.entries(styles)
          .map(([key, value]) => `${key}: ${value}`)
          .join("; ")}"`
      : "";

  return `<span${classString}${styleString}>${escapeHtml(chunk.text)}</span>`;
}

const escapeHtml = (() => {
  const escapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  const regex = /[&<>"']/g;

  return (text: string) => text.replace(regex, (m) => escapeMap[m]!);
})();

const defaultDecorationClasses: Record<Decoration, string> = {
  bold: "ansi-bold",
  dim: "ansi-dim",
  italic: "ansi-italic",
  underline: "ansi-underline",
  strikethrough: "ansi-strikethrough",
  blink: "ansi-blink",
  reverse: "ansi-reverse",
  hidden: "ansi-hidden",
};

function defaultTransform(chunk: StyledText): ClassOrStyle[] {
  const styles: ClassOrStyle[] = [];

  if (chunk.fg) {
    styles.push({
      type: "style",
      styles: { color: getColorHexCode(chunk.fg) },
    });
  }

  if (chunk.bg) {
    styles.push({
      type: "style",
      styles: { "background-color": getColorHexCode(chunk.bg) },
    });
  }

  if (chunk.decorations) {
    styles.push({
      type: "class",
      classes: chunk.decorations.map((d) => defaultDecorationClasses[d]),
    });
  }

  return styles;
}
