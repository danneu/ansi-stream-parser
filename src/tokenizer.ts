// TODO: Replace all tokenizer strings with enums.
// Since they don't need to be end-user friendly.

export type RawColor =
  | { type: "16"; code: number }
  | { type: "256"; code: number | null } // null = missing color number
  | { type: "rgb"; rgb: [number, number, number] | null }; // null = missing/incomplete RGB values

export type Token =
  | { type: "text"; text: string }
  | { type: "set-fg-color"; color: RawColor }
  | { type: "set-bg-color"; color: RawColor }
  | { type: "reset-fg-color" }
  | { type: "reset-bg-color" }
  | { type: "reset-all" }
  | { type: "bold" }
  | { type: "dim" }
  | { type: "italic" }
  | { type: "underline" }
  | { type: "blink" }
  | { type: "reverse" }
  | { type: "hidden" }
  | { type: "strikethrough" }
  | { type: "no-bold" }
  | { type: "no-dim" }
  | { type: "no-italic" }
  | { type: "no-underline" }
  | { type: "no-blink" }
  | { type: "no-reverse" }
  | { type: "no-hidden" }
  | { type: "no-strikethrough" }
  // other
  | { type: "unknown"; sequence: string };

// Define handler types
type TokenHandler = (code: number) => Token | Token[];

function createSGRLookup(): Record<number, TokenHandler> {
  const lookup: Record<number, TokenHandler> = {
    // Resets
    0: () => ({ type: "reset-all" }),

    // Text attributes
    1: () => ({ type: "bold" }),
    2: () => ({ type: "dim" }),
    3: () => ({ type: "italic" }),
    4: () => ({ type: "underline" }),
    5: () => ({ type: "blink" }),
    7: () => ({ type: "reverse" }),
    8: () => ({ type: "hidden" }),
    9: () => ({ type: "strikethrough" }),

    // Remove text attributes
    21: () => ({ type: "no-bold" }),
    22: () => [{ type: "no-bold" }, { type: "no-dim" }], // Returns array
    23: () => ({ type: "no-italic" }),
    24: () => ({ type: "no-underline" }),
    25: () => ({ type: "no-blink" }),
    27: () => ({ type: "no-reverse" }),
    28: () => ({ type: "no-hidden" }),
    29: () => ({ type: "no-strikethrough" }),

    // Color resets
    39: () => ({ type: "reset-fg-color" }),
    49: () => ({ type: "reset-bg-color" }),
  };

  // Add range handlers using a loop
  // 16-color foreground (30-37)
  for (let i = 30; i <= 37; i++) {
    lookup[i] = (code) => ({
      type: "set-fg-color",
      color: { type: "16", code: code - 30 },
    });
  }

  // 16-color background (40-47)
  for (let i = 40; i <= 47; i++) {
    lookup[i] = (code) => ({
      type: "set-bg-color",
      color: { type: "16", code: code - 40 },
    });
  }

  // Bright 16-color foreground (90-97)
  for (let i = 90; i <= 97; i++) {
    lookup[i] = (code) => ({
      type: "set-fg-color",
      color: { type: "16", code: code - 90 + 8 },
    });
  }

  // Bright 16-color background (100-107)
  for (let i = 100; i <= 107; i++) {
    lookup[i] = (code) => ({
      type: "set-bg-color",
      color: { type: "16", code: code - 100 + 8 },
    });
  }

  return lookup;
}

const SGR_LOOKUP = createSGRLookup();

export type Tokenizer = {
  push(input: string): Token[];
  reset(): void;
};

export function createTokenizer(): Tokenizer {
  let buffer = "";

  const isTerminator = (char: string): boolean => {
    return char >= "@" && char <= "~";
  };

  const handleSGR = (params: string): Token[] => {
    const tokens: Token[] = [];

    // Special case: completely empty params means reset
    if (params === "") {
      tokens.push({ type: "reset-all" });
      return tokens;
    }

    // Parse parameters
    let start = 0;
    let i = 0;

    // Process each parameter
    while (i <= params.length) {
      // Found separator or end of string
      if (i === params.length || params[i] === ";") {
        const segment = params.slice(start, i);
        const code = segment === "" ? null : parseInt(segment, 10);

        if (code !== null && !isNaN(code)) {
          // Process the code based on its value
          processCode(code, params, start, i, tokens);
        }

        start = i + 1;
      }
      i++;
    }

    return tokens;

    function processCode(
      code: number,
      params: string,
      segmentStart: number,
      segmentEnd: number,
      tokens: Token[]
    ) {
      // For codes that need to look ahead (38, 48), we need special handling
      if (code === 38 || code === 48) {
        // Parse the next parameters manually
        let pos = segmentEnd + 1; // Skip the semicolon

        // Get next parameter (mode: 2 or 5)
        const modeStart = pos;
        while (pos < params.length && params[pos] !== ";") pos++;
        const modeStr = params.slice(modeStart, pos);
        const mode = modeStr === "" ? null : parseInt(modeStr, 10);

        if (mode === 5) {
          // 256-color mode
          pos++; // Skip semicolon
          const colorStart = pos;
          while (pos < params.length && params[pos] !== ";") pos++;
          const colorStr = params.slice(colorStart, pos);
          const colorCode = colorStr === "" ? null : parseInt(colorStr, 10);

          tokens.push({
            type: code === 38 ? "set-fg-color" : "set-bg-color",
            color: { type: "256", code: isNaN(colorCode!) ? null : colorCode },
          });

          // Skip the processed parameters
          i = pos - 1; // -1 because the outer loop will increment
          start = pos + 1;
        } else if (mode === 2) {
          // RGB mode - need exactly 3 more values
          const rgbValues: (number | null)[] = [];

          for (let j = 0; j < 3; j++) {
            pos++; // Skip semicolon
            const valueStart = pos;
            while (pos < params.length && params[pos] !== ";") pos++;
            const valueStr = params.slice(valueStart, pos);
            const value = valueStr === "" ? null : parseInt(valueStr, 10);
            rgbValues.push(value);
          }

          // Check if all RGB values are valid
          if (rgbValues.every((v) => v !== null && !isNaN(v))) {
            tokens.push({
              type: code === 38 ? "set-fg-color" : "set-bg-color",
              color: {
                type: "rgb",
                rgb: rgbValues as [number, number, number],
              },
            });
            i = pos - 1;
            start = pos + 1;
          } else {
            // Invalid RGB - emit as unknown
            const endPos = Math.min(segmentStart + 20, params.length); // Reasonable limit
            tokens.push({
              type: "unknown",
              sequence: `\x1b[${params.slice(segmentStart, endPos)}m`,
            });
            i = endPos - 1;
            start = endPos + 1;
          }
        } else {
          // Invalid mode or missing mode
          const endPos =
            modeStart > segmentEnd ? modeStart + modeStr.length : segmentEnd;
          tokens.push({
            type: "unknown",
            sequence: `\x1b[${params.slice(segmentStart, endPos)}m`,
          });
          i = endPos - 1;
          start = endPos + 1;
        }

        return;
      }

      const handler = SGR_LOOKUP[code];
      if (handler) {
        const result = handler(code);
        if (Array.isArray(result)) {
          tokens.push(...result);
        } else {
          tokens.push(result);
        }
      }

      // If no handler found, code is ignored (unknown SGR codes are typically ignored)
    }
  };

  const push = (input: string): Token[] => {
    const tokens: Token[] = [];
    const fullInput = buffer + input;
    buffer = "";

    // Use array for text accumulation instead of string concatenation
    const textChunks: string[] = [];
    let i = 0;

    while (i < fullInput.length) {
      if (fullInput[i] === "\x1b") {
        // Check if we have enough characters for a complete escape sequence start
        if (i + 1 >= fullInput.length) {
          // Incomplete escape sequence, buffer it
          if (textChunks.length > 0) {
            tokens.push({ type: "text", text: textChunks.join("") });
            textChunks.length = 0; // Clear array
          }
          buffer = fullInput.slice(i);
          break;
        }

        if (fullInput[i + 1] === "[") {
          // Save any accumulated text
          if (textChunks.length > 0) {
            tokens.push({ type: "text", text: textChunks.join("") });
            textChunks.length = 0; // Clear array
          }

          // Find the end of the escape sequence
          let j = i + 2;
          while (j < fullInput.length && !isTerminator(fullInput[j]!)) {
            // Safe: j < fullInput.length ensures character exists
            j++;
          }

          if (j >= fullInput.length) {
            // Incomplete sequence, buffer it
            buffer = fullInput.slice(i);
            break;
          }

          // Parse the complete sequence
          const params = fullInput.slice(i + 2, j);
          const terminator = fullInput[j];

          if (terminator === "m") {
            tokens.push(...handleSGR(params));
          } else {
            // Non-SGR sequence - emit as unknown
            const sequence = fullInput.slice(i, j + 1);
            tokens.push({ type: "unknown", sequence });
          }

          i = j + 1;
        } else {
          // Not an escape sequence, treat as regular text
          // Grab span of plain text instead of character by character
          const textStart = i;
          while (i < fullInput.length && fullInput[i] !== "\x1b") {
            i++;
          }
          textChunks.push(fullInput.slice(textStart, i));
        }
      } else {
        // Grab span of plain text instead of character by character
        const textStart = i;
        while (i < fullInput.length && fullInput[i] !== "\x1b") {
          i++;
        }
        if (i > textStart) {
          textChunks.push(fullInput.slice(textStart, i));
        }
      }
    }

    // Handle any remaining text
    if (textChunks.length > 0) {
      tokens.push({ type: "text", text: textChunks.join("") });
    }

    return tokens;
  };

  const reset = (): void => {
    buffer = "";
  };

  return {
    push,
    reset,
  };
}
