// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Locks the order and content of the pre-split (309-code) prefix of the
// four agent-facing projections derived from DIAGNOSTIC_REGISTRY
// (DiagnosticCode union, DIAGNOSTIC_CODES, HINT_TEMPLATES, NEXT_ACTIONS).
// The registry is split into per-domain files
// (docs/plans/2026-09-17-quality-slice-5-diagnostics-registry.md); this
// fixture is the pre-split projection captured before the split so the
// split — and any change after it — can never silently reorder, reword or
// drop one of those 309 codes.
//
// This is a PREFIX lock, not a total lock: DIAGNOSTIC_CODES is
// `[...LEGACY_CODE_ORDER, ...codes registered after the split]` (see
// src/shared/diagnostics/registry/index.ts), so a legitimately *added*
// diagnostic code lands after position 309 and this test does not need to
// change for it — only its own group file needs the new entry. A test
// failure here means one of the original 309 was reordered, reworded or
// removed, which is always a real regression, never something to silence
// by regenerating the fixture.
//
// Regenerating the fixture is legitimate ONLY if fixing a bug in this test
// itself (never to make a reorder/reword/removal of an original code pass).
// To regenerate: run this from the repo root, against the version of
// src/shared/diagnostics/registry you intend to lock, then pretty-print:
//
//   npx tsx -e "
//     import {DIAGNOSTIC_CODES,HINT_TEMPLATES,NEXT_ACTIONS} from './src/shared/diagnostics/registry';
//     console.log(JSON.stringify({DIAGNOSTIC_CODES,HINT_TEMPLATES,NEXT_ACTIONS}));
//   " | node -e "
//     const fs=require('fs');
//     const d=JSON.parse(fs.readFileSync(0,'utf8'));
//     fs.writeFileSync('tests/unit/diagnostics/fixtures/registryProjection.json', JSON.stringify(d,null,2)+'\n');
//   "

import { describe, it, expect } from 'vitest';
import {
  DIAGNOSTIC_CODES,
  HINT_TEMPLATES,
  NEXT_ACTIONS,
} from '../../../src/shared/diagnostics/registry';
import fixture from './fixtures/registryProjection.json';

describe('diagnostic registry projections (legacy-prefix order + content lock)', () => {
  const legacyLength = fixture.DIAGNOSTIC_CODES.length;

  it('the first 309 DIAGNOSTIC_CODES match the fixture order exactly (no reorder)', () => {
    expect(DIAGNOSTIC_CODES.slice(0, legacyLength)).toEqual(fixture.DIAGNOSTIC_CODES);
  });

  it('every fixture code still has the exact fixture hint template and next action', () => {
    for (const code of fixture.DIAGNOSTIC_CODES) {
      expect(HINT_TEMPLATES[code as keyof typeof HINT_TEMPLATES], `missing HINT_TEMPLATES for ${code}`).toEqual(
        (fixture.HINT_TEMPLATES as Record<string, unknown>)[code],
      );
      expect(NEXT_ACTIONS[code as keyof typeof NEXT_ACTIONS], `missing NEXT_ACTIONS for ${code}`).toEqual(
        (fixture.NEXT_ACTIONS as Record<string, unknown>)[code],
      );
    }
  });

  // Deleted: byte-identical total lock — new post-split codes (reference.likeness.*) landed after the legacy 309.
});
