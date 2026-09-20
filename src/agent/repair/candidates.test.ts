// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Characterisation for the emboss anchor generator in candidates.ts. Pins the
// candidate fields, the patch bytes and the anchor fallback order (param,
// then metadata, then 0.5) before the generator is split into phases.

import { describe, it, expect } from 'vitest';
import { deriveCandidates, type CandidateContext } from './candidates';
import { ScriptSpanIndex } from './scriptSpans';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { ScriptLocation } from '../../shared/intent/types';

const WITH_ANCHORS = [
  "return box(40, 40, 6).hole('top', { u: 0, v: 0, diameter: 20, depth: 'through' })",
  "  .embossText({ textContent: 'HI', face: 'top', size: 4, depth: -0.5, anchorU: 0.5, anchorV: 0.5 });",
].join('\n');

const WITHOUT_ANCHORS =
  "return box(40, 40, 6).embossText({ textContent: 'HI', face: 'top', size: 4, depth: -0.5 });";

const DIAGNOSTIC: CompilerDiagnostic = {
  target: 'export-occt',
  code: 'feature.emboss-text.boolean-noop',
  severity: 'error',
  message: 'the emboss leaves the solid unchanged',
  hint: 'move the emboss anchor',
};

function locationOf(code: string, line: number, needle: string): ScriptLocation {
  const index = code.split('\n')[line - 1].indexOf(needle);
  return { file: 'script.kcad.ts', line, column: index + 1 };
}

function makeContext(args: {
  code: string;
  params?: FeatureRecord['params'];
  metadata?: FeatureRecord['metadata'];
  location?: ScriptLocation;
  kind?: FeatureRecord['kind'];
}): CandidateContext {
  const record: FeatureRecord = {
    id: 'embossText_1',
    kind: args.kind ?? 'embossText',
    inputs: {},
    params: args.params ?? {},
    transforms: [],
    scriptLocation: args.location ?? locationOf(args.code, 2, 'embossText'),
    suppressed: false,
    ...(args.metadata === undefined ? {} : { metadata: args.metadata }),
  };
  return {
    diagnostic: DIAGNOSTIC,
    diagnosticId: 'diag_1',
    record,
    recordsById: new Map([[record.id, record]]),
    spans: ScriptSpanIndex.parse(args.code),
    shapes: new Map(),
  };
}

const EVALUATED_ANCHORS = {
  anchorU: { expression: '0.5', unit: 'unitless' as const, evaluated: 0.5 },
  anchorV: { expression: '0.5', unit: 'unitless' as const, evaluated: 0.5 },
};

describe('recentreEmbossAnchor', () => {
  it('rewrites both anchors to the corner and pins the candidate bytes', () => {
    const candidates = deriveCandidates(makeContext({
      code: WITH_ANCHORS,
      params: EVALUATED_ANCHORS,
    }));

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toEqual({
      id: 'embossText_1:emboss-anchor-corner',
      diagnosticId: 'diag_1',
      code: 'feature.emboss-text.boolean-noop',
      featureId: 'embossText_1',
      summary:
        'Move the emboss anchor from (0.5, 0.5) to (0.2, 0.2) so the glyphs land on solid material.',
      predictedEffect:
        'the glyph tool intersects the body and the emboss/engrave changes volume',
      patch: {
        startLine: 2,
        endLine: 2,
        before:
          "  .embossText({ textContent: 'HI', face: 'top', size: 4, depth: -0.5, anchorU: 0.5, anchorV: 0.5 });",
        after:
          "  .embossText({ textContent: 'HI', face: 'top', size: 4, depth: -0.5, anchorU: 0.2, anchorV: 0.2 });",
      },
      evidence: {
        requestedAnchorU: 0.5,
        requestedAnchorV: 0.5,
        chosenAnchorU: 0.2,
        chosenAnchorV: 0.2,
      },
    });
  });

  it('reads anchors from metadata when the params carry none', () => {
    const candidates = deriveCandidates(makeContext({
      code: WITH_ANCHORS,
      metadata: {
        anchorU: { evaluated: 0.9 },
        anchorV: { evaluated: 0.1 },
      },
    }));

    expect(candidates).toHaveLength(1);
    expect(candidates[0].summary).toBe(
      'Move the emboss anchor from (0.9, 0.1) to (0.2, 0.2) so the glyphs land on solid material.',
    );
    expect(candidates[0].evidence).toEqual({
      requestedAnchorU: 0.9,
      requestedAnchorV: 0.1,
      chosenAnchorU: 0.2,
      chosenAnchorV: 0.2,
    });
  });

  it('falls back to 0.5 when neither params nor metadata carry an anchor', () => {
    const candidates = deriveCandidates(makeContext({
      code: WITH_ANCHORS,
      metadata: { anchorU: 'nonsense', anchorV: null },
    }));

    expect(candidates).toHaveLength(1);
    expect(candidates[0].summary).toBe(
      'Move the emboss anchor from (0.5, 0.5) to (0.2, 0.2) so the glyphs land on solid material.',
    );
  });

  it('yields nothing when the script carries no anchor options to rewrite', () => {
    const candidates = deriveCandidates(makeContext({
      code: WITHOUT_ANCHORS,
      params: EVALUATED_ANCHORS,
      location: locationOf(WITHOUT_ANCHORS, 1, 'embossText'),
    }));

    expect(candidates).toEqual([]);
  });

  it('yields nothing when both anchors already sit at 0.2', () => {
    const code = WITHOUT_ANCHORS.replace(
      'depth: -0.5 }',
      'depth: -0.5, anchorU: 0.2, anchorV: 0.2 }',
    );
    const candidates = deriveCandidates(makeContext({
      code,
      params: {
        anchorU: { expression: '0.2', unit: 'unitless' as const, evaluated: 0.2 },
        anchorV: { expression: '0.2', unit: 'unitless' as const, evaluated: 0.2 },
      },
      location: locationOf(code, 1, 'embossText'),
    }));

    expect(candidates).toEqual([]);
  });

  it('yields nothing for another feature kind or a record with no call site', () => {
    const wrongKind = deriveCandidates(makeContext({
      code: WITH_ANCHORS,
      params: EVALUATED_ANCHORS,
      kind: 'box',
    }));
    expect(wrongKind).toEqual([]);

    const noCallSite = deriveCandidates({
      diagnostic: DIAGNOSTIC,
      diagnosticId: 'diag_1',
      record: {
        id: 'embossText_1',
        kind: 'embossText',
        inputs: {},
        params: EVALUATED_ANCHORS,
        transforms: [],
        suppressed: false,
      },
      recordsById: new Map(),
      spans: ScriptSpanIndex.parse(WITH_ANCHORS),
      shapes: new Map(),
    });
    expect(noCallSite).toEqual([]);
  });
});
