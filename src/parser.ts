import { createTokenizer, type RawColor } from "./tokenizer";

// Parser parses chunks of text and emits styled text

/**
 * 16-color palette useful for creating `Color` objects by hand.
 *
 * @example
 * ```typescript
 * const color: Color = { type: "16", code: Color16.red };
 * ```
 */
export const Color16 = {
  black: 0,
  red: 1,
  green: 2,
  yellow: 3,
  blue: 4,
  magenta: 5,
  cyan: 6,
  white: 7,
  brightBlack: 8,
  brightRed: 9,
  brightGreen: 10,
  brightYellow: 11,
  brightBlue: 12,
  brightMagenta: 13,
  brightCyan: 14,
  brightWhite: 15,
} as const;

export type Color16 = (typeof Color16)[keyof typeof Color16];

export type Color =
  | { type: "16"; code: Color16 }
  | { type: "256"; code: number }
  | { type: "rgb"; rgb: [r: number, g: number, b: number] };

export const Decoration = {
  bold: "bold",
  dim: "dim",
  italic: "italic",
  underline: "underline",
  blink: "blink",
  reverse: "reverse",
  hidden: "hidden",
  strikethrough: "strikethrough",
} as const;

export type Decoration = (typeof Decoration)[keyof typeof Decoration];

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

type CurrentStyle = {
  fg: Color | null;
  bg: Color | null;
  decorations: Set<Decoration>;
};

function createStyle(): CurrentStyle {
  return {
    fg: null,
    bg: null,
    decorations: new Set(),
  };
}

function styleToStyledText(text: string, style: CurrentStyle): StyledText {
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

/**
 * Validate color token.
 *
 * Tokenizer doesn't do validation, it just emits tokens.
 */
function validateColor(color: RawColor): Color | null {
  switch (color.type) {
    case "16":
      // 16-color is always valid 0-15 (tokenizer ensures this) but let's be robust
      if (color.code === null || color.code < 0 || color.code > 15) {
        return null;
      }
      return { type: "16", code: color.code as Color16 };
    case "256": {
      // 256-color might be invalid
      if (color.code === null || color.code < 0 || color.code > 255) {
        return null;
      }
      return { type: "256", code: color.code };
    }
    case "rgb": {
      // RGB might be invalid
      if (color.rgb === null) {
        return null;
      }
      const [r, g, b] = color.rgb;
      if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
        return null;
      }
      return { type: "rgb", rgb: color.rgb };
    }
    default: {
      const exhaustive: never = color;
      throw new Error(`Unhandled color: ${JSON.stringify(exhaustive)}`);
    }
  }
}

export function createParser(): Parser {
  const tokenizer = createTokenizer();
  let currentStyle = createStyle();

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
        case "dim":
        case "italic":
        case "underline":
        case "blink":
        case "reverse":
        case "hidden":
        case "strikethrough":
          if (token.enable) {
            currentStyle.decorations.add(token.type);
          } else {
            currentStyle.decorations.delete(token.type);
          }
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

  /**
   * Reset the parser's internal state so that it can be reused.
   */
  const reset = (): void => {
    tokenizer.reset();
    currentStyle = createStyle();
  };

  return { push, reset };
}
