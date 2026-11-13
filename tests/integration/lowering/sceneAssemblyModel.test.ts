// tests/integration/lowering/sceneAssemblyModel.test.ts
//
// Integration coverage for the SceneBackend emission path of the
// `assemblyModel` lowerer case.
//
// Mirrors `sceneBackendEmission.test.ts` (the solvedAssembly counterpart)
// but for `model()`: mate-free assemblies keep identity transforms, while
// mate-bearing assemblies apply the declared default mate pose. This test
// asserts:
//   - The lowered output is a SceneBackend (per `isSceneBackend`).
//   - It has one entry per assembly part, with `name` matching
//     `assembly.part(name, ...)`.
//   - Mate-free model() parts carry `worldTransform = Transform.identity()`.
//   - Mate-bearing model() records apply mate FK from captured metadata.
//   - The assembly's `assemblyName` propagates onto the SceneBackend.
//   - Per-part color is resolved via `lookupSourceColor`.
//   - No boolean union is performed — each part stays in its local
//     authoring frame (verified via per-part bbox).
//
// Existing assemblyLowerer tests that asserted unioned-Shape semantics
// (single fused OcctBackend, summed volume, exportSTLAsync on the model)
// will fail under this change; their migration is Task 14.
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { isSceneBackend, type SceneBackend } from '../../../src/kernel/backends/sceneBackend';
import { Transform } from '../../../src/shared/runtime/se3';
import type { CompilerDiagnostic } from '../../../src/shared/diagnostics/diagnostic';
import type { Scene } from '../../../src/modeling/validation/scene';

interface LowerResult {
  shape: unknown;
  diagnostics: CompilerDiagnostic[];
}

async function lowerScript(code: string): Promise<LowerResult> {
  const { records, paramTable } = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(records, { paramTable });
  const last = records[records.length - 1];
  return {
    shape: r.shapes.get(last.id),
    diagnostics: r.diagnostics,
  };
}

function expectIdentity(t: Transform): void {
  const m = t.toMat4();
  // Column-major identity.
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      const expected = col === row ? 1 : 0;
      expect(m[col * 4 + row]).toBeCloseTo(expected, 9);
    }
  }
}

describe('assemblyModel lowerer — SceneBackend emission', () => {
  beforeAll(async () => { await initOcct(); });

  it('emits SceneBackend with worldTransform=identity per part', async () => {
    const { shape, diagnostics } = await lowerScript(`
      const arm = assembly('test');
      arm.part('base', box(10, 10, 10), { at: [0, 0, 0] });
      arm.part('link', box(10, 10, 30), { at: [30, 0, 0] });
      return arm.model();
    `);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(isSceneBackend(shape)).toBe(true);
    const scene = shape as SceneBackend;
    expect(scene.assemblyName).toBe('test');
    expect(scene.parts.length).toBe(2);

    expect(scene.parts[0].name).toBe('base');
    expect(scene.parts[1].name).toBe('link');

    expect(scene.parts[0].worldTransform).toBeInstanceOf(Transform);
    expect(scene.parts[1].worldTransform).toBeInstanceOf(Transform);

    // Mate-free model() is the unposed view: every worldTransform is identity.
    // (`at:` placements are baked into each part's local shape upstream, so
    // the assembly-frame transform per part is I.)
    expectIdentity(scene.parts[0].worldTransform);
    expectIdentity(scene.parts[1].worldTransform);
  });

  it('applies mate default pose from assembly.model() metadata', async () => {
    const { shape, diagnostics } = await lowerScript(`
      const stroke = param('stroke', 12);
      const lift = assembly('lift');
      const sleeve = lift.part('sleeve', box(20, 20, 20));
      sleeve.connector('rail', {
        type: 'axis',
        origin: { kind: 'vec3', value: [0, 0, 0] },
        axis: [0, 0, 1],
      });
      const post = lift.part('post', box(10, 10, 30));
      post.connector('slide', {
        type: 'axis',
        origin: { kind: 'vec3', value: [0, 0, 0] },
        axis: [0, 0, 1],
      });
      lift.mate('height-adjust', 'sleeve.rail', 'post.slide', 'prismatic', {
        pose: stroke,
        limitsMm: [0, 20],
      });
      return lift.model();
    `);

    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(isSceneBackend(shape)).toBe(true);
    const scene = shape as SceneBackend;
    const post = scene.parts.find((p) => p.name === 'post');
    expect(post).toBeDefined();

    const origin = post!.worldTransform.point([0, 0, 0]);
    expect(origin[0]).toBeCloseTo(0);
    expect(origin[1]).toBeCloseTo(0);
    expect(origin[2]).toBeCloseTo(12);
  });

  it('returns capture-time mate transforms consistent with the lowered model scene', async () => {
    const { records, paramTable, returnValue } = await runScript({
      fileName: 'model-scene-mate-transforms.kcad.ts',
      code: `
        const arm = assembly('test');
        arm.part('base', box(10, 10, 10)).connector('p', {
          type: 'frame', origin: { kind: 'vec3', value: [5, 0, 0] },
        });
        const child = arm.part('child', box(10, 10, 10), {
          connectors: { mount: { origin: [10, 0, 0] } },
        });
        child.connector('q', {
          type: 'frame', origin: { kind: 'vec3', value: [-5, 0, 0] },
        });
        arm.part('tip', box(2, 2, 2), {
          connectors: { root: { origin: [0, 0, 0] } },
          connect: { connector: 'root', to: child.connector('mount') },
        });
        arm.mate('m', 'base.p', 'child.q', 'fastened');
        return arm.model();
      `,
    });
    const modelRecord = records.at(-1)!;
    const result = await new RecomputeEngine(new OcctLowerer()).run(records, { paramTable });
    const capturedScene = returnValue as Scene;
    const loweredScene = result.shapes.get(modelRecord.id) as SceneBackend;
    const capturedChild = capturedScene.part('child');
    const loweredChild = loweredScene.parts.find((part) => part.name === 'child');
    const capturedTip = capturedScene.part('tip');
    const loweredTip = loweredScene.parts.find((part) => part.name === 'tip');

    expect(loweredChild).toBeDefined();
    expect(loweredTip).toBeDefined();
    expect(capturedChild.worldTransform.point([0, 0, 0])[0]).toBeCloseTo(
      loweredChild!.worldTransform.point([0, 0, 0])[0],
    );
    expect(capturedChild.worldTransform.point([0, 0, 0])[0]).toBeCloseTo(10);
    expect(capturedTip.worldTransform.point([0, 0, 0])[0]).toBeCloseTo(10);
    expect(capturedTip.worldTransform.point([0, 0, 0])[0]).toBeCloseTo(
      loweredTip!.worldTransform.point([0, 0, 0])[0],
    );
  });

  it('resolves parameter poses and removes authored at from the captured mate transform', async () => {
    const { records, paramTable, returnValue } = await runScript({
      fileName: 'model-scene-param-mate-transforms.kcad.ts',
      code: `
        const stroke = param('stroke', 12);
        const arm = assembly('lift');
        arm.part('sleeve', box(20, 20, 20)).connector('rail', {
          type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1],
        });
        arm.part('post', box(10, 10, 30), { at: [20, 0, 0] }).connector('slide', {
          type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1],
        });
        arm.mate('height-adjust', 'sleeve.rail', 'post.slide', 'prismatic', { pose: stroke });
        return arm.model();
      `,
    });
    const modelRecord = records.at(-1)!;
    const result = await new RecomputeEngine(new OcctLowerer()).run(records, { paramTable });
    const capturedScene = returnValue as Scene;
    const loweredScene = result.shapes.get(modelRecord.id) as SceneBackend;
    const capturedChild = capturedScene.part('post');
    const loweredChild = loweredScene.parts.find((part) => part.name === 'post');

    expect(loweredChild).toBeDefined();
    for (const point of [[0, 0, 0], [10, -4, 2]] as const) {
      const captured = capturedChild.worldTransform.point(point);
      const lowered = loweredChild!.worldTransform.point(point);
      for (let axis = 0; axis < 3; axis++) expect(captured[axis]).toBeCloseTo(lowered[axis], 8);
    }
    const origin = capturedChild.worldTransform.point([0, 0, 0]);
    expect(origin[0]).toBeCloseTo(-20);
    expect(origin[1]).toBeCloseTo(0);
    expect(origin[2]).toBeCloseTo(12);
  });

  it.each([
    { label: 'parameter source with signed ratio and offset', sourcePose: 30, drivenPose: undefined, expectedDriven: -55 },
    { label: 'explicit driven override', sourcePose: 30, drivenPose: 17, expectedDriven: 17 },
    { label: 'absent source pose', sourcePose: undefined, drivenPose: undefined, expectedDriven: 0 },
    { label: 'explicit zero source with offset', sourcePose: 0, drivenPose: undefined, expectedDriven: 5 },
  ])('keeps capture and lowerer coupling poses aligned: $label', async ({ sourcePose, drivenPose, expectedDriven }) => {
    const { records, paramTable, returnValue } = await runScript({
      fileName: 'model-scene-coupled-mate-transforms.kcad.ts',
      code: `
        const drive = param('drive', ${sourcePose ?? 0});
        const arm = assembly('coupled-capture');
        arm.part('base', box(4, 4, 4))
          .connector('input', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
          .connector('output', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('driver', box(10, 2, 2))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.part('driven', box(12, 3, 3))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.mate('input', 'base.input', 'driver.axis', 'revolute'${sourcePose === undefined ? '' : ', { pose: drive }'});
        arm.mate('output', 'base.output', 'driven.axis', 'revolute'${drivenPose === undefined ? '' : `, { pose: ${drivenPose} }`});
        arm.coupleMates('output', { source: 'input', ratio: -2, offset: 5 });
        return arm.model();
      `,
    });
    const result = await new RecomputeEngine(new OcctLowerer()).run(records, { paramTable });
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const capturedScene = returnValue as Scene;
    const loweredScene = result.shapes.get(records.at(-1)!.id);
    expect(isSceneBackend(loweredScene)).toBe(true);
    if (!isSceneBackend(loweredScene)) throw new Error('Expected the coupled model scene');
    expect(capturedScene.parts).toHaveLength(3);
    expect(loweredScene.parts).toHaveLength(3);

    for (const [name, expectedAngle] of [['driver', sourcePose ?? 0], ['driven', expectedDriven]] as const) {
      const captured = capturedScene.part(name).worldTransform;
      const lowered = loweredScene.parts.find((part) => part.name === name)!.worldTransform;
      const lowerMatrix = lowered.toMat4();
      for (const [index, value] of captured.toMat4().entries()) expect(value).toBeCloseTo(lowerMatrix[index], 8);
      const radians = expectedAngle * Math.PI / 180;
      for (const transform of [captured, lowered]) {
        const direction = transform.axisDir([1, 0, 0]);
        expect(direction[0]).toBeCloseTo(Math.cos(radians), 8);
        expect(direction[1]).toBeCloseTo(Math.sin(radians), 8);
        expect(direction[2]).toBeCloseTo(0, 8);
      }
    }
  });

  it('preserves per-part colors via lookupSourceColor', async () => {
    const { shape, diagnostics } = await lowerScript(`
      const arm = assembly('test');
      arm.part('base', box(10, 10, 10).color('plate'),  { at: [0, 0, 0] });
      arm.part('link', box(10, 10, 30).color('beam'),   { at: [30, 0, 0] });
      return arm.model();
    `);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(isSceneBackend(shape)).toBe(true);
    const scene = shape as SceneBackend;
    const byName = new Map(scene.parts.map(p => [p.name, p]));
    expect(byName.get('base')?.color).toBe('plate');
    expect(byName.get('link')?.color).toBe('beam');
  });

  it('does NOT boolean-union the parts (each part stays a local-frame shape)', async () => {
    // Each part shape is its own OcctBackend in its local authoring frame —
    // not a fused TopoDS_Compound. We verify by checking each part's bbox
    // matches its primitive box dimensions (a unioned shape would have a
    // single bbox spanning both boxes' extents).
    const { shape, diagnostics } = await lowerScript(`
      const arm = assembly('test');
      arm.part('base', box(10, 10, 10), { at: [0, 0, 0] });
      arm.part('link', box(60, 10, 10).translate(30, 0, 0), { at: [0, 0, 0] });
      return arm.model();
    `);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(isSceneBackend(shape)).toBe(true);
    const scene = shape as SceneBackend;

    const baseShape = scene.parts[0].shape as OcctBackend;
    const baseBb = baseShape.boundingBox();
    expect(baseBb.max[0] - baseBb.min[0]).toBeCloseTo(10, 5);
    expect(baseBb.max[1] - baseBb.min[1]).toBeCloseTo(10, 5);
    expect(baseBb.max[2] - baseBb.min[2]).toBeCloseTo(10, 5);

    const linkShape = scene.parts[1].shape as OcctBackend;
    const linkBb = linkShape.boundingBox();
    // The link is its own primitive box (60x10x10) translated by [30,0,0]
    // in its local authoring frame — independent OcctBackend, not fused.
    expect(linkBb.max[0] - linkBb.min[0]).toBeCloseTo(60, 5);
    expect(linkBb.max[1] - linkBb.min[1]).toBeCloseTo(10, 5);
  });
});
