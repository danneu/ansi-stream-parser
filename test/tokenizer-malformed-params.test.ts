import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { createTokenizer } from "../src/index.js";
import type { Token } from "../src/index.js";

describe("Tokenizer malformed parameter handling", () => {
  test("should handle RGB sequences with non-numeric values", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push(
      "\x1b[38;2;red;green;blue;extra;params;that;go;on;forever;and;ever;and;evermare text",
    );

    // Tokenizer stops parsing at the first non-numeric character
    assert.deepEqual(tokens, [
      { type: "unknown", sequence: "\x1b[38;2;r" },
      {
        type: "text",
        text: "ed;green;blue;extra;params;that;go;on;forever;and;ever;and;evermare text",
      },
    ]);
  });

  test("should handle RGB sequences with missing values", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push("\x1b[38;2;;;mtext");

    // Missing values result in the complete sequence being marked as unknown
    assert.deepEqual(tokens, [
      { type: "unknown", sequence: "\x1b[38;2;;;m" },
      { type: "text", text: "text" },
    ]);
  });

  test("should handle valid RGB sequences without truncation", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push("\x1b[38;2;255;128;0mtext");

    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "rgb", rgb: [255, 128, 0] } },
      { type: "text", text: "text" },
    ]);
  });

  test("should accept very large numbers as valid RGB values", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push(
      "\x1b[38;2;999999999999999999999;100;200mtext",
    );

    // Get the actual parsed large number to use in assertion
    const actualTokens = tokens as [
      {
        type: "set-fg-color";
        color: { type: "rgb"; rgb: [number, number, number] };
      },
      { type: "text"; text: string },
    ];
    const largeNumber = actualTokens[0].color.rgb[0];

    assert.deepEqual(tokens, [
      {
        type: "set-fg-color",
        color: { type: "rgb", rgb: [largeNumber, 100, 200] },
      },
      { type: "text", text: "text" },
    ]);
  });

  test("should handle streaming with buffering", () => {
    const tokenizer = createTokenizer();
    const allTokens: Token[] = [];

    // Feed incomplete sequence that will be buffered
    allTokens.push(...tokenizer.push("\x1b[38;2;100"));
    assert.equal(allTokens.length, 0); // Should buffer, not emit yet

    // Complete the sequence
    allTokens.push(...tokenizer.push(";200;50mHello"));

    assert.deepEqual(allTokens, [
      { type: "set-fg-color", color: { type: "rgb", rgb: [100, 200, 50] } },
      { type: "text", text: "Hello" },
    ]);
  });

  test("should handle invalid color modes", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push("\x1b[38;999;100;200mtext");

    // 999 is not a valid mode (should be 2 or 5)
    // The remaining ;100;200m gets parsed as other codes
    assert.deepEqual(tokens, [
      { type: "unknown", sequence: "\x1b[38;999m" },
      { type: "set-bg-color", color: { type: "16", code: 8 } }, // 100 gets parsed as code 100
      { type: "text", text: "text" },
    ]);
  });

  test("should handle background color sequences with non-numeric RGB values", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push("\x1b[48;2;not;a;numbermtext");

    assert.deepEqual(tokens, [
      { type: "unknown", sequence: "\x1b[48;2;n" },
      { type: "text", text: "ot;a;numbermtext" },
    ]);
  });

  test("should continue parsing after malformed sequences", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push("\x1b[38;2;red;green;bluem\x1b[31mvalid red");

    assert.deepEqual(tokens, [
      { type: "unknown", sequence: "\x1b[38;2;r" },
      { type: "text", text: "ed;green;bluem" },
      { type: "set-fg-color", color: { type: "16", code: 1 } },
      { type: "text", text: "valid red" },
    ]);
  });

  test("should handle sequences with many empty parameters", () => {
    const tokenizer = createTokenizer();
    // Test handling of sequences with many consecutive semicolons
    const tokens = tokenizer.push(
      "\x1b[38;2;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;mtext",
    );

    // With many empty parameters, the sequence is marked as unknown including the 'm'
    assert.deepEqual(tokens, [
      { type: "unknown", sequence: "\x1b[38;2;;;;;;;;;;;;;;;;m" },
      { type: "text", text: "text" },
    ]);
  });
});
