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

    const codes = params.split(";").map((p) => {
      const parsed = parseInt(p, 10);
      return isNaN(parsed) ? null : parsed;
    });

    // Keep track of original parameter segments for reconstruction
    const paramSegments = params.split(";");

    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];

      // Skip null codes (empty parameters)
      if (code === null) continue;

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

        case 38:
          // Extended foreground color (256 or RGB)
          if (codes[i + 1] === 5) {
            if (i + 2 < codes.length) {
              // 256-color mode with color code
              const colorCode = codes[i + 2] ?? null;
              tokens.push({
                type: "set-fg-color",
                color: { type: "256", code: colorCode },
              });
              i += 2;
            } else {
              // Missing color code: \x1b[38;5m
              tokens.push({
                type: "set-fg-color",
                color: { type: "256", code: null },
              });
              i += 1;
            }
          } else if (codes[i + 1] === 2) {
            // RGB mode - requires exactly 3 more parameters
            if (
              i + 4 < codes.length &&
              codes[i + 2] !== null &&
              codes[i + 3] !== null &&
              codes[i + 4] !== null
            ) {
              // Valid RGB sequence
              const r = codes[i + 2]!;
              const g = codes[i + 3]!;
              const b = codes[i + 4]!;
              tokens.push({
                type: "set-fg-color",
                color: { type: "rgb", rgb: [r, g, b] },
              });
              i += 4;
            } else {
              // Invalid RGB - reconstruct the original sequence
              const startIdx = i;
              let endIdx = i + 1; // At least include 38

              // Find how many parameters belong to this RGB attempt
              if (codes[i + 1] === 2) {
                endIdx = Math.min(i + 5, codes.length); // Could be 38;2;r;g;b
              }

              // Reconstruct the original parameter string
              const originalParams = paramSegments
                .slice(startIdx, endIdx)
                .join(";");
              tokens.push({
                type: "unknown",
                sequence: `\x1b[${originalParams}m`,
              });
              i = endIdx - 1;
            }
          } else if (codes[i + 1] === null || i + 1 >= codes.length) {
            // Just 38 with no subparameter: \x1b[38m
            tokens.push({ type: "unknown", sequence: "\x1b[38m" });
          } else {
            // Invalid subparameter (not 2 or 5): \x1b[38;99m
            const originalParams = paramSegments.slice(i, i + 2).join(";");
            tokens.push({
              type: "unknown",
              sequence: `\x1b[${originalParams}m`,
            });
            i += 1;
          }
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

        case 48:
          // Extended background color (256 or RGB)
          if (codes[i + 1] === 5) {
            if (i + 2 < codes.length) {
              const colorCode = codes[i + 2] ?? null;
              tokens.push({
                type: "set-bg-color",
                color: { type: "256", code: colorCode },
              });
              i += 2;
            } else {
              tokens.push({
                type: "set-bg-color",
                color: { type: "256", code: null },
              });
              i += 1;
            }
          } else if (codes[i + 1] === 2) {
            if (
              i + 4 < codes.length &&
              codes[i + 2] !== null &&
              codes[i + 3] !== null &&
              codes[i + 4] !== null
            ) {
              const r = codes[i + 2]!;
              const g = codes[i + 3]!;
              const b = codes[i + 4]!;
              tokens.push({
                type: "set-bg-color",
                color: { type: "rgb", rgb: [r, g, b] },
              });
              i += 4;
            } else {
              // Invalid RGB - reconstruct the original sequence
              const startIdx = i;
              let endIdx = i + 1; // At least include 48

              // Find how many parameters belong to this RGB attempt
              if (codes[i + 1] === 2) {
                endIdx = Math.min(i + 5, codes.length); // Could be 48;2;r;g;b
              }

              // Reconstruct the original parameter string
              const originalParams = paramSegments
                .slice(startIdx, endIdx)
                .join(";");
              tokens.push({
                type: "unknown",
                sequence: `\x1b[${originalParams}m`,
              });
              i = endIdx - 1;
            }
          } else if (codes[i + 1] === null || i + 1 >= codes.length) {
            tokens.push({ type: "unknown", sequence: "\x1b[48m" });
          } else {
            // Invalid subparameter (not 2 or 5): \x1b[48;99m
            const originalParams = paramSegments.slice(i, i + 2).join(";");
            tokens.push({
              type: "unknown",
              sequence: `\x1b[${originalParams}m`,
            });
            i += 1;
          }
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

    return tokens;
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
