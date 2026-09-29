// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Colours for /stats. One table of roles, light and dark, as CSS custom
// properties scoped to `.kc-stats`; charts reference `var(--…)` through inline
// `style`, never raw hex, so the dark steps swap in one place.
//
// Series slots 1-3 are the first three steps of a validated categorical
// palette (adjacent CVD ΔE ≥ 9.2, normal-vision ΔE ≥ 26.5 in both modes).
// Slot 3 sits under 3:1 on the light surface, so every chart ships a legend
// and a table view. Status colours are reserved for good / partial / failed
// and always come with a text label.

/** Series slot → CSS variable. Colour follows the entity, never its rank. */
export const SERIES = {
  s1: 'var(--kcs-series-1)',
  s2: 'var(--kcs-series-2)',
  s3: 'var(--kcs-series-3)',
  good: 'var(--kcs-good)',
  warning: 'var(--kcs-warning)',
  critical: 'var(--kcs-critical)',
} as const;

const LIGHT = `
  color-scheme: light;
  --kcs-page: #f9f9f7;
  --kcs-surface: #fcfcfb;
  --kcs-text: #0b0b0b;
  --kcs-text-2: #52514e;
  --kcs-muted: #6f6d68;
  --kcs-grid: #e1e0d9;
  --kcs-axis: #c3c2b7;
  --kcs-ring: rgba(11, 11, 11, 0.10);
  --kcs-wash: rgba(11, 11, 11, 0.04);
  --kcs-series-1: #2a78d6;
  --kcs-series-2: #eb6834;
  --kcs-series-3: #1baf7a;
  --kcs-track: #cde2fb;
  --kcs-good: #0ca30c;
  --kcs-warning: #fab219;
  --kcs-critical: #d03b3b;
  --kcs-good-text: #006300;
  --kcs-critical-text: #b42f2f;
`;

const DARK = `
  color-scheme: dark;
  --kcs-page: #0d0d0d;
  --kcs-surface: #1a1a19;
  --kcs-text: #ffffff;
  --kcs-text-2: #c3c2b7;
  --kcs-muted: #9b998f;
  --kcs-grid: #2c2c2a;
  --kcs-axis: #383835;
  --kcs-ring: rgba(255, 255, 255, 0.10);
  --kcs-wash: rgba(255, 255, 255, 0.06);
  --kcs-series-1: #3987e5;
  --kcs-series-2: #d95926;
  --kcs-series-3: #199e70;
  --kcs-track: #184f95;
  --kcs-good: #0ca30c;
  --kcs-warning: #fab219;
  --kcs-critical: #d03b3b;
  --kcs-good-text: #0ca30c;
  --kcs-critical-text: #f07a7a;
`;

/** Scoped stylesheet for the page. Dark follows the OS unless a
 *  `data-theme` on <html> says otherwise. */
export const STATS_CSS = `
.kc-stats { ${LIGHT}
  min-height: 100vh;
  background: var(--kcs-page);
  color: var(--kcs-text);
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root:where(:not([data-theme="light"])) .kc-stats { ${DARK} }
}
:root[data-theme="dark"] .kc-stats { ${DARK} }
.kc-stats .kcs-card {
  background: var(--kcs-surface);
  border: 1px solid var(--kcs-ring);
  border-radius: 12px;
  padding: 16px;
  min-width: 0;
}
.kc-stats .kcs-num { font-variant-numeric: tabular-nums; }
.kc-stats table { border-collapse: collapse; width: 100%; font-size: 13px; }
.kc-stats th { text-align: left; font-weight: 500; color: var(--kcs-muted); padding: 4px 8px 4px 0; border-bottom: 1px solid var(--kcs-grid); }
.kc-stats td { padding: 4px 8px 4px 0; border-bottom: 1px solid var(--kcs-grid); color: var(--kcs-text-2); }
.kc-stats td.kcs-r, .kc-stats th.kcs-r { text-align: right; font-variant-numeric: tabular-nums; }
.kc-stats .kcs-tab { border: 1px solid var(--kcs-ring); border-radius: 8px; padding: 6px 12px; font-size: 13px; color: var(--kcs-text-2); background: transparent; min-height: 36px; }
.kc-stats .kcs-tab[aria-pressed="true"] { background: var(--kcs-text); color: var(--kcs-surface); border-color: var(--kcs-text); font-weight: 600; }
.kc-stats .kcs-tab:hover { background: var(--kcs-wash); }
.kc-stats .kcs-tab[aria-pressed="true"]:hover { background: var(--kcs-text); }
.kc-stats .kcs-tip {
  position: absolute; pointer-events: none; z-index: 2;
  background: var(--kcs-surface); color: var(--kcs-text);
  border: 1px solid var(--kcs-ring); border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  padding: 6px 8px; font-size: 12px; white-space: nowrap;
}
.kc-stats details > summary { cursor: pointer; color: var(--kcs-muted); font-size: 12px; margin-top: 8px; }
.kc-stats .kcs-scroll { overflow-x: auto; }
`;
