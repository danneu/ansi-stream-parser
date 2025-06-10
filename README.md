# ansi-stream-parser [![NPM Version](https://img.shields.io/npm/v/ansi-stream-parser)](https://www.npmjs.com/package/ansi-stream-parser)

A parser for ANSI escape sequence text (SGR) that works on streaming/partial input.

**Why another library?** I needed a parser that could handle both streaming and also 256-color codes.

## Installation

```bash
npm install ansi-stream-parser
```

## Usage

```typescript
import { createParser } from "ansi-stream-parser";

const parser = createParser();

// Parse ANSI text
const styled = parser.push("\x1b[32mHello\x1b[0m \x1b[1;31mWorld\x1b[0m!");

console.log(styled);
// [
//   { text: 'Hello', fg: { type: '16', code: 2 } },
//   { text: ' ' },
//   { text: 'World', fg: { type: '16', code: 1 }, decorations: ['bold'] },
//   { text: '!' }
// ]
```

## Streaming

The parser maintains state across multiple calls making it ideal for streaming:

**Note:** you must consume the return value of each `push` call or you will lose the parsed results.

```typescript
const parser = createParser();

// Feed data chunk by chunk
const a = parser.push("\x1b[38;5;");
// a is [] (still buffering)

const b = parser.push("123m");
// b is [] (still buffering)

const result = parser.push("Colored text\x1b[0m");
// result is [ { text: 'Colored text', fg: { type: '256', code: 123 } } ]
```

## Tokenizer

The library also exports a tokenizer that emits tokens.

```typescript
import { createTokenizer } from "ansi-stream-parser";

const tokenizer = createTokenizer();

// Tokenize ANSI text into individual tokens
const tokens = tokenizer.push("\x1b[32mHello\x1b[0m World");

console.log(tokens);
// [
//   { type: 'set-fg-color', color: { type: '16', code: 2 } },
//   { type: 'text', text: 'Hello' },
//   { type: 'reset-all' },
//   { type: 'text', text: ' World' }
// ]

// The tokenizer also handles streaming
const a = tokenizer.push("\x1b[38;5;"); // [] (buffering)
const b = tokenizer.push("196m"); // [{ type: 'set-fg-color', color: { type: '256', code: 196 } }]
const c = tokenizer.push("Red"); // [{ type: 'text', text: 'Red' }]

// Reset the tokenizer state
tokenizer.reset();
```

The tokenizer is useful when you need more control over token processing or want to implement your own styling logic.

## Color Helpers

The library provides color utilities for working with the parsed color values.

This is useful for when you're mapping `StyledText` parser output to HTML or other formats.

```typescript
import { getColor16Name, getColorHexCode, Color16 } from "ansi-stream-parser";

// Get color name for 16-color codes
const colorName = getColorName({ type: "16", code: 1 }); // "red"

// Convert any color to hex code
const hex16 = getColorHexCode({ type: "16", code: Color16.red }); // "#aa0000"
const hex256 = getColorHexCode({ type: "256", code: 196 }); // "#ff0000"
const hexRgb = getColorHexCode({ type: "rgb", rgb: [255, 0, 0] }); // "#ff0000"

// Use a custom palette for 16-color codes
const customPalette = [
  [0, 0, 0], // black
  [255, 0, 0], // red (brighter)
  [0, 255, 0], // green (brighter)
  [255, 255, 0], // yellow (brighter)
  // ... continue for all 16 colors
] as const;

const customHex = getColorHexCode({ type: "16", code: 1 }, customPalette); // "#ff0000"
```
