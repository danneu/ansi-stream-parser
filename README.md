# ansi-stream-parser

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

The parser maintains state across multiple calls, making it ideal for streaming:

However, note that you must consume the return value of each `push` call or you
will lose the parsed results.

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
