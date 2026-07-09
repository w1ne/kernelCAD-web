import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import { buildCoonsPatchSurfaceRecord } from '../../../src/modeling/capture/surfaceSweepRecords';

describe('surface and sweep capture records', () => {
  it('exports byte-stable variableSweep and coonsPatch records', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });

    const spine = kcad.nurbsCurve([[0, 0, 0], [10, 0, 0]], { degree: 1 });
    const profile = kcad
      .path()
      .moveTo(-1, -1)
      .lineTo(1, -1)
      .lineTo(1, 1)
      .lineTo(-1, 1)
      .close();

    kcad.variableSweep(
      spine,
      [
        { t: 0.2, profile },
        { t: 0.1, profile },
      ],
      { closed: true, continuity: 'C2' },
    );

    const c1 = kcad.nurbsCurve([[0, 0, 0], [10, 0, 0]], { degree: 1 });
    const c2 = kcad.nurbsCurve([[99, 99, 99], [10, 10, 0]], { degree: 1 });
    const c3 = kcad.nurbsCurve([[10, 10, 0], [0, 10, 0]], { degree: 1 });
    const c4 = kcad.nurbsCurve([[0, 10, 0], [0, 0, 0]], { degree: 1 });
    const surface = kcad.surfaceFromBoundary([c1, c2, c3, c4], {
      continuity: ['C1', 'C0', 'C1', 'C0'],
      sampling: 7,
    });

    const sweepRecord = session.getRecords().find((record) => record.kind === 'variableSweep');
    const surfaceRecord = session.getSurfaceRecord(surface.id);

    expect(sweepRecord).toEqual({
      id: 'variableSweep_1',
      kind: 'variableSweep',
      params: {},
      inputs: {
        spine: { kind: 'feature', id: 'curve3d_1' },
        section_0: { kind: 'feature', id: 'sketch_1' },
        section_1: { kind: 'feature', id: 'sketch_1' },
      },
      transforms: [],
      suppressed: false,
      metadata: {
        variableSweep: {
          spineRef: { kind: 'feature', id: 'curve3d_1' },
          sections: [
            { t: 0.2, profileRef: { kind: 'feature', id: 'sketch_1' } },
            { t: 0.1, profileRef: { kind: 'feature', id: 'sketch_1' } },
          ],
          closed: true,
          continuity: 'C2',
        },
        diagnostics: [
          {
            target: 'export-occt',
            code: 'feature.variable-sweep.sections-out-of-order',
            severity: 'error',
            message: 'variableSweep: sections must be strictly increasing in t; got t[1]=0.1 <= t[0]=0.2.',
            hint: 'variableSweep sections must be strictly increasing in t. Sort sections by t ascending.',
          },
          {
            target: 'export-occt',
            code: 'feature.variable-sweep.sections-not-spanning',
            severity: 'error',
            message: 'variableSweep: sections must span [0, 1] inclusive; got t[0]=0.2, t[last]=0.1.',
            hint: 'variableSweep sections must span the full spine: first section at t=0 and last section at t=1 are required.',
          },
        ],
      },
    });

    expect(surfaceRecord).toEqual({
      id: 'surface_1',
      kind: 'coonsPatch',
      params: {},
      data: {
        kind: 'coonsPatch',
        curveIds: ['curve3d_2', 'curve3d_3', 'curve3d_4', 'curve3d_5'],
        continuity: ['C1', 'C0', 'C1', 'C0'],
        sampling: 7,
      },
      diagnostics: [
        {
          target: 'export-occt',
          code: 'feature.surface-from-boundary.corner-mismatch',
          severity: 'error',
          message: 'surfaceFromBoundary: curve[0].end (10,0,0) does not match curve[1].start (99,99,99) within 1e-6 mm.',
          hint: 'surfaceFromBoundary requires adjacent boundary curves to share endpoints within 1e-6 mm (c1.end == c2.start, c2.end == c3.start, c3.end == c4.start, c4.end == c1.start). Snap the endpoints or rebuild the boundary curves so they form a closed loop.',
        },
      ],
    });
  });

  it('keeps surface and sweep record construction outside CaptureSession', () => {
    const sessionSource = readFileSync(
      resolve(process.cwd(), 'src/modeling/capture/captureSession.ts'),
      'utf8',
    );
    const builderSource = readFileSync(
      resolve(process.cwd(), 'src/modeling/capture/surfaceSweepRecords.ts'),
      'utf8',
    );
    const sessionImports = importSpecifiers(sessionSource);
    const builderImports = importSpecifiers(builderSource);

    expect(sessionImports).toContain('./surfaceSweepRecords');
    expect(sessionSource).not.toContain('VariableSweepMetadata');
    expect(sessionSource).not.toContain('VariableSweepSection');
    expect(sessionSource).not.toContain('CoonsPatchData');
    expect(sessionSource).not.toContain('feature.variable-sweep.sections-out-of-order');
    expect(sessionSource).not.toContain('feature.surface-from-boundary.corner-mismatch');
    expect(builderImports).not.toContain('./captureSession');
    expect(builderImports).not.toContain('./proxy');
    expect(builderImports).not.toContain('./surfaceProxy');
    expect(builderImports).not.toContain('./curveProxy');
  });

  it('falls back to control-point endpoints when boundary curve evaluation fails', () => {
    const record = buildCoonsPatchSurfaceRecord(
      'surface_1',
      {
        curveIds: ['curve3d_1', 'curve3d_2', 'curve3d_3', 'curve3d_4'],
        continuity: ['C0', 'C0', 'C0', 'C0'],
      },
      {
        getCurveMetadata: (curveId) => ({
          degree: 1,
          controlPoints: {
            curve3d_1: [[0, 0, 0], [1, 0, 0]],
            curve3d_2: [[2, 0, 0], [1, 1, 0]],
            curve3d_3: [[1, 1, 0], [0, 1, 0]],
            curve3d_4: [[0, 1, 0], [0, 0, 0]],
          }[curveId]!,
          knots: [0, 0, 1, 1],
          weights: [1, 1],
        }),
        evaluateCurveEndpoints: () => {
          throw new Error('OCCT unavailable');
        },
      },
    );

    expect(record.diagnostics).toEqual([
      expect.objectContaining({
        code: 'feature.surface-from-boundary.corner-mismatch',
        message: 'surfaceFromBoundary: curve[0].end (1,0,0) does not match curve[1].start (2,0,0) within 1e-6 mm.',
      }),
    ]);
  });

  it('keeps unresolved boundary metadata inspectable without corner diagnostics', () => {
    const record = buildCoonsPatchSurfaceRecord(
      'surface_1',
      {
        curveIds: ['curve3d_1', 'curve3d_2', 'curve3d_3', 'curve3d_4'],
        continuity: ['C0', 'C0', 'C0', 'C0'],
        sampling: 5,
      },
      {
        getCurveMetadata: () => undefined,
        evaluateCurveEndpoints: () => {
          throw new Error('should not evaluate missing metadata');
        },
      },
    );

    expect(record).toEqual({
      id: 'surface_1',
      kind: 'coonsPatch',
      params: {},
      data: {
        kind: 'coonsPatch',
        curveIds: ['curve3d_1', 'curve3d_2', 'curve3d_3', 'curve3d_4'],
        continuity: ['C0', 'C0', 'C0', 'C0'],
        sampling: 5,
      },
    });
  });
});

function importSpecifiers(sourceText: string): string[] {
  const sourceFile = ts.createSourceFile('source.ts', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const imports: string[] = [];

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      imports.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}
