// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Viewer dimension labels: model millimetres, at most one decimal place,
// trailing `.0` dropped.

// Rounds half away from zero (-3.25 -> -3.3); Math.round alone rounds
// half toward +infinity and would print -3.2.
export function formatMm(v: number): string {
  const r = (Math.sign(v) * Math.round(Math.abs(v) * 10)) / 10;
  return (Object.is(r, -0) ? 0 : r).toString();
}

export function groupLabel(count: number, body: string): string {
  return count > 1 ? `${count}× ${body}` : body;
}
