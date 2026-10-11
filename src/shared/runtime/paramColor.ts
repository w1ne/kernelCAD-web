// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Colour params: the one rule that makes a `param()` a colour, and the value
// normaliser every layer (kernel ParamTable, source-text set_param, Studio
// customizer) shares.
//
// Rule: a string param is a COLOUR param when its default is a hex colour
// literal ('#rgb' or '#rrggbb') and it declares no `choices`. Nothing else
// is needed — `param('BodyColor', '#3366cc')`. The stored value is always
// lowercase '#rrggbb'; edits may also be '#rgb' or a basic CSS colour name.

/** Basic CSS colour names accepted as input (normalised to hex). */
const NAMED_COLORS: Readonly<Record<string, string>> = {
  black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000',
  blue: '#0000ff', yellow: '#ffff00', cyan: '#00ffff', aqua: '#00ffff',
  magenta: '#ff00ff', fuchsia: '#ff00ff', gray: '#808080', grey: '#808080',
  silver: '#c0c0c0', maroon: '#800000', olive: '#808000', lime: '#00ff00',
  teal: '#008080', navy: '#000080', purple: '#800080', orange: '#ffa500',
  pink: '#ffc0cb', brown: '#a52a2a', gold: '#ffd700', beige: '#f5f5dc',
  ivory: '#fffff0', tan: '#d2b48c', coral: '#ff7f50', salmon: '#fa8072',
  indigo: '#4b0082', violet: '#ee82ee', crimson: '#dc143c', khaki: '#f0e68c',
  turquoise: '#40e0d0', skyblue: '#87ceeb', steelblue: '#4682b4',
  forestgreen: '#228b22', darkgray: '#a9a9a9', darkgrey: '#a9a9a9',
  lightgray: '#d3d3d3', lightgrey: '#d3d3d3', slategray: '#708090', slategrey: '#708090',
};

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** True for a '#rgb' / '#rrggbb' string — the colour-param default rule. */
export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_RE.test(value);
}

/** '#rrggbb' (lowercase) for '#rgb', '#rrggbb' or a basic CSS colour name;
 *  `undefined` when the text is not a colour. */
export function normalizeColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim().toLowerCase();
  const hex = HEX_RE.exec(text);
  if (hex) {
    const digits = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1];
    return `#${digits}`;
  }
  return NAMED_COLORS[text];
}

/** The colour-param rule applied to a declared default and its meta. */
export function isColorParamDefault(defaultValue: unknown, meta?: { choices?: unknown }): boolean {
  return isHexColor(defaultValue) && meta?.choices === undefined;
}
