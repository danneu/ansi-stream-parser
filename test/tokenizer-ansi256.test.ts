import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import { createTokenizer, type Token } from "../src/index.js";

describe("ANSI 256 Colors", () => {
  test("should handle basic 256 foreground colors", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push(
      "\x1b[38;5;0mColor 0\x1b[0m " +
        "\x1b[38;5;128mColor 128\x1b[0m " +
        "\x1b[38;5;255mColor 255\x1b[0m",
    );

    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "256", code: 0 } },
      { type: "text", text: "Color 0" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "256", code: 128 } },
      { type: "text", text: "Color 128" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "256", code: 255 } },
      { type: "text", text: "Color 255" },
      { type: "reset-all" },
    ]);
  });

  test("should handle basic 256 background colors", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push(
      "\x1b[48;5;0mBG 0\x1b[0m " +
        "\x1b[48;5;128mBG 128\x1b[0m " +
        "\x1b[48;5;255mBG 255\x1b[0m",
    );

    assert.deepEqual(tokens, [
      { type: "set-bg-color", color: { type: "256", code: 0 } },
      { type: "text", text: "BG 0" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-bg-color", color: { type: "256", code: 128 } },
      { type: "text", text: "BG 128" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-bg-color", color: { type: "256", code: 255 } },
      { type: "text", text: "BG 255" },
      { type: "reset-all" },
    ]);
  });

  test("should handle boundary values correctly", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push(
      "\x1b[38;5;0mMin\x1b[0m " + // Minimum valid value
        "\x1b[38;5;255mMax\x1b[0m " + // Maximum valid value
        "\x1b[38;5;15m16th\x1b[0m " + // Last of 16-color range
        "\x1b[38;5;16m17th\x1b[0m " + // First extended color
        "\x1b[38;5;231mLast RGB\x1b[0m " + // Last of 216 RGB colors
        "\x1b[38;5;232mFirst Gray\x1b[0m", // First grayscale
    );

    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "256", code: 0 } },
      { type: "text", text: "Min" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "256", code: 255 } },
      { type: "text", text: "Max" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "256", code: 15 } },
      { type: "text", text: "16th" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "256", code: 16 } },
      { type: "text", text: "17th" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "256", code: 231 } },
      { type: "text", text: "Last RGB" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "256", code: 232 } },
      { type: "text", text: "First Gray" },
      { type: "reset-all" },
    ]);
  });

  test("should handle 256 color split across multiple pushes", () => {
    const tokenizer = createTokenizer();

    let tokens = tokenizer.push("\x1b[38;");
    assert.deepEqual(tokens, []);

    tokens = tokenizer.push("5;");
    assert.deepEqual(tokens, []);

    tokens = tokenizer.push("196");
    assert.deepEqual(tokens, []);

    tokens = tokenizer.push("mRed");
    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "256", code: 196 } },
      { type: "text", text: "Red" },
    ]);
  });

  test("should handle 256 color split at each semicolon", () => {
    const tokenizer = createTokenizer();

    let tokens = tokenizer.push("\x1b[38");
    assert.deepEqual(tokens, []);

    tokens = tokenizer.push(";");
    assert.deepEqual(tokens, []);

    tokens = tokenizer.push("5");
    assert.deepEqual(tokens, []);

    tokens = tokenizer.push(";");
    assert.deepEqual(tokens, []);

    tokens = tokenizer.push("100mText");
    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "256", code: 100 } },
      { type: "text", text: "Text" },
    ]);
  });

  test("should handle multi-digit color codes split", () => {
    const tokenizer = createTokenizer();

    let tokens = tokenizer.push("\x1b[38;5;2");
    assert.deepEqual(tokens, []);

    tokens = tokenizer.push("5");
    assert.deepEqual(tokens, []);

    tokens = tokenizer.push("5mMax color");
    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "256", code: 255 } },
      { type: "text", text: "Max color" },
    ]);
  });

  test("should handle single digit color codes", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push(
      "\x1b[38;5;0mZero\x1b[0m " + "\x1b[38;5;9mNine\x1b[0m",
    );

    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "256", code: 0 } },
      { type: "text", text: "Zero" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "256", code: 9 } },
      { type: "text", text: "Nine" },
      { type: "reset-all" },
    ]);
  });

  test("should handle 256 colors mixed with other SGR codes", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push(
      "\x1b[1;38;5;196;4mBold Red Underline\x1b[0m",
    );

    assert.deepEqual(tokens, [
      { type: "bold", enable: true },
      { type: "set-fg-color", color: { type: "256", code: 196 } },
      { type: "underline", enable: true },
      { type: "text", text: "Bold Red Underline" },
      { type: "reset-all" },
    ]);
  });

  test("should handle combined 256 foreground and background", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push(
      "\x1b[38;5;226;48;5;21mYellow on Blue\x1b[0m",
    );

    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "256", code: 226 } },
      { type: "set-bg-color", color: { type: "256", code: 21 } },
      { type: "text", text: "Yellow on Blue" },
      { type: "reset-all" },
    ]);
  });

  test("should handle 256 color at very end of buffer", () => {
    const tokenizer = createTokenizer();

    let tokens = tokenizer.push("text\x1b[38;5;100");
    assert.deepEqual(tokens, [{ type: "text", text: "text" }]);

    tokens = tokenizer.push("mcolored");
    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "256", code: 100 } },
      { type: "text", text: "colored" },
    ]);
  });

  test("should handle malformed 256 color sequences", () => {
    const tokenizer = createTokenizer();

    // Missing color number
    let tokens = tokenizer.push("\x1b[38;5;mtext");
    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "256", code: null } },
      { type: "text", text: "text" },
    ]);

    // Just 38 without 5
    tokens = tokenizer.push("\x1b[38mtext");
    assert.deepEqual(tokens, [
      { type: "unknown", sequence: "\x1b[38m" },
      { type: "text", text: "text" },
    ]);
  });

  test("should handle 256 color with leading zeros", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push(
      "\x1b[38;5;001mOne\x1b[0m " +
        "\x1b[38;5;099mNinety-nine\x1b[0m " +
        "\x1b[38;5;000mZero\x1b[0m",
    );

    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "256", code: 1 } },
      { type: "text", text: "One" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "256", code: 99 } },
      { type: "text", text: "Ninety-nine" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "256", code: 0 } },
      { type: "text", text: "Zero" },
      { type: "reset-all" },
    ]);
  });

  test("should handle rapid 256 color changes", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push(
      "\x1b[38;5;1m1\x1b[38;5;2m2\x1b[38;5;3m3\x1b[38;5;4m4",
    );

    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "256", code: 1 } },
      { type: "text", text: "1" },
      { type: "set-fg-color", color: { type: "256", code: 2 } },
      { type: "text", text: "2" },
      { type: "set-fg-color", color: { type: "256", code: 3 } },
      { type: "text", text: "3" },
      { type: "set-fg-color", color: { type: "256", code: 4 } },
      { type: "text", text: "4" },
    ]);
  });

  test("should handle 256 color code character by character", () => {
    const tokenizer = createTokenizer();
    const input = "\x1b[38;5;123mText";
    const allTokens: Token[] = [];

    for (let i = 0; i < input.length; i++) {
      const tokens = tokenizer.push(input[i]!);
      allTokens.push(...tokens);
    }

    assert.deepEqual(allTokens, [
      { type: "set-fg-color", color: { type: "256", code: 123 } },
      { type: "text", text: "T" },
      { type: "text", text: "e" },
      { type: "text", text: "x" },
      { type: "text", text: "t" },
    ]);
  });

  test("should handle edge case of 256 in color code", () => {
    const tokenizer = createTokenizer();
    // 256 is out of range (0-255), should be treated as unknown
    const tokens = tokenizer.push("\x1b[38;5;256mtext");

    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "256", code: 256 } },
      { type: "text", text: "text" },
    ]);
  });

  test("should handle negative numbers in 256 color", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push("\x1b[38;5;-1mtext");

    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "256", code: -1 } },
      { type: "text", text: "text" },
    ]);
  });
});
