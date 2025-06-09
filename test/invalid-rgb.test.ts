import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import { createTokenizer, createParser } from "../src/index.js";

describe("Invalid RGB Values", () => {
  test("should handle negative red value", () => {
    const tokenizer = createTokenizer();
    const parser = createParser();
    const input = "\x1b[38;2;-1;128;255mtext\x1b[0m";

    // Test tokenizer
    const tokens = tokenizer.push(input);
    assert.deepEqual(tokens, [
      {
        type: "set-fg-color",
        color: { type: "rgb", rgb: [-1, 128, 255] },
      },
      { type: "text", text: "text" },
      { type: "reset-all" },
    ]);

    // Test parser - invalid RGB values reset the color
    const styled = parser.push(input);
    assert.deepEqual(styled, [
      {
        text: "text",
        // fg is reset due to invalid RGB values
      },
    ]);
  });

  test("should handle negative green value", () => {
    const tokenizer = createTokenizer();
    const parser = createParser();
    const input = "\x1b[38;2;255;-128;0mtext\x1b[0m";

    // Test tokenizer
    const tokens = tokenizer.push(input);
    assert.deepEqual(tokens, [
      {
        type: "set-fg-color",
        color: { type: "rgb", rgb: [255, -128, 0] },
      },
      { type: "text", text: "text" },
      { type: "reset-all" },
    ]);

    // Test parser - invalid RGB values reset the color
    const styled = parser.push(input);
    assert.deepEqual(styled, [
      {
        text: "text",
        // fg is reset due to invalid RGB values
      },
    ]);
  });

  test("should handle negative blue value", () => {
    const tokenizer = createTokenizer();
    const parser = createParser();
    const input = "\x1b[38;2;0;255;-42mtext\x1b[0m";

    // Test tokenizer
    const tokens = tokenizer.push(input);
    assert.deepEqual(tokens, [
      {
        type: "set-fg-color",
        color: { type: "rgb", rgb: [0, 255, -42] },
      },
      { type: "text", text: "text" },
      { type: "reset-all" },
    ]);

    // Test parser - invalid RGB values reset the color
    const styled = parser.push(input);
    assert.deepEqual(styled, [
      {
        text: "text",
        // fg is reset due to invalid RGB values
      },
    ]);
  });

  test("should handle red value > 255", () => {
    const tokenizer = createTokenizer();
    const parser = createParser();
    const input = "\x1b[38;2;256;128;64mtext\x1b[0m";

    // Test tokenizer
    const tokens = tokenizer.push(input);
    assert.deepEqual(tokens, [
      {
        type: "set-fg-color",
        color: { type: "rgb", rgb: [256, 128, 64] },
      },
      { type: "text", text: "text" },
      { type: "reset-all" },
    ]);

    // Test parser - invalid RGB values reset the color
    const styled = parser.push(input);
    assert.deepEqual(styled, [
      {
        text: "text",
        // fg is reset due to invalid RGB values
      },
    ]);
  });

  test("should handle green value > 255", () => {
    const tokenizer = createTokenizer();
    const parser = createParser();
    const input = "\x1b[38;2;128;300;64mtext\x1b[0m";

    // Test tokenizer
    const tokens = tokenizer.push(input);
    assert.deepEqual(tokens, [
      {
        type: "set-fg-color",
        color: { type: "rgb", rgb: [128, 300, 64] },
      },
      { type: "text", text: "text" },
      { type: "reset-all" },
    ]);

    // Test parser - invalid RGB values reset the color
    const styled = parser.push(input);
    assert.deepEqual(styled, [
      {
        text: "text",
        // fg is reset due to invalid RGB values
      },
    ]);
  });

  test("should handle blue value > 255", () => {
    const tokenizer = createTokenizer();
    const parser = createParser();
    const input = "\x1b[38;2;0;128;999mtext\x1b[0m";

    // Test tokenizer
    const tokens = tokenizer.push(input);
    assert.deepEqual(tokens, [
      {
        type: "set-fg-color",
        color: { type: "rgb", rgb: [0, 128, 999] },
      },
      { type: "text", text: "text" },
      { type: "reset-all" },
    ]);

    // Test parser - invalid RGB values reset the color
    const styled = parser.push(input);
    assert.deepEqual(styled, [
      {
        text: "text",
        // fg is reset due to invalid RGB values
      },
    ]);
  });

  test("should handle all negative RGB values", () => {
    const tokenizer = createTokenizer();
    const parser = createParser();
    const input = "\x1b[38;2;-255;-128;-64mtext\x1b[0m";

    // Test tokenizer
    const tokens = tokenizer.push(input);
    assert.deepEqual(tokens, [
      {
        type: "set-fg-color",
        color: { type: "rgb", rgb: [-255, -128, -64] },
      },
      { type: "text", text: "text" },
      { type: "reset-all" },
    ]);

    // Test parser - invalid RGB values reset the color
    const styled = parser.push(input);
    assert.deepEqual(styled, [
      {
        text: "text",
        // fg is reset due to invalid RGB values
      },
    ]);
  });

  test("should handle all values > 255", () => {
    const tokenizer = createTokenizer();
    const parser = createParser();
    const input = "\x1b[38;2;500;600;700mtext\x1b[0m";

    // Test tokenizer
    const tokens = tokenizer.push(input);
    assert.deepEqual(tokens, [
      {
        type: "set-fg-color",
        color: { type: "rgb", rgb: [500, 600, 700] },
      },
      { type: "text", text: "text" },
      { type: "reset-all" },
    ]);

    // Test parser - invalid RGB values reset the color
    const styled = parser.push(input);
    assert.deepEqual(styled, [
      {
        text: "text",
        // fg is reset due to invalid RGB values
      },
    ]);
  });

  test("should handle extreme values", () => {
    const tokenizer = createTokenizer();
    const parser = createParser();
    const input = "\x1b[38;2;-999999;0;999999mtext\x1b[0m";

    // Test tokenizer
    const tokens = tokenizer.push(input);
    assert.deepEqual(tokens, [
      {
        type: "set-fg-color",
        color: { type: "rgb", rgb: [-999999, 0, 999999] },
      },
      { type: "text", text: "text" },
      { type: "reset-all" },
    ]);

    // Test parser - invalid RGB values reset the color
    const styled = parser.push(input);
    assert.deepEqual(styled, [
      {
        text: "text",
        // fg is reset due to invalid RGB values
      },
    ]);
  });

  test("should handle background colors with invalid RGB values", () => {
    const tokenizer = createTokenizer();
    const parser = createParser();
    const input = "\x1b[48;2;-50;300;128mtext\x1b[0m";

    // Test tokenizer
    const tokens = tokenizer.push(input);
    assert.deepEqual(tokens, [
      {
        type: "set-bg-color",
        color: { type: "rgb", rgb: [-50, 300, 128] },
      },
      { type: "text", text: "text" },
      { type: "reset-all" },
    ]);

    // Test parser - invalid RGB values reset the color
    const styled = parser.push(input);
    assert.deepEqual(styled, [
      {
        text: "text",
        // bg is reset due to invalid RGB values
      },
    ]);
  });

  test("should handle mixed valid and invalid RGB values", () => {
    const tokenizer = createTokenizer();
    const parser = createParser();
    const input = "\x1b[38;2;255;0;0mred\x1b[38;2;-1;256;128minvalid\x1b[0m";

    // Test tokenizer
    const tokens = tokenizer.push(input);
    assert.deepEqual(tokens, [
      {
        type: "set-fg-color",
        color: { type: "rgb", rgb: [255, 0, 0] },
      },
      { type: "text", text: "red" },
      {
        type: "set-fg-color",
        color: { type: "rgb", rgb: [-1, 256, 128] },
      },
      { type: "text", text: "invalid" },
      { type: "reset-all" },
    ]);

    // Test parser - valid RGB preserved, invalid RGB resets color
    const styled = parser.push(input);
    assert.deepEqual(styled, [
      {
        text: "red",
        fg: { type: "rgb", rgb: [255, 0, 0] },
      },
      {
        text: "invalid",
        // fg is reset due to invalid RGB values
      },
    ]);
  });

  test("should handle zero values", () => {
    const tokenizer = createTokenizer();
    const parser = createParser();
    const input = "\x1b[38;2;0;0;0mblack\x1b[0m";

    // Test tokenizer
    const tokens = tokenizer.push(input);
    assert.deepEqual(tokens, [
      {
        type: "set-fg-color",
        color: { type: "rgb", rgb: [0, 0, 0] },
      },
      { type: "text", text: "black" },
      { type: "reset-all" },
    ]);

    // Test parser
    const styled = parser.push(input);
    assert.deepEqual(styled, [
      {
        text: "black",
        fg: { type: "rgb", rgb: [0, 0, 0] },
      },
    ]);
  });

  test("should handle boundary values", () => {
    const tokenizer = createTokenizer();
    const parser = createParser();
    const input = "\x1b[38;2;255;255;255mwhite\x1b[0m";

    // Test tokenizer
    const tokens = tokenizer.push(input);
    assert.deepEqual(tokens, [
      {
        type: "set-fg-color",
        color: { type: "rgb", rgb: [255, 255, 255] },
      },
      { type: "text", text: "white" },
      { type: "reset-all" },
    ]);

    // Test parser
    const styled = parser.push(input);
    assert.deepEqual(styled, [
      {
        text: "white",
        fg: { type: "rgb", rgb: [255, 255, 255] },
      },
    ]);
  });
});