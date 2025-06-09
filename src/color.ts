import type { Color } from "./parser";

// Color helpers useful for the user consuming the output of the parser
// like when converting StyledText to HTML

export const colorNames = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
  "bright-black",
  "bright-red",
  "bright-green",
  "bright-yellow",
  "bright-blue",
  "bright-magenta",
  "bright-cyan",
  "bright-white",
] as const;

type ColorName = (typeof colorNames)[number];

export function getColorName(color: Extract<Color, { type: "16" }>): ColorName {
  return colorNames[color.code]!;
}

type RGB = [r: number, g: number, b: number];

// Type-safe guarantee that the palette can safely map 0-15
// prettier-ignore
export type Palette16 =  [
  RGB, RGB, RGB, RGB, RGB, RGB, RGB, RGB, 
  RGB, RGB, RGB, RGB, RGB, RGB, RGB, RGB,
]

const PALETTE_16: Palette16 = [
  [0, 0, 0], // 0: black
  [170, 0, 0], // 1: red
  [0, 170, 0], // 2: green
  [170, 85, 0], // 3: yellow/brown
  [0, 0, 170], // 4: blue
  [170, 0, 170], // 5: magenta
  [0, 170, 170], // 6: cyan
  [170, 170, 170], // 7: white
  [85, 85, 85], // 8: bright black (gray)
  [255, 85, 85], // 9: bright red
  [85, 255, 85], // 10: bright green
  [255, 255, 85], // 11: bright yellow
  [85, 85, 255], // 12: bright blue
  [255, 85, 255], // 13: bright magenta
  [85, 255, 255], // 14: bright cyan
  [255, 255, 255], // 15: bright white
];

/**
 * Get the RGB values for any color
 */
export function getColorRgb(color: Color): [number, number, number] {
  switch (color.type) {
    case "16":
      return PALETTE_16[color.code]!;
    case "256":
      return color256ToRgb(color);
    case "rgb":
      return color.rgb;
    default: {
      const exhaustive: never = color;
      throw new Error(`Unhandled color: ${JSON.stringify(exhaustive)}`);
    }
  }
}

/**
 * Convert 256-color code to RGB
 */
function color256ToRgb({
  code,
}: Extract<Color, { type: "256" }>): [number, number, number] {
  // 0-15: Standard colors (use 16-color palette)
  if (code < 16) {
    return PALETTE_16[code]!;
  }

  // 16-231: 6x6x6 color cube
  if (code < 232) {
    const n = code - 16;
    const r = Math.floor(n / 36);
    const g = Math.floor((n % 36) / 6);
    const b = n % 6;

    // Convert 0-5 range to 0-255
    const toRgb = (x: number) => (x === 0 ? 0 : 55 + x * 40);

    return [toRgb(r), toRgb(g), toRgb(b)];
  }

  // 232-255: Grayscale
  const gray = 8 + (code - 232) * 10;
  return [gray, gray, gray];
}

/**
 * Convert any color to a CSS hex code like #ff00aa.
 */
export function getColorHexCode(
  color: Color,
  palette: Palette16 = PALETTE_16
): string {
  let rgb: [number, number, number];

  switch (color.type) {
    case "16":
      rgb = palette[color.code]!;
      break;

    case "256":
      rgb = color256ToRgb(color);
      break;

    case "rgb":
      rgb = color.rgb;
      break;
  }

  // Convert RGB to hex
  return `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
