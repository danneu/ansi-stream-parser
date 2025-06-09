import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import { createTokenizer } from "../src/tokenizer.js";

describe("ANSI Empty Parameters", () => {
  test("should handle empty parameter as reset", () => {
    const tokenizer = createTokenizer();
    // \x1b[m is equivalent to \x1b[0m
    const tokens = tokenizer.push("\x1b[mtext");

    assert.deepEqual(tokens, [
      { type: "reset-all" },
      { type: "text", text: "text" },
    ]);
  });

  test("should handle empty parameter in middle of sequence", () => {
    const tokenizer = createTokenizer();
    // \x1b[1;;4m = bold, empty (skip), underline
    const tokens = tokenizer.push("\x1b[1;;4mtext");

    assert.deepEqual(tokens, [
      { type: "bold", enable: true },
      { type: "underline", enable: true },
      { type: "text", text: "text" },
    ]);
  });

  test("should handle multiple consecutive empty parameters", () => {
    const tokenizer = createTokenizer();
    // Multiple empty parameters should be skipped
    const tokens = tokenizer.push("\x1b[;;;mtext");

    assert.deepEqual(tokens, [{ type: "text", text: "text" }]);
  });

  test("should handle empty 256-color code", () => {
    const tokenizer = createTokenizer();
    // \x1b[38;5;m - 256 color with empty color value
    const tokens = tokenizer.push("\x1b[38;5;mtext");

    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "256", code: null } },
      { type: "text", text: "text" },
    ]);
  });

  test("should handle mixed empty and valid parameters", () => {
    const tokenizer = createTokenizer();
    // \x1b[;31;m = empty, red, empty
    const tokens = tokenizer.push("\x1b[;31;mtext");

    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "16", code: 1 } },
      { type: "text", text: "text" },
    ]);
  });

  test("should handle empty parameter before color mode", () => {
    const tokenizer = createTokenizer();
    // \x1b[;38;5;196m = empty, then 256-color
    const tokens = tokenizer.push("\x1b[;38;5;196mtext");

    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "256", code: 196 } },
      { type: "text", text: "text" },
    ]);
  });

  test("should handle trailing semicolon", () => {
    const tokenizer = createTokenizer();
    // Trailing semicolon creates empty parameter at end
    const tokens = tokenizer.push("\x1b[31;mtext");

    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "16", code: 1 } },
      { type: "text", text: "text" },
    ]);
  });

  test("should handle leading semicolon", () => {
    const tokenizer = createTokenizer();
    // Leading semicolon creates empty parameter at start
    const tokens = tokenizer.push("\x1b[;1mtext");

    assert.deepEqual(tokens, [
      { type: "bold", enable: true },
      { type: "text", text: "text" },
    ]);
  });

  // Test actual terminal behavior
  test("empty parameters in real sequences", () => {
    const tokenizer = createTokenizer();

    // Common real-world case: \x1b[;H (cursor home, both params empty = 1,1)
    let tokens = tokenizer.push("\x1b[;H");
    assert.deepEqual(tokens, [
      { type: "unknown", sequence: "\x1b[;H" }, // Not SGR
    ]);

    // Empty in SGR context
    tokens = tokenizer.push("\x1b[0;mReset");
    assert.deepEqual(tokens, [
      { type: "reset-all" },
      { type: "text", text: "Reset" },
    ]);
  });
});
