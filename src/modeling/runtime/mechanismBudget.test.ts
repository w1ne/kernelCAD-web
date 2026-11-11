// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';
import { checkMechanismTruth } from './mechanismTruth';
import { initOcct, OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { Transform } from '../../shared/runtime/se3';
import { restMeshBvh, restWorldMesh, watertightWorldMesh } from './restAnalysisMesh';
import { summarizeMechanism } from './mechanismVerdict';
import { runPhysicsCriteria } from './mechanismTruthPhysics';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import * as mjcfExport from './mjcfExport';

describe('mechanism rest checks under a skipped sweep', () => {
  it('rejects a nonnumeric runtime physics budget with a typed warning', async () => {
    const kcad = createModelingApi({ session: new CaptureSession() });
    const arm = kcad.assembly('invalid-physics-budget');
    arm.part('body', kcad.box(10, 10, 10));
    const loadSession = vi.fn(async () => { throw new Error('session must not load'); });

    const result = await runPhysicsCriteria(arm, [], undefined, loadSession, 'bogus' as unknown as number);
    expect(result.ran).toBe(false);
    expect(result.failures[0]).toMatchObject({ code: 'mechanism.physics-budget-exceeded', severity: 'warn' });
    expect(result.failures[0].message).toMatch(/invalid/);
    expect(loadSession).not.toHaveBeenCalled();
  });

  it('keeps single-part physics coverage vacuously complete', async () => {
    const kcad = createModelingApi({ session: new CaptureSession() });
    const arm = kcad.assembly('single-part-physics');
    arm.part('body', kcad.box(10, 10, 10));
    const loadSession = vi.fn(async () => { throw new Error('session must not load'); });

    const result = await checkMechanismTruth(arm, {
      physicsCheck: true, physicsBudget: Infinity, physicsSessionFactory: loadSession,
    });
    expect(result.mechanism).toBe('real');
    expect(result.coverage?.physics).toBe(true);
    expect(result.failures.map((failure) => failure.code)).not.toContain('mechanism.physics-budget-exceeded');
    expect(loadSession).not.toHaveBeenCalled();
  }, 60000);

  it('forces a physics skip without accessing a rest mesh', async () => {
    await initOcct();
    const kcad = createModelingApi({ session: new CaptureSession() });
    const arm = kcad.assembly('zero-physics-budget');
    arm.part('body', kcad.box(10, 10, 10));
    const shape = OcctBackend.box(10, 10, 10, true);
    const getMesh = vi.spyOn(shape, 'getMesh');
    const assemblyToMjcf = vi.spyOn(mjcfExport, 'assemblyToMjcf');
    const scene = { _kind: 'scene', target: 'occt', assemblyName: arm.name,
      parts: [{ name: 'body', shape, worldTransform: Transform.identity() }] } as SceneBackend;
    const loadSession = vi.fn(async () => { throw new Error('session must not load'); });

    const result = await runPhysicsCriteria(arm, [], scene, loadSession, 0);
    expect(result.ran).toBe(false);
    expect(result.failures[0]).toMatchObject({ code: 'mechanism.physics-budget-exceeded', severity: 'warn' });
    expect(getMesh).not.toHaveBeenCalled();
    expect(assemblyToMjcf).not.toHaveBeenCalled();
    expect(loadSession).not.toHaveBeenCalled();
    assemblyToMjcf.mockRestore();
  });

  it('fails closed when custom collision pieces have unbounded mesh work', async () => {
    await initOcct();
    const kcad = createModelingApi({ session: new CaptureSession() });
    const arm = kcad.assembly('custom-collision-physics');
    const body = arm.part('body', kcad.box(10, 10, 10)).collision([kcad.box(5, 5, 5)]);
    const anchor = arm.part('anchor', kcad.box(10, 10, 10));
    body.connector('joint', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    anchor.connector('joint', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('hinge', 'body.joint', 'anchor.joint', 'revolute', { limitsDeg: [-30, 30] });
    const shape = OcctBackend.box(10, 10, 10, true);
    const part = { name: 'body', shape, worldTransform: Transform.identity() };
    restWorldMesh(part, 'analysis');
    const scene = { _kind: 'scene', target: 'occt', assemblyName: arm.name,
      parts: [part, { name: 'anchor', shape: OcctBackend.box(10, 10, 10, true), worldTransform: Transform.identity() }] } as SceneBackend;
    const loadSession = vi.fn(async () => { throw new Error('session must not load'); });

    const result = await runPhysicsCriteria(arm, [], scene, loadSession);
    expect(result.ran).toBe(false);
    expect(result.failures[0]).toMatchObject({ code: 'mechanism.physics-budget-exceeded', severity: 'warn' });
    expect(result.failures[0].message).toMatch(/custom collision/);
    expect(loadSession).not.toHaveBeenCalled();
  });
  it('keeps displayed and nominal analysis geometry separate in the rest cache', async () => {
    await initOcct();
    const displayed = OcctBackend.box(4, 4, 4, true);
    displayed.analysisBody = OcctBackend.box(12, 12, 12, true);
    const part = { name: 'fastener', shape: displayed, worldTransform: Transform.identity() };
    const raw = restWorldMesh(part, 'shape');
    const nominal = restWorldMesh(part, 'analysis');
    expect(raw?.mesh.max[0]).toBeCloseTo(2);
    expect(nominal?.mesh.max[0]).toBeCloseTo(6);
    expect(restWorldMesh(part, 'shape')).toBe(raw);
    expect(restWorldMesh(part, 'analysis')).toBe(nominal);
    expect(restMeshBvh(part, 'shape')).toBeDefined();
    expect(restMeshBvh(part, 'analysis')).toBeDefined();
  });

  it('rejects a volume-compatible but open triangle mesh for parity queries', () => {
    const mesh = {
      closed: true,
      positions: new Float64Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      indices: new Uint32Array([0, 1, 2]),
      min: [0, 0, 0] as [number, number, number],
      max: [1, 1, 0] as [number, number, number],
    };
    expect(watertightWorldMesh(mesh)).toBe(false);
  });

  it('keeps a rest collision broken and reports the sweep budget', async () => {
    const kcad = createModelingApi({ session: new CaptureSession() });
    const arm = kcad.assembly('rest-overlap');
    const parent = arm.part('parent', kcad.box(10, 10, 10, true));
    const child = arm.part('child', kcad.box(10, 10, 10, true));
    parent.connector('joint', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    child.connector('joint', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('hinge', 'parent.joint', 'child.joint', 'revolute', { limitsDeg: [-30, 30] });

    const result = await checkMechanismTruth(arm, { sweepBudget: 0 });
    expect(result.mechanism).toBe('broken');
    expect(result.failures.map((failure) => failure.code)).toContain('mechanism.rest-interpenetration');
    expect(result.failures.map((failure) => failure.code)).toContain('mechanism.unverified-budget-exceeded');
    expect(result.failures.find((failure) => failure.code === 'mechanism.unverified-budget-exceeded')?.severity).toBe('warn');
    expect(result.coverage?.sweep).toBe(false);
  }, 60000);

  it('keeps a floating joint broken and reports the sweep budget', async () => {
    const kcad = createModelingApi({ session: new CaptureSession() });
    const arm = kcad.assembly('rest-gap');
    const parent = arm.part('parent', kcad.box(10, 10, 10, true).translate(0, 0, -10));
    const child = arm.part('child', kcad.box(10, 10, 10, true).translate(0, 0, 10));
    parent.connector('joint', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    child.connector('joint', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('hinge', 'parent.joint', 'child.joint', 'revolute', { limitsDeg: [-30, 30] });

    const result = await checkMechanismTruth(arm, { sweepBudget: 0 });
    expect(result.mechanism).toBe('broken');
    expect(result.failures.map((failure) => failure.code)).toContain('mechanism.joint-mesh-gap');
    expect(result.failures.map((failure) => failure.code)).toContain('mechanism.unverified-budget-exceeded');
    expect(result.failures.find((failure) => failure.code === 'mechanism.unverified-budget-exceeded')?.severity).toBe('warn');
  }, 60000);

  it('counts a nested solid as contact while reporting its rest collision', async () => {
    const kcad = createModelingApi({ session: new CaptureSession() });
    const arm = kcad.assembly('nested');
    const parent = arm.part('parent', kcad.box(20, 20, 20, true));
    const child = arm.part('child', kcad.box(2, 2, 2, true));
    parent.connector('joint', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    child.connector('joint', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('hinge', 'parent.joint', 'child.joint', 'revolute', { limitsDeg: [-30, 30] });

    const result = await checkMechanismTruth(arm, { sweepBudget: 0 });
    expect(result.failures.map((failure) => failure.code)).toContain('mechanism.rest-interpenetration');
    expect(result.failures.map((failure) => failure.code)).not.toContain('mechanism.mate-gap');
  }, 60000);

  it('skips physics before MJCF work and reports an unverified mechanism', async () => {
    const kcad = createModelingApi({ session: new CaptureSession() });
    const arm = kcad.assembly('physics-budget');
    const parent = arm.part('parent', kcad.box(10, 10, 10, true).translate(0, 0, -5));
    const child = arm.part('child', kcad.box(10, 10, 10, true).translate(0, 0, 5));
    parent.connector('joint', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    child.connector('joint', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('hinge', 'parent.joint', 'child.joint', 'revolute', { limitsDeg: [-30, 30] });
    const physicsSessionFactory = vi.fn(async () => { throw new Error('physics session must not load'); });

    const result = await checkMechanismTruth(arm, {
      sweepBudget: Infinity,
      physicsCheck: true,
      physicsBudget: 0,
      physicsSessionFactory,
    });
    const warning = result.failures.find((failure) => failure.code === 'mechanism.physics-budget-exceeded');
    expect(warning?.severity).toBe('warn');
    expect(result.mechanism).toBe('unverified');
    expect(result.coverage?.physics).toBe(false);
    expect(result.coverage?.sweep).toBe(true);
    expect(result.failures.filter((failure) => failure.severity === 'error')).toEqual([]);
    expect(physicsSessionFactory).not.toHaveBeenCalled();
    const summary = summarizeMechanism(result);
    expect(summary.maxLevel).toBe('warning');
    expect(summary.skipped).toContainEqual(expect.stringMatching(/physics.*skipped/i));
    expect(summary.skipped).not.toContainEqual(expect.stringMatching(/collision sweep.*skipped/i));
  }, 60000);

  it('keeps a rest error broken when physics is skipped', async () => {
    const kcad = createModelingApi({ session: new CaptureSession() });
    const arm = kcad.assembly('rest-error-physics-budget');
    const parent = arm.part('parent', kcad.box(10, 10, 10, true));
    const child = arm.part('child', kcad.box(10, 10, 10, true));
    parent.connector('joint', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    child.connector('joint', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('hinge', 'parent.joint', 'child.joint', 'revolute', { limitsDeg: [-30, 30] });
    const loadSession = vi.fn(async () => { throw new Error('session must not load'); });

    const result = await checkMechanismTruth(arm, { sweepBudget: 0, physicsCheck: true, physicsBudget: 0, physicsSessionFactory: loadSession });
    expect(result.mechanism).toBe('broken');
    expect(result.failures.map((failure) => failure.code)).toContain('mechanism.rest-interpenetration');
    expect(result.failures.map((failure) => failure.code)).toContain('mechanism.physics-budget-exceeded');
    expect(result.coverage?.physics).toBe(false);
    expect(loadSession).not.toHaveBeenCalled();
  }, 60000);
});
