import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import { getColor16Name, getColorHexCode } from "../src/index.js";
import { type Palette16 } from "../src/color.js";

describe("Color helpers", () => {
  describe("getColor16Name", () => {
    test("should return correct color names for standard colors", () => {
      assert.equal(getColor16Name(0), "black");
      assert.equal(getColor16Name(1), "red");
      assert.equal(getColor16Name(2), "green");
      assert.equal(getColor16Name(3), "yellow");
      assert.equal(getColor16Name(4), "blue");
      assert.equal(getColor16Name(5), "magenta");
      assert.equal(getColor16Name(6), "cyan");
      assert.equal(getColor16Name(7), "white");
    });

    test("should return correct color names for bright colors", () => {
      assert.equal(getColor16Name(8), "bright-black");
      assert.equal(getColor16Name(9), "bright-red");
      assert.equal(getColor16Name(10), "bright-green");
      assert.equal(getColor16Name(11), "bright-yellow");
      assert.equal(getColor16Name(12), "bright-blue");
      assert.equal(getColor16Name(13), "bright-magenta");
      assert.equal(getColor16Name(14), "bright-cyan");
      assert.equal(getColor16Name(15), "bright-white");
    });
  });

  describe("getColorHexCode", () => {
    test("should convert 16-color codes to hex", () => {
      assert.equal(getColorHexCode({ type: "16", code: 0 }), "#000000");
      assert.equal(getColorHexCode({ type: "16", code: 1 }), "#aa0000");
      assert.equal(getColorHexCode({ type: "16", code: 2 }), "#00aa00");
      assert.equal(getColorHexCode({ type: "16", code: 7 }), "#aaaaaa");
      assert.equal(getColorHexCode({ type: "16", code: 15 }), "#ffffff");
    });

    test("should convert 256-color codes to hex", () => {
      // Standard colors (0-15)
      assert.equal(getColorHexCode({ type: "256", code: 0 }), "#000000");
      assert.equal(getColorHexCode({ type: "256", code: 1 }), "#aa0000");

      // 6x6x6 color cube (16-231)
      assert.equal(getColorHexCode({ type: "256", code: 16 }), "#000000"); // (0,0,0)
      assert.equal(getColorHexCode({ type: "256", code: 196 }), "#ff0000"); // (5,0,0)
      assert.equal(getColorHexCode({ type: "256", code: 46 }), "#00ff00"); // (0,5,0)
      assert.equal(getColorHexCode({ type: "256", code: 21 }), "#0000ff"); // (0,0,5)

      // Grayscale (232-255)
      assert.equal(getColorHexCode({ type: "256", code: 232 }), "#080808");
      assert.equal(getColorHexCode({ type: "256", code: 255 }), "#eeeeee");
    });

    test("should convert RGB colors to hex", () => {
      assert.equal(getColorHexCode({ type: "rgb", rgb: [0, 0, 0] }), "#000000");
      assert.equal(
        getColorHexCode({ type: "rgb", rgb: [255, 0, 0] }),
        "#ff0000",
      );
      assert.equal(
        getColorHexCode({ type: "rgb", rgb: [0, 255, 0] }),
        "#00ff00",
      );
      assert.equal(
        getColorHexCode({ type: "rgb", rgb: [0, 0, 255] }),
        "#0000ff",
      );
      assert.equal(
        getColorHexCode({ type: "rgb", rgb: [255, 255, 255] }),
        "#ffffff",
      );
      assert.equal(
        getColorHexCode({ type: "rgb", rgb: [170, 85, 42] }),
        "#aa552a",
      );
    });

    test("should use custom palette for 16-color codes", () => {
      const customPalette: Palette16 = [
        [0, 0, 0], // black
        [255, 0, 0], // red (brighter than default)
        [0, 255, 0], // green (brighter than default)
        [255, 255, 0], // yellow (brighter than default)
        [0, 0, 255], // blue (brighter than default)
        [255, 0, 255], // magenta (brighter than default)
        [0, 255, 255], // cyan (brighter than default)
        [255, 255, 255], // white (brighter than default)
        [128, 128, 128], // bright black (different gray)
        [255, 128, 128], // bright red
        [128, 255, 128], // bright green
        [255, 255, 128], // bright yellow
        [128, 128, 255], // bright blue
        [255, 128, 255], // bright magenta
        [128, 255, 255], // bright cyan
        [255, 255, 255], // bright white
      ];

      assert.equal(
        getColorHexCode({ type: "16", code: 1 }, customPalette),
        "#ff0000",
      );
      assert.equal(
        getColorHexCode({ type: "16", code: 2 }, customPalette),
        "#00ff00",
      );
      assert.equal(
        getColorHexCode({ type: "16", code: 8 }, customPalette),
        "#808080",
      );
    });

    test("should not use custom palette for 256-color or RGB", () => {
      const customPalette: Palette16 = [
        [255, 255, 255], // white for black
        [0, 255, 0], // green for red
        [255, 0, 0], // red for green
        [0, 0, 255], // blue for yellow
        [255, 255, 0], // yellow for blue
        [0, 0, 0], // black for magenta
        [255, 0, 255], // magenta for cyan
        [0, 255, 255], // cyan for white
        [128, 128, 128], // gray
        [64, 64, 64], // dark gray
        [192, 192, 192], // light gray
        [96, 96, 96], // another gray
        [160, 160, 160], // another gray
        [224, 224, 224], // another gray
        [32, 32, 32], // another gray
        [0, 0, 0], // black
      ] as const;

      // 256-color should ignore custom palette
      assert.equal(
        getColorHexCode({ type: "256", code: 1 }, customPalette),
        "#aa0000", // Default red, not custom green
      );

      // RGB should ignore custom palette
      assert.equal(
        getColorHexCode({ type: "rgb", rgb: [170, 0, 0] }, customPalette),
        "#aa0000",
      );
    });
  });
});
