import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import { createTokenizer } from "../src/tokenizer.js";

describe("ANSI 16 Colors", () => {
  test("should parse all 8 normal foreground colors", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push(
      "\x1b[30mBlack\x1b[0m " +
        "\x1b[31mRed\x1b[0m " +
        "\x1b[32mGreen\x1b[0m " +
        "\x1b[33mYellow\x1b[0m " +
        "\x1b[34mBlue\x1b[0m " +
        "\x1b[35mMagenta\x1b[0m " +
        "\x1b[36mCyan\x1b[0m " +
        "\x1b[37mWhite\x1b[0m"
    );

    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "16", code: 0 } },
      { type: "text", text: "Black" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "16", code: 1 } },
      { type: "text", text: "Red" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "16", code: 2 } },
      { type: "text", text: "Green" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "16", code: 3 } },
      { type: "text", text: "Yellow" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "16", code: 4 } },
      { type: "text", text: "Blue" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "16", code: 5 } },
      { type: "text", text: "Magenta" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "16", code: 6 } },
      { type: "text", text: "Cyan" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "16", code: 7 } },
      { type: "text", text: "White" },
      { type: "reset-all" },
    ]);
  });

  test("should parse all 8 bright foreground colors", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push(
      "\x1b[90mBright Black\x1b[0m " +
        "\x1b[91mBright Red\x1b[0m " +
        "\x1b[92mBright Green\x1b[0m " +
        "\x1b[93mBright Yellow\x1b[0m " +
        "\x1b[94mBright Blue\x1b[0m " +
        "\x1b[95mBright Magenta\x1b[0m " +
        "\x1b[96mBright Cyan\x1b[0m " +
        "\x1b[97mBright White\x1b[0m"
    );

    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "16", code: 8 } },
      { type: "text", text: "Bright Black" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "16", code: 9 } },
      { type: "text", text: "Bright Red" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "16", code: 10 } },
      { type: "text", text: "Bright Green" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "16", code: 11 } },
      { type: "text", text: "Bright Yellow" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "16", code: 12 } },
      { type: "text", text: "Bright Blue" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "16", code: 13 } },
      { type: "text", text: "Bright Magenta" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "16", code: 14 } },
      { type: "text", text: "Bright Cyan" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "16", code: 15 } },
      { type: "text", text: "Bright White" },
      { type: "reset-all" },
    ]);
  });

  test("should parse all 8 normal background colors", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push(
      "\x1b[40mBlack BG\x1b[0m " +
        "\x1b[41mRed BG\x1b[0m " +
        "\x1b[42mGreen BG\x1b[0m " +
        "\x1b[43mYellow BG\x1b[0m " +
        "\x1b[44mBlue BG\x1b[0m " +
        "\x1b[45mMagenta BG\x1b[0m " +
        "\x1b[46mCyan BG\x1b[0m " +
        "\x1b[47mWhite BG\x1b[0m"
    );

    assert.deepEqual(tokens, [
      { type: "set-bg-color", color: { type: "16", code: 0 } },
      { type: "text", text: "Black BG" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-bg-color", color: { type: "16", code: 1 } },
      { type: "text", text: "Red BG" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-bg-color", color: { type: "16", code: 2 } },
      { type: "text", text: "Green BG" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-bg-color", color: { type: "16", code: 3 } },
      { type: "text", text: "Yellow BG" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-bg-color", color: { type: "16", code: 4 } },
      { type: "text", text: "Blue BG" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-bg-color", color: { type: "16", code: 5 } },
      { type: "text", text: "Magenta BG" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-bg-color", color: { type: "16", code: 6 } },
      { type: "text", text: "Cyan BG" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-bg-color", color: { type: "16", code: 7 } },
      { type: "text", text: "White BG" },
      { type: "reset-all" },
    ]);
  });

  test("should parse all 8 bright background colors", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push(
      "\x1b[100mBright Black BG\x1b[0m " +
        "\x1b[101mBright Red BG\x1b[0m " +
        "\x1b[102mBright Green BG\x1b[0m " +
        "\x1b[103mBright Yellow BG\x1b[0m " +
        "\x1b[104mBright Blue BG\x1b[0m " +
        "\x1b[105mBright Magenta BG\x1b[0m " +
        "\x1b[106mBright Cyan BG\x1b[0m " +
        "\x1b[107mBright White BG\x1b[0m"
    );

    assert.deepEqual(tokens, [
      { type: "set-bg-color", color: { type: "16", code: 8 } },
      { type: "text", text: "Bright Black BG" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-bg-color", color: { type: "16", code: 9 } },
      { type: "text", text: "Bright Red BG" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-bg-color", color: { type: "16", code: 10 } },
      { type: "text", text: "Bright Green BG" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-bg-color", color: { type: "16", code: 11 } },
      { type: "text", text: "Bright Yellow BG" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-bg-color", color: { type: "16", code: 12 } },
      { type: "text", text: "Bright Blue BG" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-bg-color", color: { type: "16", code: 13 } },
      { type: "text", text: "Bright Magenta BG" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-bg-color", color: { type: "16", code: 14 } },
      { type: "text", text: "Bright Cyan BG" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-bg-color", color: { type: "16", code: 15 } },
      { type: "text", text: "Bright White BG" },
      { type: "reset-all" },
    ]);
  });

  test("should parse combined foreground and background colors", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push(
      "\x1b[31;47mRed on White\x1b[0m " +
        "\x1b[93;44mBright Yellow on Blue\x1b[0m"
    );

    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "16", code: 1 } },
      { type: "set-bg-color", color: { type: "16", code: 7 } },
      { type: "text", text: "Red on White" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "16", code: 11 } },
      { type: "set-bg-color", color: { type: "16", code: 4 } },
      { type: "text", text: "Bright Yellow on Blue" },
      { type: "reset-all" },
    ]);
  });

  test("should parse colors mixed with text attributes", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push(
      "\x1b[1;31mBold Red\x1b[0m " + "\x1b[4;94mUnderlined Bright Blue\x1b[0m"
    );

    assert.deepEqual(tokens, [
      { type: "bold" },
      { type: "set-fg-color", color: { type: "16", code: 1 } },
      { type: "text", text: "Bold Red" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "underline" },
      { type: "set-fg-color", color: { type: "16", code: 12 } },
      { type: "text", text: "Underlined Bright Blue" },
      { type: "reset-all" },
    ]);
  });
});
