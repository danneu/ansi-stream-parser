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

      switch (code) {
        case 0:
          tokens.push({ type: "reset-all" });
          break;

        case 1:
          tokens.push({ type: "bold" });
          break;
        case 2:
          tokens.push({ type: "dim" });
          break;
        case 3:
          tokens.push({ type: "italic" });
          break;
        case 4:
          tokens.push({ type: "underline" });
          break;
        case 5:
          tokens.push({ type: "blink" });
          break;
        case 7:
          tokens.push({ type: "reverse" });
          break;
        case 8:
          tokens.push({ type: "hidden" });
          break;
        case 9:
          tokens.push({ type: "strikethrough" });
          break;

        case 21:
          tokens.push({ type: "no-bold" });
          break;
        case 22:
          tokens.push({ type: "no-bold" });
          tokens.push({ type: "no-dim" });
          break;
        case 23:
          tokens.push({ type: "no-italic" });
          break;
        case 24:
          tokens.push({ type: "no-underline" });
          break;
        case 25:
          tokens.push({ type: "no-blink" });
          break;
        case 27:
          tokens.push({ type: "no-reverse" });
          break;
        case 28:
          tokens.push({ type: "no-hidden" });
          break;
        case 29:
          tokens.push({ type: "no-strikethrough" });
          break;

        case 30:
        case 31:
        case 32:
        case 33:
        case 34:
        case 35:
        case 36:
        case 37:
          // 16-color foreground
          tokens.push({
            type: "set-fg-color",
            color: { type: "16", code: code - 30 },
          });
          break;

        case 38: // Extended foreground color (256 or RGB)
          // handled above
          break;

        case 39:
          tokens.push({ type: "reset-fg-color" });
          break;

        case 40:
        case 41:
        case 42:
        case 43:
        case 44:
        case 45:
        case 46:
        case 47:
          // 16-color background
          tokens.push({
            type: "set-bg-color",
            color: { type: "16", code: code - 40 },
          });
          break;

        case 48: // Extended background color (256 or RGB)
          // handled above
          break;

        case 49:
          tokens.push({ type: "reset-bg-color" });
          break;

        case 90:
        case 91:
        case 92:
        case 93:
        case 94:
        case 95:
        case 96:
        case 97:
          // Bright 16-color foreground
          tokens.push({
            type: "set-fg-color",
            color: { type: "16", code: code - 90 + 8 },
          });
          break;

        case 100:
        case 101:
        case 102:
        case 103:
        case 104:
        case 105:
        case 106:
        case 107:
          // Bright 16-color background
          tokens.push({
            type: "set-bg-color",
            color: { type: "16", code: code - 100 + 8 },
          });
          break;
      }
    }
  };

  const push = (input: string): Token[] => {
    const tokens: Token[] = [];
    const fullInput = buffer + input;
    buffer = "";

    let currentText = "";
    let i = 0;

    while (i < fullInput.length) {
      if (fullInput[i] === "\x1b") {
        // Check if we have enough characters for a complete escape sequence start
        if (i + 1 >= fullInput.length) {
          // Incomplete escape sequence, buffer it
          if (currentText) {
            tokens.push({ type: "text", text: currentText });
            currentText = "";
          }
          buffer = fullInput.slice(i);
          break;
        }

        if (fullInput[i + 1] === "[") {
          // Save any accumulated text
          if (currentText) {
            tokens.push({ type: "text", text: currentText });
            currentText = "";
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
          currentText += fullInput[i];
          i++;
        }
      } else {
        currentText += fullInput[i];
        i++;
      }
    }

    // Handle any remaining text
    if (currentText) {
      tokens.push({ type: "text", text: currentText });
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
