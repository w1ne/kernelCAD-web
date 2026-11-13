// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

export function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

export function sanitizeJointName(value: string): string {
  // Keep mate names verbatim; XML escaping is applied at each use site.
  return value;
}

export function fmtNum(value: number): string {
  // 6-decimal fixed for readability; scientific notation for values that
  // lose precision in fixed form.
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value) < 1e-9) return '0';
  if (Math.abs(value) >= 1e-4 && Math.abs(value) < 1e6) return value.toFixed(6);
  return value.toExponential(6);
}
