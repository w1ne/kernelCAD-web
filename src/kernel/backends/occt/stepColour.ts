// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Colour-space conversion at the STEP boundary. A kernelCAD hex colour and a
// STEP `COLOUR_RGB` are both sRGB (display) values. OCCT's `Quantity_Color`
// holds linear RGB and applies the sRGB transfer curve itself when it writes
// or reads STEP, so hex channels must be linearized before they enter OCCT
// and encoded again when they leave it.

type Rgb = [number, number, number];

function linearFromSrgb(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function srgbFromLinear(value: number): number {
  return value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
}

/** Linear RGB channels (0..1) for OCCT from a `#rgb` or `#rrggbb` hex colour. */
export function linearRgbFromHex(hex: string): Rgb {
  let c = hex.startsWith('#') ? hex.slice(1) : hex;
  if (c.length === 3) c = c.replace(/([0-9a-f])/gi, '$1$1');
  return [0, 1, 2].map((i) => linearFromSrgb(parseInt(c.slice(i * 2, i * 2 + 2), 16) / 255)) as Rgb;
}

/** `#rrggbb` hex colour from OCCT's linear RGB channels (0..1). */
export function hexFromLinearRgb(red: number, green: number, blue: number): `#${string}` {
  const channel = (value: number): string =>
    Math.max(0, Math.min(255, Math.round(srgbFromLinear(Math.max(0, value)) * 255))).toString(16).padStart(2, '0');
  return `#${channel(red)}${channel(green)}${channel(blue)}`;
}
