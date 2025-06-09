import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import { createTokenizer } from "../src/tokenizer.js";
import type { Token } from "../src/tokenizer.js";

describe("ANSI Stream Tokenizer", () => {
  test("should handle simple text", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push("hello world");

    assert.deepEqual(tokens, [{ type: "text", text: "hello world" }]);
  });

  test("should handle basic color codes", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push("\x1b[31mred text\x1b[0m");

    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "16", code: 1 } },
      { type: "text", text: "red text" },
      { type: "reset-all" },
    ]);
  });

  test("should handle 256 color codes", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push("\x1b[38;5;196mred text\x1b[0m");

    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "256", code: 196 } },
      { type: "text", text: "red text" },
      { type: "reset-all" },
    ]);
  });

  test("should handle RGB color codes", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push("\x1b[38;2;255;0;0mred text\x1b[0m");

    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "rgb", rgb: [255, 0, 0] } },
      { type: "text", text: "red text" },
      { type: "reset-all" },
    ]);
  });

  test("should handle text decorations", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push("\x1b[1m\x1b[4mbold underlined\x1b[0m");

    assert.deepEqual(tokens, [
      { type: "bold", enable: true },
      { type: "underline", enable: true },
      { type: "text", text: "bold underlined" },
      { type: "reset-all" },
    ]);
  });

  test("should buffer incomplete sequences across multiple pushes", () => {
    const tokenizer = createTokenizer();

    // Push incomplete escape sequence
    let tokens = tokenizer.push("hello \x1b[");
    assert.deepEqual(tokens, [{ type: "text", text: "hello " }]);

    // Complete the sequence
    tokens = tokenizer.push("31mred\x1b[0m");
    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "16", code: 1 } },
      { type: "text", text: "red" },
      { type: "reset-all" },
    ]);
  });

  test("should handle split escape sequences", () => {
    const tokenizer = createTokenizer();

    // Split sequence across multiple pushes
    let tokens = tokenizer.push("\x1b");
    assert.deepEqual(tokens, []);

    tokens = tokenizer.push("[31");
    assert.deepEqual(tokens, []);

    tokens = tokenizer.push("mtext\x1b[0m");
    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "16", code: 1 } },
      { type: "text", text: "text" },
      { type: "reset-all" },
    ]);
  });

  test("should handle background colors", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push("\x1b[41mred background\x1b[0m");

    assert.deepEqual(tokens, [
      { type: "set-bg-color", color: { type: "16", code: 1 } },
      { type: "text", text: "red background" },
      { type: "reset-all" },
    ]);
  });

  test("should handle bright colors", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push("\x1b[91mbright red\x1b[0m");

    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "16", code: 9 } },
      { type: "text", text: "bright red" },
      { type: "reset-all" },
    ]);
  });

  test("should reset buffer when reset() is called", () => {
    const tokenizer = createTokenizer();

    // Push incomplete sequence
    tokenizer.push("\x1b[31");
    tokenizer.reset();

    // New input should not be affected by previous buffer
    const tokens = tokenizer.push("normal text");
    assert.deepEqual(tokens, [{ type: "text", text: "normal text" }]);
  });

  test("should handle empty input", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push("");

    assert.deepEqual(tokens, []);
  });

  test("should handle multiple sequences in one push", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push("\x1b[31mred\x1b[0m \x1b[32mgreen\x1b[0m");

    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "16", code: 1 } },
      { type: "text", text: "red" },
      { type: "reset-all" },
      { type: "text", text: " " },
      { type: "set-fg-color", color: { type: "16", code: 2 } },
      { type: "text", text: "green" },
      { type: "reset-all" },
    ]);
  });

  test("should emit unknown tokens for non-SGR sequences", () => {
    const tokenizer = createTokenizer();
    const tokens = tokenizer.push("\x1b[10;20H\x1b[31mred\x1b[2J");

    assert.deepEqual(tokens, [
      { type: "unknown", sequence: "\x1b[10;20H" },
      { type: "set-fg-color", color: { type: "16", code: 1 } },
      { type: "text", text: "red" },
      { type: "unknown", sequence: "\x1b[2J" },
    ]);
  });

  test("should handle partial escape sequence at start", () => {
    const tokenizer = createTokenizer();

    let tokens = tokenizer.push("\x1b");
    assert.deepEqual(tokens, []);

    tokens = tokenizer.push("[31mred");
    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "16", code: 1 } },
      { type: "text", text: "red" },
    ]);
  });

  test("should handle partial escape sequence in middle", () => {
    const tokenizer = createTokenizer();

    let tokens = tokenizer.push("hello\x1b");
    assert.deepEqual(tokens, [{ type: "text", text: "hello" }]);

    tokens = tokenizer.push("[31mred");
    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "16", code: 1 } },
      { type: "text", text: "red" },
    ]);
  });

  test("should handle partial parameters", () => {
    const tokenizer = createTokenizer();

    let tokens = tokenizer.push("\x1b[3");
    assert.deepEqual(tokens, []);

    tokens = tokenizer.push("8;5;19");
    assert.deepEqual(tokens, []);

    tokens = tokenizer.push("6mtext");
    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "256", code: 196 } },
      { type: "text", text: "text" },
    ]);
  });

  test("should handle RGB color split across multiple pushes", () => {
    const tokenizer = createTokenizer();

    let tokens = tokenizer.push("\x1b[38;2;");
    assert.deepEqual(tokens, []);

    tokens = tokenizer.push("255;");
    assert.deepEqual(tokens, []);

    tokens = tokenizer.push("0;");
    assert.deepEqual(tokens, []);

    tokens = tokenizer.push("0mred");
    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "rgb", rgb: [255, 0, 0] } },
      { type: "text", text: "red" },
    ]);
  });

  test("should handle one character at a time - simple color", () => {
    const tokenizer = createTokenizer();
    const input = "\x1b[31mred\x1b[0m";
    const allTokens: Token[] = [];

    for (let i = 0; i < input.length; i++) {
      const tokens = tokenizer.push(input[i]!); // Safe: i < input.length ensures character exists
      allTokens.push(...tokens);
    }

    assert.deepEqual(allTokens, [
      { type: "set-fg-color", color: { type: "16", code: 1 } },
      { type: "text", text: "r" },
      { type: "text", text: "e" },
      { type: "text", text: "d" },
      { type: "reset-all" },
    ]);
  });

  test("should handle one character at a time - complex sequence", () => {
    const tokenizer = createTokenizer();
    const input = "hi\x1b[38;5;196mbold\x1b[22mnormal";
    const allTokens: Token[] = [];

    for (let i = 0; i < input.length; i++) {
      const tokens = tokenizer.push(input[i]!); // Safe: i < input.length ensures character exists
      allTokens.push(...tokens);
    }

    assert.deepEqual(allTokens, [
      { type: "text", text: "h" },
      { type: "text", text: "i" },
      { type: "set-fg-color", color: { type: "256", code: 196 } },
      { type: "text", text: "b" },
      { type: "text", text: "o" },
      { type: "text", text: "l" },
      { type: "text", text: "d" },
      { type: "bold", enable: false },
      { type: "dim", enable: false },
      { type: "text", text: "n" },
      { type: "text", text: "o" },
      { type: "text", text: "r" },
      { type: "text", text: "m" },
      { type: "text", text: "a" },
      { type: "text", text: "l" },
    ]);
  });

  test("should handle mixed text and escape sequences with partial buffering", () => {
    const tokenizer = createTokenizer();

    let tokens = tokenizer.push("start");
    assert.deepEqual(tokens, [{ type: "text", text: "start" }]);

    tokens = tokenizer.push(" \x1b[1");
    assert.deepEqual(tokens, [{ type: "text", text: " " }]);

    tokens = tokenizer.push(";31m");
    assert.deepEqual(tokens, [
      { type: "bold", enable: true },
      { type: "set-fg-color", color: { type: "16", code: 1 } },
    ]);

    tokens = tokenizer.push("bold red");
    assert.deepEqual(tokens, [{ type: "text", text: "bold red" }]);

    tokens = tokenizer.push(" \x1b[");
    assert.deepEqual(tokens, [{ type: "text", text: " " }]);

    tokens = tokenizer.push("0m end");
    assert.deepEqual(tokens, [
      { type: "reset-all" },
      { type: "text", text: " end" },
    ]);
  });

  test("should handle escape sequence split exactly at terminator", () => {
    const tokenizer = createTokenizer();

    let tokens = tokenizer.push("\x1b[31");
    assert.deepEqual(tokens, []);

    tokens = tokenizer.push("m");
    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "16", code: 1 } },
    ]);
  });

  test("should handle multiple escape sequences with partial buffering", () => {
    const tokenizer = createTokenizer();

    let tokens = tokenizer.push("\x1b[31");
    assert.deepEqual(tokens, []);

    tokens = tokenizer.push("mred\x1b[");
    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "16", code: 1 } },
      { type: "text", text: "red" },
    ]);

    tokens = tokenizer.push("42");
    assert.deepEqual(tokens, []);

    tokens = tokenizer.push("mgreen\x1b[0m");
    assert.deepEqual(tokens, [
      { type: "set-bg-color", color: { type: "16", code: 2 } },
      { type: "text", text: "green" },
      { type: "reset-all" },
    ]);
  });

  test("should handle unknown sequences with partial buffering", () => {
    const tokenizer = createTokenizer();

    let tokens = tokenizer.push("text\x1b[10;");
    assert.deepEqual(tokens, [{ type: "text", text: "text" }]);

    tokens = tokenizer.push("20");
    assert.deepEqual(tokens, []);

    tokens = tokenizer.push("H more text");
    assert.deepEqual(tokens, [
      { type: "unknown", sequence: "\x1b[10;20H" },
      { type: "text", text: " more text" },
    ]);
  });

  test("should handle very long parameter sequences", () => {
    const tokenizer = createTokenizer();

    // Build a long sequence part by part
    let tokens = tokenizer.push("\x1b[38;2;");
    assert.deepEqual(tokens, []);

    // Add RGB values one digit at a time
    const rgbValues = "255;128;64";
    for (const char of rgbValues) {
      tokens = tokenizer.push(char);
      assert.deepEqual(tokens, []);
    }

    tokens = tokenizer.push("m");
    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "rgb", rgb: [255, 128, 64] } },
    ]);
  });

  test("should handle buffer overflow with reset", () => {
    const tokenizer = createTokenizer();

    // Start an escape sequence
    let tokens = tokenizer.push("\x1b[31");
    assert.deepEqual(tokens, []);

    // Reset should clear the buffer
    tokenizer.reset();

    // New input should start fresh
    tokens = tokenizer.push("normal text");
    assert.deepEqual(tokens, [{ type: "text", text: "normal text" }]);
  });

  test("should handle escape at very end of input", () => {
    const tokenizer = createTokenizer();

    let tokens = tokenizer.push("text\x1b");
    assert.deepEqual(tokens, [{ type: "text", text: "text" }]);

    tokens = tokenizer.push("[31mmore");
    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "16", code: 1 } },
      { type: "text", text: "more" },
    ]);
  });

  test("should handle invalid extended color sequences correctly", () => {
    const tokenizer = createTokenizer();

    // Missing 256-color code
    let tokens = tokenizer.push("\x1b[38;5mtext");
    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "256", code: null } },
      { type: "text", text: "text" },
    ]);

    // RGB mode but missing all RGB values - emit as unknown
    tokens = tokenizer.push("\x1b[38;2mtext");
    assert.deepEqual(tokens, [
      { type: "unknown", sequence: "\x1b[38;2m" },
      { type: "text", text: "text" },
    ]);

    // RGB mode but missing green and blue values - emit as unknown
    tokens = tokenizer.push("\x1b[38;2;255mtext");
    assert.deepEqual(tokens, [
      { type: "unknown", sequence: "\x1b[38;2;255m" },
      { type: "text", text: "text" },
    ]);

    // RGB mode but missing blue value - emit as unknown
    tokens = tokenizer.push("\x1b[38;2;255;128mtext");
    assert.deepEqual(tokens, [
      { type: "unknown", sequence: "\x1b[38;2;255;128m" },
      { type: "text", text: "text" },
    ]);

    // Invalid mode (genuinely invalid)
    tokens = tokenizer.push("\x1b[38;99mtext");
    assert.deepEqual(tokens, [
      { type: "unknown", sequence: "\x1b[38;99m" },
      { type: "text", text: "text" },
    ]);

    // Missing mode (genuinely invalid)
    tokens = tokenizer.push("\x1b[38mtext");
    assert.deepEqual(tokens, [
      { type: "unknown", sequence: "\x1b[38m" },
      { type: "text", text: "text" },
    ]);

    // Background colors - missing 256-color code
    tokens = tokenizer.push("\x1b[48;5mtext");
    assert.deepEqual(tokens, [
      { type: "set-bg-color", color: { type: "256", code: null } },
      { type: "text", text: "text" },
    ]);

    // Background RGB - missing blue value - emit as unknown
    tokens = tokenizer.push("\x1b[48;2;255;128mtext");
    assert.deepEqual(tokens, [
      { type: "unknown", sequence: "\x1b[48;2;255;128m" },
      { type: "text", text: "text" },
    ]);
  });

  test("should pass through out-of-range 256-color codes", () => {
    const tokenizer = createTokenizer();

    // Color code too high (> 255) - tokenizer passes it through
    let tokens = tokenizer.push("\x1b[38;5;256mtext");
    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "256", code: 256 } },
      { type: "text", text: "text" },
    ]);

    // Color code too high for background
    tokens = tokenizer.push("\x1b[48;5;300mtext");
    assert.deepEqual(tokens, [
      { type: "set-bg-color", color: { type: "256", code: 300 } },
      { type: "text", text: "text" },
    ]);

    // Negative color code (parsed by parseInt)
    tokens = tokenizer.push("\x1b[38;5;-1mtext");
    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "256", code: -1 } },
      { type: "text", text: "text" },
    ]);

    // Valid edge cases
    tokens = tokenizer.push("\x1b[38;5;0mtext\x1b[48;5;255mtext");
    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "256", code: 0 } },
      { type: "text", text: "text" },
      { type: "set-bg-color", color: { type: "256", code: 255 } },
      { type: "text", text: "text" },
    ]);

    // Empty parameter (should be null, not 0)
    tokens = tokenizer.push("\x1b[38;5;mtext");
    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "256", code: null } },
      { type: "text", text: "text" },
    ]);
  });

  test("should not buffer complete escape sequences", () => {
    const tokenizer = createTokenizer();

    // This would have caught the bug where we incorrectly buffered complete sequences
    // The bug would manifest as missing tokens on the first push
    let tokens = tokenizer.push("\x1b[31mred\x1b[0m more text");
    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "16", code: 1 } },
      { type: "text", text: "red" },
      { type: "reset-all" },
      { type: "text", text: " more text" },
    ]);

    // Ensure nothing was buffered - next push should work independently
    tokens = tokenizer.push("plain text");
    assert.deepEqual(tokens, [{ type: "text", text: "plain text" }]);

    // Test with unknown sequences too
    tokens = tokenizer.push("\x1b[2Jclear\x1b[Hcursor");
    assert.deepEqual(tokens, [
      { type: "unknown", sequence: "\x1b[2J" },
      { type: "text", text: "clear" },
      { type: "unknown", sequence: "\x1b[H" },
      { type: "text", text: "cursor" },
    ]);

    // Ensure no buffering happened
    tokens = tokenizer.push("more");
    assert.deepEqual(tokens, [{ type: "text", text: "more" }]);
  });

  test("should only buffer truly incomplete sequences", () => {
    const tokenizer = createTokenizer();

    // Incomplete at end - should buffer
    let tokens = tokenizer.push("text\x1b[31");
    assert.deepEqual(tokens, [{ type: "text", text: "text" }]);

    // Complete the sequence
    tokens = tokenizer.push("mred");
    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "16", code: 1 } },
      { type: "text", text: "red" },
    ]);

    // Incomplete escape at very end
    tokens = tokenizer.push("hello\x1b");
    assert.deepEqual(tokens, [{ type: "text", text: "hello" }]);

    // Complete it
    tokens = tokenizer.push("[32mgreen");
    assert.deepEqual(tokens, [
      { type: "set-fg-color", color: { type: "16", code: 2 } },
      { type: "text", text: "green" },
    ]);

    // Incomplete CSI sequence
    tokens = tokenizer.push("text\x1b[");
    assert.deepEqual(tokens, [{ type: "text", text: "text" }]);

    // Complete with unknown sequence
    tokens = tokenizer.push("10;20Hmore");
    assert.deepEqual(tokens, [
      { type: "unknown", sequence: "\x1b[10;20H" },
      { type: "text", text: "more" },
    ]);
  });

  describe("Complex sequence parsing edge cases", () => {
    test("should handle RGB color followed by style in single sequence", () => {
      const tokenizer = createTokenizer();

      // This sequence sets foreground to red (RGB) then bold
      const tokens = tokenizer.push("\x1b[38;2;255;0;0;1m");

      // Expected output:
      assert.deepEqual(tokens, [
        { type: "set-fg-color", color: { type: "rgb", rgb: [255, 0, 0] } },
        { type: "bold", enable: true }
      ]);
    });

    test("should handle multiple colors in sequence", () => {
      const tokenizer = createTokenizer();

      // Multiple colors in sequence
      const tokens = tokenizer.push("\x1b[38;5;196;48;5;21m");
      
      // Should parse both foreground (196) and background (21) colors
      assert.deepEqual(tokens, [
        { type: "set-fg-color", color: { type: "256", code: 196 } },
        { type: "set-bg-color", color: { type: "256", code: 21 } }
      ]);
    });

    test("should handle 256-color followed by styles", () => {
      const tokenizer = createTokenizer();

      // 256-color followed by style
      const tokens = tokenizer.push("\x1b[38;5;196;1;3m");
      
      // Should set color 196, then bold, then italic
      assert.deepEqual(tokens, [
        { type: "set-fg-color", color: { type: "256", code: 196 } },
        { type: "bold", enable: true },
        { type: "italic", enable: true }
      ]);
    });

    test("should handle RGB colors with trailing styles", () => {
      const tokenizer = createTokenizer();

      // RGB with trailing styles
      const tokens = tokenizer.push("\x1b[38;2;255;128;0;48;2;0;0;255;4m");
      
      // Should set orange foreground, blue background, and underline
      assert.deepEqual(tokens, [
        { type: "set-fg-color", color: { type: "rgb", rgb: [255, 128, 0] } },
        { type: "set-bg-color", color: { type: "rgb", rgb: [0, 0, 255] } },
        { type: "underline", enable: true }
      ]);
    });
  });
});
