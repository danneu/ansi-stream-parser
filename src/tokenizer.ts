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
  | { type: "bold"; enable: boolean }
  | { type: "dim"; enable: boolean }
  | { type: "italic"; enable: boolean }
  | { type: "underline"; enable: boolean }
  | { type: "blink"; enable: boolean }
  | { type: "reverse"; enable: boolean }
  | { type: "hidden"; enable: boolean }
  | { type: "strikethrough"; enable: boolean }
  // other
  | { type: "unknown"; sequence: string };

type TokenHandler = (code: number) => Token | Token[];

function createSGRLookup(): Record<number, TokenHandler> {
  const fg16 = (code: number): Token => ({
    type: "set-fg-color",
    color: { type: "16", code: code - 30 },
  });

  const bg16 = (code: number): Token => ({
    type: "set-bg-color",
    color: { type: "16", code: code - 40 },
  });

  const fg16b = (code: number): Token => ({
    type: "set-fg-color",
    color: { type: "16", code: code - 90 + 8 },
  });

  const bg16b = (code: number): Token => ({
    type: "set-bg-color",
    color: { type: "16", code: code - 100 + 8 },
  });

  return {
    // Resets
    0: () => ({ type: "reset-all" }),

    // Text attributes
    1: () => ({ type: "bold", enable: true }),
    2: () => ({ type: "dim", enable: true }),
    3: () => ({ type: "italic", enable: true }),
    4: () => ({ type: "underline", enable: true }),
    5: () => ({ type: "blink", enable: true }),
    7: () => ({ type: "reverse", enable: true }),
    8: () => ({ type: "hidden", enable: true }),
    9: () => ({ type: "strikethrough", enable: true }),

    // Remove text attributes
    21: () => ({ type: "bold", enable: false }),
    22: () => [
      { type: "bold", enable: false },
      { type: "dim", enable: false },
    ],
    23: () => ({ type: "italic", enable: false }),
    24: () => ({ type: "underline", enable: false }),
    25: () => ({ type: "blink", enable: false }),
    27: () => ({ type: "reverse", enable: false }),
    28: () => ({ type: "hidden", enable: false }),
    29: () => ({ type: "strikethrough", enable: false }),

    // 16-color foreground (30-37)
    30: fg16,
    31: fg16,
    32: fg16,
    33: fg16,
    34: fg16,
    35: fg16,
    36: fg16,
    37: fg16,

    // 16-color background (40-47)
    40: bg16,
    41: bg16,
    42: bg16,
    43: bg16,
    44: bg16,
    45: bg16,
    46: bg16,
    47: bg16,

    // Bright 16-color foreground (90-97)
    90: fg16b,
    91: fg16b,
    92: fg16b,
    93: fg16b,
    94: fg16b,
    95: fg16b,
    96: fg16b,
    97: fg16b,

    // Bright 16-color background (100-107)
    100: bg16b,
    101: bg16b,
    102: bg16b,
    103: bg16b,
    104: bg16b,
    105: bg16b,
    106: bg16b,
    107: bg16b,

    // Color resets
    39: () => ({ type: "reset-fg-color" }),
    49: () => ({ type: "reset-bg-color" }),
  };
}

const SGR_LOOKUP = createSGRLookup();

const CHAR_CODES = {
  ESC: 0x1b, // 27  - Escape character
  LEFT_BRACKET: 0x5b, // 91  - '['
  SEMICOLON: 0x3b, // 59  - ';'
  AT: 0x40, // 64  - '@'
  TILDE: 0x7e, // 126 - '~'
  LOWER_M: 0x6d, // 109 - 'm'
  MINUS: 0x2d, // 45 - '-'
  DIGIT_0: 0x30, // 48 - '0'
  DIGIT_9: 0x39, // 57 - '9'
} as const;

export type Tokenizer = {
  push(input: string): Token[];
  reset(): void;
};

const isTerminatorCode = (charCode: number): boolean => {
  return charCode >= CHAR_CODES.AT && charCode <= CHAR_CODES.TILDE;
};

const isParameterChar = (charCode: number): boolean => {
  const isDigit =
    charCode >= CHAR_CODES.DIGIT_0 && charCode <= CHAR_CODES.DIGIT_9;
  return (
    isDigit ||
    charCode === CHAR_CODES.SEMICOLON ||
    charCode === CHAR_CODES.MINUS
  );
};

// Find next semicolon or end of string within bounds
function findNextSemicolon(
  str: string,
  start: number,
  maxEnd?: number,
): number {
  let pos = start;
  const end = maxEnd ?? str.length;
  while (pos < end && str.charCodeAt(pos) !== CHAR_CODES.SEMICOLON) {
    pos++;
  }
  return pos;
}

// Build ANSI sequence without intermediate slicing
// Includes the full sequence from \x1b[ through the end position (exclusive)
function buildSequence(input: string, start: number, end: number): string {
  const chars: string[] = ["\x1b", "["];
  for (let i = start; i < end; i++) {
    chars.push(input.charAt(i));
  }
  return chars.join("");
}

// Parse integer from string range without slicing
export function parseIntFromRange(
  str: string,
  start: number,
  end: number,
): number | null {
  if (start >= end || start < 0 || start >= str.length) return null;

  let pos = start;
  let negative = false;

  // Clamp end to string length
  const actualEnd = Math.min(end, str.length);
  if (pos >= actualEnd) return null;

  // Check for negative sign
  if (str.charCodeAt(pos) === 45) {
    // 45 = '-'
    negative = true;
    pos++;
    if (pos >= actualEnd) return null; // Just a minus sign
  }

  let result = 0;
  for (let i = pos; i < actualEnd; i++) {
    const digit = str.charCodeAt(i) - 48; // 48 = '0'
    if (digit < 0 || digit > 9) return null;
    result = result * 10 + digit;
  }

  // Handle -0 case to return 0
  return negative && result !== 0 ? -result : result;
}

export function createTokenizer(): Tokenizer {
  let buffer = "";

  const handleSGR = (
    input: string,
    startPos: number,
    endPos: number,
  ): Token[] => {
    const tokens: Token[] = [];

    // Special case: completely empty params means reset
    if (startPos === endPos) {
      tokens.push({ type: "reset-all" });
      return tokens;
    }

    // Parse parameters
    let start = startPos;
    let i = startPos;

    // Process each parameter
    while (i <= endPos) {
      // Found separator or end of string
      if (i === endPos || input.charCodeAt(i) === CHAR_CODES.SEMICOLON) {
        const code = parseIntFromRange(input, start, i);

        if (code !== null && !isNaN(code)) {
          // Process the code based on its value
          processCode(code, input, start, i, tokens, startPos, endPos);
        }

        start = i + 1;
      }
      i++;
    }

    return tokens;

    function processCode(
      code: number,
      input: string,
      segmentStart: number,
      segmentEnd: number,
      tokens: Token[],
      _paramsStart: number,
      paramsEnd: number,
    ) {
      // For codes that need to look ahead (38, 48), we need special handling
      if (code === 38 || code === 48) {
        let pos = segmentEnd + 1; // Skip semicolon after 38/48

        // Parse mode (2 or 5)
        const modeEnd = findNextSemicolon(input, pos, paramsEnd);
        const mode = parseIntFromRange(input, pos, modeEnd);

        if (mode === 5) {
          // 256-color: parse one more number
          pos = modeEnd + 1;
          const colorEnd = findNextSemicolon(input, pos, paramsEnd);
          const colorCode = parseIntFromRange(input, pos, colorEnd);

          tokens.push({
            type: code === 38 ? "set-fg-color" : "set-bg-color",
            color: { type: "256", code: colorCode },
          });

          // Update loop position
          i = colorEnd - 1;
          start = colorEnd + 1;
        } else if (mode === 2) {
          // RGB: parse three more numbers
          const rgbValues: (number | null)[] = [];
          pos = modeEnd + 1;

          for (let j = 0; j < 3; j++) {
            const valueEnd = findNextSemicolon(input, pos, paramsEnd);
            rgbValues.push(parseIntFromRange(input, pos, valueEnd));
            pos = valueEnd + 1;
          }

          if (rgbValues.every((v) => v !== null)) {
            tokens.push({
              type: code === 38 ? "set-fg-color" : "set-bg-color",
              color: {
                type: "rgb",
                rgb: rgbValues as [number, number, number],
              },
            });
          } else {
            // Invalid RGB - emit as unknown
            // Include any RGB values/semicolons that were present
            tokens.push({
              type: "unknown",
              sequence: buildSequence(input, segmentStart, paramsEnd + 1),
            });
          }

          // Update loop position to continue after RGB values
          // pos is now after the 3 RGB values, so continue from there
          i = pos - 2; // -2 because loop will increment and we want to continue at pos-1
          start = pos - 1;
        } else {
          // Invalid mode or missing mode
          tokens.push({
            type: "unknown",
            sequence: buildSequence(input, segmentStart, paramsEnd + 1),
          });
          // Skip to the end since we consumed all params
          i = paramsEnd;
          start = paramsEnd + 1;
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
      const charCode = fullInput.charCodeAt(i);

      if (charCode === CHAR_CODES.ESC) {
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

        const nextCharCode = fullInput.charCodeAt(i + 1);

        if (nextCharCode === CHAR_CODES.LEFT_BRACKET) {
          // Save any accumulated text
          if (textChunks.length > 0) {
            tokens.push({ type: "text", text: textChunks.join("") });
            textChunks.length = 0; // Clear array
          }

          // Find the end of the escape sequence
          let j = i + 2;
          let foundTerminator = false;
          while (j < fullInput.length) {
            const currentCode = fullInput.charCodeAt(j);

            if (isTerminatorCode(currentCode)) {
              // Found valid terminator
              if (currentCode === CHAR_CODES.LOWER_M) {
                tokens.push(...handleSGR(fullInput, i + 2, j));
              } else {
                // Non-SGR sequence - emit as unknown
                const sequence = fullInput.slice(i, j + 1);
                tokens.push({ type: "unknown", sequence });
              }

              i = j + 1;
              foundTerminator = true;
              break;
            } else if (isParameterChar(currentCode)) {
              // Valid parameter character, continue parsing
              j++;
            } else {
              // Invalid character - not a parameter and not a valid terminator
              // Treat as unknown sequence (without the invalid character)
              const sequence = fullInput.slice(i, j);
              tokens.push({ type: "unknown", sequence });

              i = j; // Continue from the invalid character
              foundTerminator = true;
              break;
            }
          }

          if (!foundTerminator) {
            // Incomplete sequence, buffer it
            buffer = fullInput.slice(i);
            break;
          }
        } else {
          // Not an escape sequence, treat as regular text
          // Grab span of plain text instead of character by character
          const textStart = i;
          while (
            i < fullInput.length &&
            fullInput.charCodeAt(i) !== CHAR_CODES.ESC
          ) {
            i++;
          }
          textChunks.push(fullInput.slice(textStart, i));
        }
      } else {
        // Grab span of plain text instead of character by character
        const textStart = i;
        while (
          i < fullInput.length &&
          fullInput.charCodeAt(i) !== CHAR_CODES.ESC
        ) {
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
