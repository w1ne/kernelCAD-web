// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { expect, it } from 'vitest';
import { overlayLiveReview } from './types';
it('drops old verdicts when MCP replaces the entire built model', () => {
  const previous = { ok: false, diagnostics: [{ code: 'dfm.wall.too-thin' }], mechanism: 'broken' as const };
  const next = { ok: true, diagnostics: [], live: true, sourceReplaced: true as const };
  expect(overlayLiveReview(previous, next)).toEqual(next);
});
