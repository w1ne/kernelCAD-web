import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  createAssemblyConnectCaptureSpec,
  createAssemblyExportCaptureSpec,
  createAssemblyJointCaptureSpec,
  createAssemblyModelCaptureSpec,
  createAssemblyPartCaptureSpec,
  createSolvedAssemblyCaptureSpec,
} from '../../../src/modeling/capture/assemblyCaptureValidation';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import type { FeatureRecord } from '../../../src/shared/intent/featureRecord';

describe('assembly capture validation', () => {
  it('validates assemblyPart session membership and returns the feature spec', () => {
    expect(createAssemblyPartCaptureSpec(
      [record('box_1', 'box')],
      'arm',
      'base',
      'box_1',
      { at: [1, 2, 3] },
    )).toEqual({
      kind: 'assemblyPart',
      params: {},
      inputs: {
        shape: { kind: 'feature', id: 'box_1' },
      },
      metadata: {
        assemblyName: 'arm',
        partName: 'base',
        at: [1, 2, 3],
      },
    });

    expect(() => createAssemblyPartCaptureSpec([], 'arm', 'base', 'box_1'))
      .toThrow("assembly.part: shape 'box_1' is not from this CaptureSession");
  });

  it('validates part-backed connect, joint, and model captures', () => {
    const records = [
      record('assemblyPart_1', 'assemblyPart'),
      record('assemblyPart_2', 'assemblyPart'),
      record('box_1', 'box'),
    ];

    expect(createAssemblyConnectCaptureSpec(records, 'arm', 'base-link', {
      assemblyName: 'arm',
      partId: 'assemblyPart_1',
      partName: 'base',
      connector: 'top',
      origin: [0, 0, 10],
      worldOrigin: [1, 2, 13],
    }, {
      assemblyName: 'arm',
      partId: 'assemblyPart_2',
      partName: 'link',
      connector: 'bottom',
      origin: [0, 0, 0],
      worldOrigin: [1, 2, 13],
      axis: [0, 0, 1],
    })).toMatchObject({
      kind: 'assemblyConnect',
      inputs: {
        a: { kind: 'feature', id: 'assemblyPart_1' },
        b: { kind: 'feature', id: 'assemblyPart_2' },
      },
    });

    expect(createAssemblyJointCaptureSpec(
      records,
      'arm',
      'yaw',
      'revolute',
      { id: 'assemblyPart_1', name: 'base' },
      { id: 'assemblyPart_2', name: 'link' },
      { origin: [0, 0, 0], axis: [0, 0, 1] },
    )).toMatchObject({
      kind: 'assemblyJoint',
      metadata: {
        assemblyName: 'arm',
        jointName: 'yaw',
        jointKind: 'revolute',
      },
    });

    expect(createAssemblyModelCaptureSpec(records, 'arm', [
      { id: 'assemblyPart_1', name: 'base' },
      { id: 'assemblyPart_2', name: 'link' },
    ])).toMatchObject({
      kind: 'assemblyModel',
      metadata: {
        partIds: ['assemblyPart_1', 'assemblyPart_2'],
      },
    });

    expect(() => createAssemblyConnectCaptureSpec(records, 'arm', 'bad', {
      assemblyName: 'arm',
      partId: 'box_1',
      partName: 'box',
      connector: 'top',
      origin: [0, 0, 0],
      worldOrigin: [0, 0, 0],
    }, {
      assemblyName: 'arm',
      partId: 'assemblyPart_2',
      partName: 'link',
      connector: 'bottom',
      origin: [0, 0, 0],
      worldOrigin: [0, 0, 0],
    })).toThrow("assembly.connect: part 'box_1' is not an assembly part in this CaptureSession");
  });

  it('validates solvedAssembly inputs while preserving malformed-joint behavior', () => {
    const records = [
      record('assemblyPart_1', 'assemblyPart'),
      record('assemblyJoint_1', 'assemblyJoint', { jointName: 'yaw', jointKind: 'revolute' }),
      record('assemblyJoint_2', 'assemblyJoint', { jointKind: 'revolute' }),
    ];

    expect(createSolvedAssemblyCaptureSpec({
      records,
      assemblyName: 'arm',
      parts: [{ id: 'assemblyPart_1', name: 'base' }],
      joints: [{ id: 'assemblyJoint_1', name: 'fallback-yaw' }],
      poses: { yaw: 30 },
    })).toMatchObject({
      kind: 'solvedAssembly',
      inputs: {
        part_0: { kind: 'feature', id: 'assemblyPart_1' },
        joint_0: { kind: 'feature', id: 'assemblyJoint_1' },
      },
      metadata: {
        jointIds: ['assemblyJoint_1'],
        poses: {
          yaw: { kind: 'scalar' },
        },
      },
    });

    expect(() => createSolvedAssemblyCaptureSpec({
      records,
      assemblyName: 'arm',
      parts: [],
      joints: [{ id: 'not_a_joint', name: 'yaw' }],
      poses: {},
    })).toThrow('assembly.solvedModel requires at least one part');

    expect(() => createSolvedAssemblyCaptureSpec({
      records,
      assemblyName: 'arm',
      parts: [{ id: 'assemblyPart_1', name: 'base' }],
      joints: [{ id: 'assemblyJoint_2', name: 'yaw' }],
      poses: { yaw: 1 },
    })).toThrow("assembly.solvedModel: joint 'yaw' not declared on assembly 'arm'.");
  });

  it('validates assemblyExport source membership and kind', () => {
    const records = [
      record('solvedAssembly_1', 'solvedAssembly'),
      record('assemblyModel_1', 'assemblyModel'),
      record('box_1', 'box'),
    ];

    expect(createAssemblyExportCaptureSpec(records, 'solvedAssembly_1', 'compound')).toMatchObject({
      kind: 'assemblyExport',
      inputs: {
        scene: { kind: 'feature', id: 'solvedAssembly_1' },
      },
    });
    expect(createAssemblyExportCaptureSpec(records, 'assemblyModel_1', 'union')).toMatchObject({
      kind: 'assemblyExport',
      metadata: { op: 'union' },
    });

    expect(() => createAssemblyExportCaptureSpec(records, 'missing_1', 'compound'))
      .toThrow("assemblyExport: source scene feature 'missing_1' is not from this CaptureSession");
    expect(() => createAssemblyExportCaptureSpec(records, 'box_1', 'compound'))
      .toThrow("assemblyExport: source feature 'box_1' is kind 'box'; expected 'solvedAssembly' or 'assemblyModel'.");
  });

  it('leaves record ownership, ids, and paramRefs in CaptureSession', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const yawDeg = kcad.param('yawDeg', 15);
    const baseShape = kcad.box(10, 10, 10);
    const linkShape = kcad.box(20, 10, 10);
    const base = session.assemblyPart('arm', 'base', baseShape);
    const link = session.assemblyPart('arm', 'link', linkShape);
    const yaw = session.assemblyJoint(
      'arm',
      'yaw',
      'revolute',
      { id: base.id, name: 'base' },
      { id: link.id, name: 'link' },
      { origin: [0, 0, 0], axis: [0, 0, 1] },
    );

    const beforeFailureCount = session.getRecords().length;
    expect(() => session.assemblyExport(baseShape.id, 'compound'))
      .toThrow(`assemblyExport: source feature '${baseShape.id}' is kind 'box'; expected 'solvedAssembly' or 'assemblyModel'.`);
    expect(session.getRecords()).toHaveLength(beforeFailureCount);

    const scene = session.solvedAssembly(
      'arm',
      [{ id: base.id, name: 'base' }, { id: link.id, name: 'link' }],
      [{ id: yaw.id, name: 'yaw' }],
      { yaw: yawDeg },
    );

    const lastRecord = session.getRecords().at(-1)!;
    expect(scene.id).toBe(lastRecord.id);
    expect(lastRecord.id).toMatch(/^solvedAssembly_/);
    expect((lastRecord.metadata as { paramRefs?: string[] }).paramRefs).toEqual(['yawDeg']);
  });

  it('keeps assembly validation outside CaptureSession', () => {
    const sessionSource = readFileSync(
      resolve(process.cwd(), 'src/modeling/capture/captureSession.ts'),
      'utf8',
    );
    const validationSource = readFileSync(
      resolve(process.cwd(), 'src/modeling/capture/assemblyCaptureValidation.ts'),
      'utf8',
    );

    expect(importSpecifiers(sessionSource)).toContain('./assemblyCaptureValidation');
    expect(sessionSource).not.toContain('assembly.connect: part');
    expect(sessionSource).not.toContain('assembly.solvedModel: joint');
    expect(sessionSource).not.toContain('assemblyExport: source');
    expect(validationSource).toContain("assembly.solvedModel: joint '");
  });
});

function record(id: string, kind: FeatureRecord['kind'], metadata?: Record<string, unknown>): FeatureRecord {
  return {
    id,
    kind,
    params: {},
    inputs: {},
    transforms: [],
    suppressed: false,
    ...(metadata !== undefined ? { metadata } : {}),
  };
}

function importSpecifiers(sourceText: string): string[] {
  const sourceFile = ts.createSourceFile('source.ts', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const imports: string[] = [];

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push(node.moduleSpecifier.text);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}
