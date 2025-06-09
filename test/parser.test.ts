import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import { Color16, createParser, Decoration } from "../src/index.js";

describe("ANSI Parser", () => {
  test("should parse plain text", () => {
    const parser = createParser();
    const chunks = parser.push("hello world");

    assert.deepEqual(chunks, [{ text: "hello world" }]);
  });

  test("should parse colored text", () => {
    const parser = createParser();
    const chunks = parser.push("\x1b[31mred text\x1b[0m");

    assert.deepEqual(chunks, [
      {
        text: "red text",
        fg: { type: "16", code: Color16.red },
      },
    ]);
  });

  test("should parse background colors", () => {
    const parser = createParser();
    const chunks = parser.push("\x1b[41mred background\x1b[0m");

    assert.deepEqual(chunks, [
      {
        text: "red background",
        bg: { type: "16", code: Color16.red },
      },
    ]);
  });

  test("should parse text decorations", () => {
    const parser = createParser();
    const chunks = parser.push("\x1b[1mbold\x1b[0m");

    assert.deepEqual(chunks, [
      {
        text: "bold",
        decorations: [Decoration.bold],
      },
    ]);
  });

  test("should accumulate multiple decorations", () => {
    const parser = createParser();
    const chunks = parser.push("\x1b[1m\x1b[4mbold underlined\x1b[0m");

    assert.deepEqual(chunks, [
      {
        text: "bold underlined",
        decorations: [Decoration.bold, Decoration.underline],
      },
    ]);
  });

  test("should handle combined styles", () => {
    const parser = createParser();
    const chunks = parser.push("\x1b[1;31;41mbold red on red\x1b[0m");

    assert.deepEqual(chunks, [
      {
        text: "bold red on red",
        fg: { type: "16", code: Color16.red },
        bg: { type: "16", code: Color16.red },
        decorations: [Decoration.bold],
      },
    ]);
  });

  test("should maintain style across multiple text chunks", () => {
    const parser = createParser();
    const chunks = parser.push("\x1b[31mred");

    assert.deepEqual(chunks, [
      {
        text: "red",
        fg: { type: "16", code: Color16.red },
      },
    ]);

    const chunks2 = parser.push(" more red\x1b[0m");
    assert.deepEqual(chunks2, [
      {
        text: " more red",
        fg: { type: "16", code: Color16.red },
      },
    ]);
  });

  test("should handle style changes within text", () => {
    const parser = createParser();
    const chunks = parser.push("normal \x1b[31mred\x1b[0m normal");

    assert.deepEqual(chunks, [
      { text: "normal " },
      {
        text: "red",
        fg: { type: "16", code: Color16.red },
      },
      { text: " normal" },
    ]);
  });

  test("should handle 256 colors", () => {
    const parser = createParser();
    const chunks = parser.push("\x1b[38;5;196mred\x1b[0m");

    assert.deepEqual(chunks, [
      {
        text: "red",
        fg: { type: "256", code: 196 },
      },
    ]);
  });

  test("should handle RGB colors", () => {
    const parser = createParser();
    const chunks = parser.push("\x1b[38;2;255;0;0mred\x1b[0m");

    assert.deepEqual(chunks, [
      {
        text: "red",
        fg: { type: "rgb", rgb: [255, 0, 0] },
      },
    ]);
  });

  test("should handle partial color resets", () => {
    const parser = createParser();
    const chunks = parser.push(
      "\x1b[31;41mred on red\x1b[39m no fg\x1b[49m no bg"
    );

    assert.deepEqual(chunks, [
      {
        text: "red on red",
        fg: { type: "16", code: Color16.red },
        bg: { type: "16", code: Color16.red },
      },
      {
        text: " no fg",
        bg: { type: "16", code: Color16.red },
      },
      { text: " no bg" },
    ]);
  });

  test("should handle decoration removal", () => {
    const parser = createParser();
    const chunks = parser.push(
      "\x1b[1;4mbold underlined\x1b[21m no bold\x1b[24m no underline"
    );

    assert.deepEqual(chunks, [
      {
        text: "bold underlined",
        decorations: [Decoration.bold, Decoration.underline],
      },
      {
        text: " no bold",
        decorations: [Decoration.underline],
      },
      { text: " no underline" },
    ]);
  });

  test("should handle dim and bold reset together", () => {
    const parser = createParser();
    const chunks = parser.push("\x1b[1;2mbold dim\x1b[22m neither");

    assert.deepEqual(chunks, [
      {
        text: "bold dim",
        decorations: [Decoration.bold, Decoration.dim],
      },
      { text: " neither" },
    ]);
  });

  test("should ignore unknown sequences", () => {
    const parser = createParser();
    const chunks = parser.push("text\x1b[10;20H\x1b[31mred\x1b[2J");

    assert.deepEqual(chunks, [
      { text: "text" },
      {
        text: "red",
        fg: { type: "16", code: Color16.red },
      },
    ]);
  });

  test("should handle bright colors", () => {
    const parser = createParser();
    const chunks = parser.push("\x1b[91mbright red\x1b[0m");

    assert.deepEqual(chunks, [
      {
        text: "bright red",
        fg: { type: "16", code: Color16.brightRed },
      },
    ]);
  });

  test("should handle streaming input with buffering", () => {
    const parser = createParser();

    // Split escape sequence across pushes
    let chunks = parser.push("hello \x1b[");
    assert.deepEqual(chunks, [{ text: "hello " }]);

    chunks = parser.push("31mred\x1b[0m");
    assert.deepEqual(chunks, [
      {
        text: "red",
        fg: { type: "16", code: Color16.red },
      },
    ]);
  });

  test("should reset both tokenizer and style state", () => {
    const parser = createParser();

    // Set up some style and buffer incomplete sequence
    parser.push("\x1b[31;1mred bold\x1b[");
    parser.reset();

    // Should start fresh
    const chunks = parser.push("normal text");
    assert.deepEqual(chunks, [{ text: "normal text" }]);
  });

  test("should handle empty input", () => {
    const parser = createParser();
    const chunks = parser.push("");

    assert.deepEqual(chunks, []);
  });

  test("should handle all decoration types", () => {
    const parser = createParser();
    const chunks = parser.push("\x1b[1;2;3;4;5;7;8;9mall decorations\x1b[0m");

    assert.deepEqual(chunks, [
      {
        text: "all decorations",
        decorations: [
          Decoration.bold,
          Decoration.dim,
          Decoration.italic,
          Decoration.underline,
          Decoration.blink,
          Decoration.reverse,
          Decoration.hidden,
          Decoration.strikethrough,
        ],
      },
    ]);
  });

  test("should not include empty decorations array", () => {
    const parser = createParser();
    const chunks = parser.push("no decorations");

    assert.deepEqual(chunks, [{ text: "no decorations" }]);

    // decorations property should not exist
    assert.equal(chunks[0]?.decorations, undefined);
  });

  test("should not include undefined colors", () => {
    const parser = createParser();
    const chunks = parser.push("no colors");

    assert.deepEqual(chunks, [{ text: "no colors" }]);

    // fg and bg properties should not exist
    assert.equal(chunks[0]?.fg, undefined);
    assert.equal(chunks[0]?.bg, undefined);
  });

  test("should handle missing 256-color code by resetting color", () => {
    const parser = createParser();
    const chunks = parser.push("\x1b[38;5mtext\x1b[0m");

    assert.deepEqual(chunks, [
      {
        text: "text",
        // Invalid 256 color (missing code) resets fg color
      },
    ]);
  });

  test("should ignore malformed RGB sequences as unknown", () => {
    const parser = createParser();

    // Missing all RGB values - now treated as unknown
    let chunks = parser.push("\x1b[38;2mtext1\x1b[0m");
    assert.deepEqual(chunks, [
      { text: "text1" }, // Unknown sequence ignored
    ]);

    // Missing some RGB values - now treated as unknown
    chunks = parser.push("\x1b[38;2;128;64mtext2\x1b[0m");
    assert.deepEqual(chunks, [
      { text: "text2" }, // Unknown sequence ignored
    ]);
  });

  test("should handle missing background color codes by resetting color", () => {
    const parser = createParser();

    // Missing 256-color background
    let chunks = parser.push("\x1b[48;5mtext1\x1b[0m");
    assert.deepEqual(chunks, [
      {
        text: "text1",
        // Invalid 256 bg color (missing code) resets bg color
      },
    ]);

    // Missing RGB background values - now treated as unknown
    chunks = parser.push("\x1b[48;2;100mtext2\x1b[0m");

    assert.deepEqual(chunks, [
      { text: "text2" }, // Unknown sequence ignored
    ]);
  });

  test("should ignore unknown sequences from invalid color modes", () => {
    const parser = createParser();

    // Invalid color mode (99 is not valid)
    let chunks = parser.push("\x1b[38;99mtext1\x1b[31mred");
    assert.deepEqual(chunks, [
      { text: "text1" }, // Unknown sequence ignored
      {
        text: "red",
        fg: { type: "16", code: Color16.red },
      },
    ]);

    // Missing color mode entirely (use fresh parser to avoid state carryover)
    const parser2 = createParser();
    chunks = parser2.push("\x1b[38mtext2");
    assert.deepEqual(chunks, [
      { text: "text2" }, // Unknown sequence ignored
    ]);
  });

  test("should reset color for out-of-range 256-color codes", () => {
    const parser = createParser();

    // Color code too high (> 255) - resets color
    let chunks = parser.push("\x1b[38;5;256mtext1\x1b[0m");
    assert.deepEqual(chunks, [
      {
        text: "text1",
        // Invalid 256 fg color (> 255) resets fg color
      },
    ]);

    // Negative color code - resets color
    chunks = parser.push("\x1b[48;5;-1mtext2\x1b[0m");
    assert.deepEqual(chunks, [
      {
        text: "text2",
        // Invalid 256 bg color (negative) resets bg color
      },
    ]);

    // Way too high - still resets color
    chunks = parser.push("\x1b[38;5;999mtext3\x1b[0m");
    assert.deepEqual(chunks, [
      {
        text: "text3",
        // Invalid 256 fg color (> 255) resets fg color
      },
    ]);

    // Valid edge cases should work normally
    chunks = parser.push("\x1b[38;5;0mtext4\x1b[48;5;255mtext5");
    assert.deepEqual(chunks, [
      {
        text: "text4",
        fg: { type: "256", code: 0 }, // Valid minimum
      },
      {
        text: "text5",
        fg: { type: "256", code: 0 },
        bg: { type: "256", code: 255 }, // Valid maximum
      },
    ]);
  });
});
