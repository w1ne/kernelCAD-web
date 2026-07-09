import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  buildAssemblyConnectFeatureSpec,
  buildAssemblyExportFeatureSpec,
  buildAssemblyJointFeatureSpec,
  buildAssemblyModelFeatureSpec,
  buildAssemblyPartFeatureSpec,
  buildSolvedAssemblyFeatureSpec,
} from '../../../src/modeling/capture/assemblyFeatureRecords';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import type { FeatureRecord } from '../../../src/shared/intent/featureRecord';

describe('assembly capture record builders', () => {
  it('builds byte-stable assemblyPart and assemblyExport specs', () => {
    expect(buildAssemblyPartFeatureSpec('arm', 'base', 'box_1', {
      at: [1, 2, 3],
      connectors: {
        top: { origin: [0, 0, 10], axis: [0, 0, 1] },
      },
      placedBy: {
        connector: 'bottom',
        to: {
          partId: 'assemblyPart_1',
          partName: 'stand',
          connector: 'top',
        },
      },
    })).toEqual({
      kind: 'assemblyPart',
      params: {},
      inputs: {
        shape: { kind: 'feature', id: 'box_1' },
      },
      metadata: {
        assemblyName: 'arm',
        partName: 'base',
        at: [1, 2, 3],
        connectors: {
          top: { origin: [0, 0, 10], axis: [0, 0, 1] },
        },
        placedBy: {
          connector: 'bottom',
          to: {
            partId: 'assemblyPart_1',
            partName: 'stand',
            connector: 'top',
          },
        },
      },
    });

    expect(buildAssemblyExportFeatureSpec('solvedAssembly_1', 'compound')).toEqual({
      kind: 'assemblyExport',
      params: {
        op: { expression: "'compound'", unit: 'unitless', evaluated: 0 },
      },
      inputs: {
        scene: { kind: 'feature', id: 'solvedAssembly_1' },
      },
      metadata: { op: 'compound' },
    });
  });

  it('builds byte-stable assemblyConnect, assemblyJoint, and assemblyModel specs', () => {
    const a = {
      assemblyName: 'arm',
      partId: 'assemblyPart_1',
      partName: 'base',
      connector: 'top',
      origin: [0, 0, 10],
      worldOrigin: [1, 2, 13],
      axis: [0, 0, 1],
    };
    const b = {
      assemblyName: 'arm',
      partId: 'assemblyPart_2',
      partName: 'link',
      connector: 'bottom',
      origin: [0, 0, 0],
      worldOrigin: [1, 2, 13],
    };

    expect(buildAssemblyConnectFeatureSpec('arm', 'base-link', a, b)).toEqual({
      kind: 'assemblyConnect',
      params: {},
      inputs: {
        a: { kind: 'feature', id: 'assemblyPart_1' },
        b: { kind: 'feature', id: 'assemblyPart_2' },
      },
      metadata: {
        assemblyName: 'arm',
        connectName: 'base-link',
        kind: 'fixed',
        a: {
          partName: 'base',
          connector: 'top',
          origin: [0, 0, 10],
          worldOrigin: [1, 2, 13],
          axis: [0, 0, 1],
        },
        b: {
          partName: 'link',
          connector: 'bottom',
          origin: [0, 0, 0],
          worldOrigin: [1, 2, 13],
        },
      },
    });

    expect(buildAssemblyJointFeatureSpec('arm', 'yaw', 'revolute', { id: 'assemblyPart_1', name: 'base' }, { id: 'assemblyPart_2', name: 'link' }, {
      axis: [0, 0, 1],
      origin: [1, 2, 3],
      limitsDeg: [-90, 90],
    })).toEqual({
      kind: 'assemblyJoint',
      params: {},
      inputs: {
        a: { kind: 'feature', id: 'assemblyPart_1' },
        b: { kind: 'feature', id: 'assemblyPart_2' },
      },
      metadata: {
        assemblyName: 'arm',
        jointName: 'yaw',
        jointKind: 'revolute',
        axis: [0, 0, 1],
        origin: [1, 2, 3],
        limitsDeg: [-90, 90],
      },
    });

    expect(buildAssemblyModelFeatureSpec('arm', [
      { id: 'assemblyPart_1', name: 'base' },
      { id: 'assemblyPart_2', name: 'link' },
    ])).toEqual({
      kind: 'assemblyModel',
      params: {},
      inputs: {
        part_0: { kind: 'feature', id: 'assemblyPart_1' },
        part_1: { kind: 'feature', id: 'assemblyPart_2' },
      },
      metadata: {
        assemblyName: 'arm',
        partIds: ['assemblyPart_1', 'assemblyPart_2'],
      },
    });
  });

  it('builds solvedAssembly specs with encoded joint and mate poses', () => {
    expect(buildSolvedAssemblyFeatureSpec({
      assemblyName: 'arm',
      parts: [
        { id: 'assemblyPart_1', name: 'base' },
        { id: 'assemblyPart_2', name: 'link' },
      ],
      joints: [
        { id: 'assemblyJoint_1', name: 'yaw', kind: 'revolute' },
        { id: 'assemblyJoint_2', name: 'wrist', kind: 'ball' },
      ],
      poses: {
        yaw: 45,
        wrist: [1, 2, 3],
        grip: 12,
      },
      mateMetadata: {
        connectorsByPartId: {
          assemblyPart_1: [],
        },
        mates: [
          { name: 'grip', a: 'base.mount', b: 'link.mount', type: 'revolute' },
        ],
      },
    })).toEqual({
      kind: 'solvedAssembly',
      params: {},
      inputs: {
        part_0: { kind: 'feature', id: 'assemblyPart_1' },
        part_1: { kind: 'feature', id: 'assemblyPart_2' },
        joint_0: { kind: 'feature', id: 'assemblyJoint_1' },
        joint_1: { kind: 'feature', id: 'assemblyJoint_2' },
      },
      metadata: {
        assemblyName: 'arm',
        partIds: ['assemblyPart_1', 'assemblyPart_2'],
        jointIds: ['assemblyJoint_1', 'assemblyJoint_2'],
        poses: {
          yaw: { kind: 'scalar', value: { expression: '45', unit: 'deg', evaluated: 45 } },
          wrist: {
            kind: 'ball',
            value: [
              { expression: '1', unit: 'deg', evaluated: 1 },
              { expression: '2', unit: 'deg', evaluated: 2 },
              { expression: '3', unit: 'deg', evaluated: 3 },
            ],
          },
          grip: { kind: 'scalar', value: { expression: '12', unit: 'deg', evaluated: 12 } },
        },
        mates: [
          { name: 'grip', a: 'base.mount', b: 'link.mount', type: 'revolute' },
        ],
        couplings: [],
        connectorsByPartId: {
          assemblyPart_1: [],
        },
      },
    });
  });

  it('preserves solvedAssembly pose validation errors', () => {
    expect(() => buildSolvedAssemblyFeatureSpec({
      assemblyName: 'arm',
      parts: [{ id: 'assemblyPart_1', name: 'base' }],
      joints: [{ id: 'assemblyJoint_1', name: 'yaw', kind: 'revolute' }],
      poses: { yaw: [1, 2, 3] },
    })).toThrow("assembly.solvedModel: scalar joint 'yaw' (revolute) requires a number pose; got [x, y, z].");

    expect(() => buildSolvedAssemblyFeatureSpec({
      assemblyName: 'arm',
      parts: [{ id: 'assemblyPart_1', name: 'base' }],
      joints: [],
      poses: { gripper: 1 },
      mateMetadata: {
        connectorsByPartId: {},
        mates: [{ name: 'gripper', a: 'base.ball', b: 'tool.ball', type: 'ball' }],
      },
    })).toThrow("assembly.solvedModel: ball mate 'gripper' requires [x, y, z] pose; got number.");
  });

  it('omits empty mate metadata but preserves non-empty coupling metadata', () => {
    expect(buildAssemblyModelFeatureSpec('arm', [{ id: 'assemblyPart_1', name: 'base' }], {
      connectorsByPartId: { assemblyPart_1: [] },
      mates: [],
      couplings: [{ driven: 'finger', source: 'grip', ratio: 1 }],
    })).toEqual({
      kind: 'assemblyModel',
      params: {},
      inputs: {
        part_0: { kind: 'feature', id: 'assemblyPart_1' },
      },
      metadata: {
        assemblyName: 'arm',
        partIds: ['assemblyPart_1'],
      },
    });

    expect(buildAssemblyModelFeatureSpec('arm', [{ id: 'assemblyPart_1', name: 'base' }], {
      connectorsByPartId: { assemblyPart_1: [{ name: 'mount', type: 'frame' }] },
      mates: [{ name: 'grip', a: 'base.mount', b: 'tool.mount', type: 'revolute' }],
      couplings: [{ driven: 'finger', source: 'grip', ratio: 1, offset: 2 }],
    }).metadata).toEqual({
      assemblyName: 'arm',
      partIds: ['assemblyPart_1'],
      mates: [{ name: 'grip', a: 'base.mount', b: 'tool.mount', type: 'revolute' }],
      couplings: [{ driven: 'finger', source: 'grip', ratio: 1, offset: 2 }],
      connectorsByPartId: { assemblyPart_1: [{ name: 'mount', type: 'frame' }] },
    });
  });

  it('preserves direct CaptureSession solvedAssembly malformed-joint behavior', () => {
    const session = new CaptureSession();
    const records = (session as unknown as { records: FeatureRecord[] }).records;
    records.push({
      id: 'assemblyPart_1',
      kind: 'assemblyPart',
      params: {},
      inputs: {},
      transforms: [],
      suppressed: false,
      metadata: { assemblyName: 'arm', partName: 'base' },
    });
    records.push({
      id: 'assemblyJoint_1',
      kind: 'assemblyJoint',
      params: {},
      inputs: {},
      transforms: [],
      suppressed: false,
      metadata: { jointKind: 'revolute' },
    });

    expect(() => session.solvedAssembly(
      'arm',
      [{ id: 'assemblyPart_1', name: 'base' }],
      [{ id: 'assemblyJoint_1', name: 'yaw' }],
      { yaw: 1 },
    )).toThrow("assembly.solvedModel: joint 'yaw' not declared on assembly 'arm'.");

    expect(() => session.solvedAssembly(
      'arm',
      [],
      [{ id: 'not_a_joint', name: 'yaw' }],
      {},
    )).toThrow('assembly.solvedModel requires at least one part');
  });

  it('keeps assembly record construction outside CaptureSession', () => {
    const sessionSource = readFileSync(
      resolve(process.cwd(), 'src/modeling/capture/captureSession.ts'),
      'utf8',
    );
    const builderSource = readFileSync(
      resolve(process.cwd(), 'src/modeling/capture/assemblyFeatureRecords.ts'),
      'utf8',
    );

    const sessionImports = importSpecifiers(sessionSource);
    const builderImports = importSpecifiers(builderSource);

    expect(sessionImports).toContain('./assemblyFeatureRecords');
    expect(sessionSource).not.toContain('function encodeSolvedAssemblyPoses');
    expect(sessionSource).not.toContain('invalid-args.solvedModel.pose-shape');
    expect(sessionSource).not.toContain("kind: 'assemblyPart'");
    expect(sessionSource).not.toContain("kind: 'assemblyJoint'");
    expect(sessionSource).not.toContain("kind: 'assemblyExport'");

    expect(new Set(builderImports)).toEqual(new Set([
      '../../shared/intent/types',
      '../../shared/intent/kernelError',
      '../../shared/runtime/editableHelpers',
      '../../shared/runtime/paramRef',
    ]));
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
