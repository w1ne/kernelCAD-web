import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import type { SketchCommand } from '../../../src/shared/capture/sketchCommand';

const SAMPLE_COMMANDS: SketchCommand[] = [
  { kind: 'moveTo', x: { expression: '0', unit: 'mm', evaluated: 0 }, y: { expression: '0', unit: 'mm', evaluated: 0 } },
  { kind: 'lineTo', x: { expression: '2', unit: 'mm', evaluated: 2 }, y: { expression: '0', unit: 'mm', evaluated: 0 } },
  { kind: 'lineTo', x: { expression: '2', unit: 'mm', evaluated: 2 }, y: { expression: '2', unit: 'mm', evaluated: 2 } },
  { kind: 'close' },
];

describe('authoring feature capture records', () => {
  it('exports byte-stable authoring feature records', () => {
    const session = new CaptureSession();
    const api = createApi({ session });

    const plate = api.box(40, 10, 2);
    api.dfmSpec({
      minWall: 1.2,
      minClearance: 0.4,
      ignore: [['lid', 'base']],
      exclude: ['servo-*'],
      channels: [{ part: 'body', name: 'drain', openings: 2 }],
    });
    api.nurbsCurve(
      [[0, 0, 0], [5, 0, 0], [10, 0, 0]],
      { degree: 2, weights: [1, 0, 1], knots: [0, 0, 0, 1], closed: true },
    );
    plate.embossText({
      textContent: 'KC',
      size: 4,
      depth: 0,
      align: 'left',
      anchorU: 1.2,
      anchorV: 0.5,
      rotation: 15,
      face: 'top',
    });
    plate.projectCurve({
      source: { kind: 'sketchCommands', commands: SAMPLE_COMMANDS },
      face: 'front',
      scaleMode: 'bounds',
      asEdge: true,
    });

    const authoringRecords = session.exportSession().records.filter((record) => (
      record.kind === 'dfmSpec' ||
      record.kind === 'curve3d' ||
      record.kind === 'embossText' ||
      record.kind === 'projectCurve'
    ));

    expect(authoringRecords).toEqual([
      {
        id: 'dfmSpec_1',
        kind: 'dfmSpec',
        params: {},
        inputs: {},
        transforms: [],
        suppressed: false,
        metadata: {
          virtual: true,
          minWall: 1.2,
          minClearance: 0.4,
          includeArticulatedMates: false,
          ignore: [['lid', 'base']],
          exclude: ['servo-*'],
          channels: [{ part: 'body', name: 'drain', openings: 2, sealed: false }],
        },
      },
      {
        id: 'curve3d_1',
        kind: 'curve3d',
        params: {},
        inputs: {},
        transforms: [],
        suppressed: false,
        metadata: {
          curve3d: {
            controlPoints: [[0, 0, 0], [5, 0, 0], [10, 0, 0]],
            degree: 2,
            weights: [1, 0, 1],
            knots: [0, 0, 0, 1],
            closed: true,
          },
          virtual: true,
          diagnostics: [
            {
              target: 'export-occt',
              code: 'feature.curve3d.weights-non-positive',
              severity: 'error',
              message: 'nurbsCurve: all weights must be finite and > 0; got [1,0,1].',
              hint: 'nurbsCurve weights must all be strictly positive (zero collapses the basis; negative is undefined for B-splines).',
            },
            {
              target: 'export-occt',
              code: 'feature.curve3d.knots-length-mismatch',
              severity: 'error',
              message: 'nurbsCurve: knot vector length should be 6 (controlPoints.length + degree + 1); got 4.',
              hint: 'nurbsCurve knot vector length must equal controlPoints.length + degree + 1.',
            },
            {
              target: 'export-occt',
              code: 'feature.curve3d.closed-endpoints-mismatch',
              severity: 'warn',
              message: 'nurbsCurve: closed=true but first (0,0,0) and last (10,0,0) control points differ.',
              hint: 'nurbsCurve closed=true but first and last control points differ; OCCT will close internally but the user-visible control net is misleading. Match the endpoints or drop closed.',
            },
          ],
        },
      },
      {
        id: 'embossText_1',
        kind: 'embossText',
        params: {},
        inputs: {
          parent: { kind: 'feature', id: 'box_1' },
          face: { kind: 'face', featureId: 'box_1', ref: { kind: 'canonical', face: 'top' } },
        },
        transforms: [],
        suppressed: false,
        metadata: {
          textContent: 'KC',
          size: { expression: '4', unit: 'mm', evaluated: 4 },
          depth: { expression: '0', unit: 'mm', evaluated: 0 },
          align: 'left',
          anchorU: { expression: '1.2', unit: 'unitless', evaluated: 1.2 },
          anchorV: { expression: '0.5', unit: 'unitless', evaluated: 0.5 },
          rotation: { expression: '15', unit: 'deg', evaluated: 15 },
          scaleMode: 'original',
          faceRef: { kind: 'canonical', face: 'top' },
          diagnostics: [
            {
              target: 'export-occt',
              code: 'feature.emboss-text.depth-zero',
              severity: 'error',
              message: 'embossText: depth must be non-zero (positive=emboss out, negative=engrave in); got 0.',
              hint: 'embossText.depth must be non-zero. Use a positive value to emboss out of the face, a negative value to engrave into it.',
            },
            {
              target: 'export-occt',
              code: 'feature.face.invalid-uv-anchor',
              severity: 'error',
              message: 'embossText: anchor must lie in [0, 1]; got anchorU=1.2, anchorV=0.5.',
              hint: 'UV anchors must lie in [0, 1] (0=umin/vmin, 0.5=face centre, 1=umax/vmax). Clamp the anchor or recompute against the face bounds.',
            },
          ],
        },
      },
      {
        id: 'projectCurve_1',
        kind: 'projectCurve',
        params: {},
        inputs: {
          parent: { kind: 'feature', id: 'box_1' },
          face: { kind: 'face', featureId: 'box_1', ref: { kind: 'canonical', face: 'front' } },
        },
        transforms: [],
        suppressed: false,
        metadata: {
          source: { kind: 'sketchCommands', commands: SAMPLE_COMMANDS },
          scaleMode: 'bounds',
          asEdge: true,
          faceRef: { kind: 'canonical', face: 'front' },
        },
      },
    ]);
  });

  it('keeps authoring feature construction outside CaptureSession', () => {
    const sessionSource = readFileSync(
      resolve(process.cwd(), 'src/modeling/capture/captureSession.ts'),
      'utf8',
    );
    const builderSource = readFileSync(
      resolve(process.cwd(), 'src/modeling/capture/authoringFeatureRecords.ts'),
      'utf8',
    );

    expect(sessionSource).toContain("from './authoringFeatureRecords'");
    expect(sessionSource).not.toContain('DfmSpecMetadata');
    expect(sessionSource).not.toContain('EmbossTextMetadata');
    expect(sessionSource).not.toContain('ProjectCurveMetadata');
    expect(sessionSource).not.toContain('feature.curve3d.weights-non-positive');
    expect(sessionSource).not.toContain('feature.emboss-text.depth-zero');
    expect(sessionSource).not.toContain('feature.project-curve.curve-empty');
    expect(builderSource).not.toContain("from './captureSession'");
    expect(builderSource).not.toContain("from './proxy'");
    expect(builderSource).not.toContain("import('./proxy')");
  });
});
