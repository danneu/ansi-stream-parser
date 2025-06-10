import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import { createTokenizer } from "../src/index.js";

describe("Invalid ANSI sequence handling", () => {
  describe("Invalid terminator tests", () => {
    test("should handle single invalid terminator", () => {
      const tokenizer = createTokenizer();
      const tokens = tokenizer.push("\x1b[31!text");

      assert.deepEqual(tokens, [
        { type: "unknown", sequence: "\x1b[31" },
        { type: "text", text: "!text" },
      ]);
    });

    test("should handle invalid terminator with multiple parameters", () => {
      const tokenizer = createTokenizer();
      const tokens = tokenizer.push("\x1b[1;4;31#bold underline red");

      assert.deepEqual(tokens, [
        { type: "unknown", sequence: "\x1b[1;4;31" },
        { type: "text", text: "#bold underline red" },
      ]);
    });

    test("should handle space as invalid terminator", () => {
      const tokenizer = createTokenizer();
      const tokens = tokenizer.push("\x1b[0 reset");

      assert.deepEqual(tokens, [
        { type: "unknown", sequence: "\x1b[0" },
        { type: "text", text: " reset" },
      ]);
    });

    test("should handle newline as invalid terminator", () => {
      const tokenizer = createTokenizer();
      const tokens = tokenizer.push("\x1b[31\nred");

      assert.deepEqual(tokens, [
        { type: "unknown", sequence: "\x1b[31" },
        { type: "text", text: "\nred" },
      ]);
    });

    test("should handle NULL as invalid terminator", () => {
      const tokenizer = createTokenizer();
      const tokens = tokenizer.push("\x1b[42\x00green");

      assert.deepEqual(tokens, [
        { type: "unknown", sequence: "\x1b[42" },
        { type: "text", text: "\x00green" },
      ]);
    });

    test("should handle extended ASCII as invalid terminator", () => {
      const tokenizer = createTokenizer();
      const tokens = tokenizer.push("\x1b[38;5;196\x80text");

      assert.deepEqual(tokens, [
        { type: "unknown", sequence: "\x1b[38;5;196" },
        { type: "text", text: "\x80text" },
      ]);
    });
  });

  describe("Valid sequences for comparison", () => {
    test("should handle unknown but valid sequences", () => {
      const tokenizer = createTokenizer();
      const tokens = tokenizer.push("\x1b[25xtext");

      assert.deepEqual(tokens, [
        { type: "unknown", sequence: "\x1b[25x" },
        { type: "text", text: "text" },
      ]);
    });

    test("should handle known SGR sequences", () => {
      const tokenizer = createTokenizer();
      const tokens = tokenizer.push("\x1b[31mred");

      assert.deepEqual(tokens, [
        { type: "set-fg-color", color: { type: "16", code: 1 } },
        { type: "text", text: "red" },
      ]);
    });
  });

  describe("Edge cases", () => {
    test("should handle multiple escape sequences with invalid terminators", () => {
      const tokenizer = createTokenizer();
      const tokens = tokenizer.push("\x1b[31!text\x1b[0#more");

      assert.deepEqual(tokens, [
        { type: "unknown", sequence: "\x1b[31" },
        { type: "text", text: "!text" },
        { type: "unknown", sequence: "\x1b[0" },
        { type: "text", text: "#more" },
      ]);
    });

    test("should handle invalid character immediately after CSI", () => {
      const tokenizer = createTokenizer();
      const tokens = tokenizer.push("\x1b[!invalid");

      assert.deepEqual(tokens, [
        { type: "unknown", sequence: "\x1b[" },
        { type: "text", text: "!invalid" },
      ]);
    });

    test("should handle escape within escape (new sequence starts)", () => {
      const tokenizer = createTokenizer();
      const tokens = tokenizer.push("\x1b[31\x1b[32mgreen");

      assert.deepEqual(tokens, [
        { type: "unknown", sequence: "\x1b[31" },
        { type: "set-fg-color", color: { type: "16", code: 2 } },
        { type: "text", text: "green" },
      ]);
    });

    test("should preserve buffering behavior for incomplete sequences", () => {
      const tokenizer = createTokenizer();
      const tokens = tokenizer.push("\x1b[31");

      // Should buffer, waiting for more input
      assert.deepEqual(tokens, []);

      // Complete the sequence
      const moreTokens = tokenizer.push("mtext");
      assert.deepEqual(moreTokens, [
        { type: "set-fg-color", color: { type: "16", code: 1 } },
        { type: "text", text: "text" },
      ]);
    });
  });

  describe("Invalid parameter tests", () => {
    test("should handle non-digit in parameter position as unknown", () => {
      const tokenizer = createTokenizer();
      const tokens = tokenizer.push("\x1b[3amtext");

      // 'a' is a valid terminator, so this becomes unknown sequence
      assert.deepEqual(tokens, [
        { type: "unknown", sequence: "\x1b[3a" },
        { type: "text", text: "mtext" },
      ]);
    });

    test("should handle invalid character after semicolon as unknown", () => {
      const tokenizer = createTokenizer();
      const tokens = tokenizer.push("\x1b[31;xmtext");

      // 'x' is a valid terminator, so this becomes unknown sequence
      assert.deepEqual(tokens, [
        { type: "unknown", sequence: "\x1b[31;x" },
        { type: "text", text: "mtext" },
      ]);
    });

    test("should handle negative numbers in SGR as valid", () => {
      const tokenizer = createTokenizer();
      const tokens = tokenizer.push("\x1b[38;5;-1mtext");

      // Negative numbers should be parsed by SGR handler
      assert.deepEqual(tokens, [
        { type: "set-fg-color", color: { type: "256", code: -1 } },
        { type: "text", text: "text" },
      ]);
    });
  });

  describe("Mixed valid and invalid sequences", () => {
    test("should handle valid sequence followed by invalid", () => {
      const tokenizer = createTokenizer();
      const tokens = tokenizer.push("\x1b[31mred\x1b[42!invalid");

      assert.deepEqual(tokens, [
        { type: "set-fg-color", color: { type: "16", code: 1 } },
        { type: "text", text: "red" },
        { type: "unknown", sequence: "\x1b[42" },
        { type: "text", text: "!invalid" },
      ]);
    });

    test("should handle invalid sequence followed by valid", () => {
      const tokenizer = createTokenizer();
      const tokens = tokenizer.push("\x1b[31!invalid\x1b[32mgreen");

      assert.deepEqual(tokens, [
        { type: "unknown", sequence: "\x1b[31" },
        { type: "text", text: "!invalid" },
        { type: "set-fg-color", color: { type: "16", code: 2 } },
        { type: "text", text: "green" },
      ]);
    });
  });

  describe("Streaming behavior with invalid sequences", () => {
    test("should handle invalid sequences across multiple pushes", () => {
      const tokenizer = createTokenizer();

      let tokens = tokenizer.push("\x1b[31");
      assert.deepEqual(tokens, []); // Buffered

      tokens = tokenizer.push("!text");
      assert.deepEqual(tokens, [
        { type: "unknown", sequence: "\x1b[31" },
        { type: "text", text: "!text" },
      ]);
    });

    test("should handle parameters split across pushes with invalid terminator", () => {
      const tokenizer = createTokenizer();

      let tokens = tokenizer.push("\x1b[1;4");
      assert.deepEqual(tokens, []); // Buffered

      tokens = tokenizer.push(";31");
      assert.deepEqual(tokens, []); // Still buffered

      tokens = tokenizer.push("!invalid");
      assert.deepEqual(tokens, [
        { type: "unknown", sequence: "\x1b[1;4;31" },
        { type: "text", text: "!invalid" },
      ]);
    });
  });

  describe("Special character handling", () => {
    test("should handle tab as invalid terminator", () => {
      const tokenizer = createTokenizer();
      const tokens = tokenizer.push("\x1b[31\ttext");

      assert.deepEqual(tokens, [
        { type: "unknown", sequence: "\x1b[31" },
        { type: "text", text: "\ttext" },
      ]);
    });

    test("should handle carriage return as invalid terminator", () => {
      const tokenizer = createTokenizer();
      const tokens = tokenizer.push("\x1b[31\rtext");

      assert.deepEqual(tokens, [
        { type: "unknown", sequence: "\x1b[31" },
        { type: "text", text: "\rtext" },
      ]);
    });

    test("should handle form feed as invalid terminator", () => {
      const tokenizer = createTokenizer();
      const tokens = tokenizer.push("\x1b[31\x0ctext");

      assert.deepEqual(tokens, [
        { type: "unknown", sequence: "\x1b[31" },
        { type: "text", text: "\x0ctext" },
      ]);
    });
  });

  describe("Boundary character tests", () => {
    test("should handle character just before valid terminator range", () => {
      const tokenizer = createTokenizer();
      // 0x3F is '?' which is just before 0x40 ('@')
      const tokens = tokenizer.push("\x1b[31?text");

      assert.deepEqual(tokens, [
        { type: "unknown", sequence: "\x1b[31" },
        { type: "text", text: "?text" },
      ]);
    });

    test("should handle character just after valid terminator range", () => {
      const tokenizer = createTokenizer();
      // 0x7F is DEL which is just after 0x7E ('~')
      const tokens = tokenizer.push("\x1b[31\x7ftext");

      assert.deepEqual(tokens, [
        { type: "unknown", sequence: "\x1b[31" },
        { type: "text", text: "\x7ftext" },
      ]);
    });

    test("should handle valid terminators at boundaries", () => {
      const tokenizer = createTokenizer();
      
      // '@' is 0x40, the first valid terminator
      let tokens = tokenizer.push("\x1b[31@text");
      assert.deepEqual(tokens, [
        { type: "unknown", sequence: "\x1b[31@" },
        { type: "text", text: "text" },
      ]);

      // '~' is 0x7E, the last valid terminator  
      tokens = tokenizer.push("\x1b[31~text");
      assert.deepEqual(tokens, [
        { type: "unknown", sequence: "\x1b[31~" },
        { type: "text", text: "text" },
      ]);
    });
  });
});