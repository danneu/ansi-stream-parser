import { createTokenizer, type RawColor } from "./tokenizer";

// Parser parses chunks of text and emits styled text

export type Color =
  | { type: "16"; code: number }
  | { type: "256"; code: number }
  | { type: "rgb"; rgb: [number, number, number] };

export type Decoration =
  | "bold"
  | "dim"
  | "italic"
  | "underline"
  | "blink"
  | "reverse"
  | "hidden"
  | "strikethrough";

export type StyledText = {
  text: string;
  fg?: Color;
  bg?: Color;
  decorations?: Decoration[];
};

export type Parser = {
  push(input: string): StyledText[];
  reset(): void;
};

type Style = {
  fg: Color | null;
  bg: Color | null;
  decorations: Set<Decoration>;
};

function createStyle(): Style {
  return {
    fg: null,
    bg: null,
    decorations: new Set(),
  };
}

function styleToStyledText(text: string, style: Style): StyledText {
  const result: StyledText = { text };

  if (style.fg) {
    result.fg = style.fg;
  }

  if (style.bg) {
    result.bg = style.bg;
  }

  if (style.decorations.size > 0) {
    // Note: Important to ensure we're not just passing a reference to the original
    // object else it will be mutated as parsing continues.
    result.decorations = Array.from(style.decorations);
  }

  return result;
}

export function createParser(): Parser {
  const tokenizer = createTokenizer();
  let currentStyle = createStyle();

  function validateColor(color: RawColor): Color | null {
    switch (color.type) {
      case "16":
        // 16-color is always valid
        return { type: "16", code: color.code };
      case "256": {
        if (color.code === null || color.code < 0 || color.code > 255) {
          return null;
        }
        return { type: "256", code: color.code };
      }
      case "rgb":
        // TODO: Validate RGB values
        if (color.rgb === null) {
          return null;
        }
        return { type: "rgb", rgb: color.rgb };
      default: {
        const exhaustive: never = color;
        throw new Error(`Unhandled color: ${JSON.stringify(exhaustive)}`);
      }
    }
  }

  const push = (input: string): StyledText[] => {
    const tokens = tokenizer.push(input);
    const chunks: StyledText[] = [];

    for (const token of tokens) {
      switch (token.type) {
        case "text":
          chunks.push(styleToStyledText(token.text, currentStyle));
          break;

        case "set-fg-color":
          // If color is invalid, reset fg.
          currentStyle.fg = validateColor(token.color);
          break;

        case "set-bg-color":
          // If color is invalid, reset bg.
          currentStyle.bg = validateColor(token.color);
          break;

        case "reset-fg-color":
          currentStyle.fg = null;
          break;

        case "reset-bg-color":
          currentStyle.bg = null;
          break;

        case "reset-all":
          currentStyle = createStyle();
          break;

        case "bold":
          currentStyle.decorations.add("bold");
          break;

        case "dim":
          currentStyle.decorations.add("dim");
          break;

        case "italic":
          currentStyle.decorations.add("italic");
          break;

        case "underline":
          currentStyle.decorations.add("underline");
          break;

        case "blink":
          currentStyle.decorations.add("blink");
          break;

        case "reverse":
          currentStyle.decorations.add("reverse");
          break;

        case "hidden":
          currentStyle.decorations.add("hidden");
          break;

        case "strikethrough":
          currentStyle.decorations.add("strikethrough");
          break;

        case "no-bold":
          currentStyle.decorations.delete("bold");
          break;

        case "no-dim":
          currentStyle.decorations.delete("dim");
          break;

        case "no-italic":
          currentStyle.decorations.delete("italic");
          break;

        case "no-underline":
          currentStyle.decorations.delete("underline");
          break;

        case "no-blink":
          currentStyle.decorations.delete("blink");
          break;

        case "no-reverse":
          currentStyle.decorations.delete("reverse");
          break;

        case "no-hidden":
          currentStyle.decorations.delete("hidden");
          break;

        case "no-strikethrough":
          currentStyle.decorations.delete("strikethrough");
          break;

        case "unknown":
          // Ignore unknown sequences
          break;

        default: {
          const exhaustive: never = token;
          throw new Error(`Unhandled token: ${JSON.stringify(exhaustive)}`);
        }
      }
    }

    return chunks;
  };

  const reset = (): void => {
    tokenizer.reset();
    currentStyle = createStyle();
  };

  return { push, reset };
}
