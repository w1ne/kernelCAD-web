// examples/robot-arm/so100/so100-arm.kcad.ts is the landing hero.
// Default `kernelcad validate` only checks the mate graph. The example
// sweep is over the solid-check budget, so it never opens this file's
// geometry. The arm has shipped with servo bodies off their pockets while
// both gates were green, so this test compares the solved arm with the
// upstream URDF: every link and every motor must sit where so100.urdf
// forward kinematics puts its mesh, at a pose that bends all six joints.

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { listPartStats } from '../../../src/agent/script-runtime/partStats';
import { PER_EXAMPLE_TIMEOUT_MS } from '../physics-loop/exampleSweepShared';

const EXAMPLE_PATH = 'examples/robot-arm/so100/so100-arm.kcad.ts';
const SIM_DIR = 'examples/robot-arm/so100/parts/sim';

type Vec3 = [number, number, number];
type Mat3 = [Vec3, Vec3, Vec3];
type UrdfJoint = { name: string; parent: string; child: string; xyz: Vec3; rpy: Vec3; axis: Vec3 };
type Frame = { rot: Mat3; at: Vec3 };
type Box = { min: Vec3; max: Vec3 };

// URDF link -> part name in the script, and URDF joint -> driving param.
const LINK_PART: Record<string, string> = {
  base: 'base', shoulder: 'shoulder', upper_arm: 'upper-arm', lower_arm: 'lower-arm',
  wrist: 'wrist', gripper: 'hand', jaw: 'jaw',
};
const SERVO_PART: Record<string, string> = {
  base: 'base-servo', shoulder: 'shoulder-servo', upper_arm: 'upper-servo',
  lower_arm: 'lower-servo', wrist: 'wrist-servo', gripper: 'hand-servo',
};
const JOINT_PARAM: Record<string, string> = {
  shoulder_pan: 'panDeg', shoulder_lift: 'liftDeg', elbow_flex: 'elbowDeg',
  wrist_flex: 'wristDeg', wrist_roll: 'rollDeg', gripper: 'jawDeg',
};
// Every joint is off zero and off a right angle, so a wrong axis, a wrong
// sign or a missing parent rotation moves a part by centimetres.
const POSE_DEG: Record<string, number> = {
  panDeg: 50, liftDeg: 105, elbowDeg: -65, wristDeg: -20, rollDeg: 60, jawDeg: 40,
};
const BBOX_TOL_MM = 0.1;

const numbers = (text: string): Vec3 => text.trim().split(/\s+/).map(Number) as Vec3;

function mul(a: Mat3, b: Mat3): Mat3 {
  const cell = (r: number, c: number) => a[r][0] * b[0][c] + a[r][1] * b[1][c] + a[r][2] * b[2][c];
  return [0, 1, 2].map((r) => [cell(r, 0), cell(r, 1), cell(r, 2)]) as Mat3;
}

function turn(m: Mat3, v: Vec3): Vec3 {
  return m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]) as Vec3;
}

function aboutAxis(axis: Vec3, rad: number): Mat3 {
  const [x, y, z] = axis;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const t = 1 - c;
  return [
    [c + x * x * t, x * y * t - z * s, x * z * t + y * s],
    [y * x * t + z * s, c + y * y * t, y * z * t - x * s],
    [z * x * t - y * s, z * y * t + x * s, c + z * z * t],
  ];
}

function rpyMatrix(rpy: Vec3): Mat3 {
  return mul(aboutAxis([0, 0, 1], rpy[2]), mul(aboutAxis([0, 1, 0], rpy[1]), aboutAxis([1, 0, 0], rpy[0])));
}

function parseUrdf(): { joints: UrdfJoint[]; meshes: Record<string, string[]> } {
  const urdf = readFileSync(join(SIM_DIR, 'so100.urdf'), 'utf8');
  const joints: UrdfJoint[] = [];
  for (const m of urdf.matchAll(/<joint name="(\w+)" type="revolute">([\s\S]*?)<\/joint>/g)) {
    const body = m[2];
    const origin = /<origin xyz="([^"]+)" rpy="([^"]+)"/.exec(body)!;
    joints.push({
      name: m[1],
      parent: /<parent link="(\w+)"/.exec(body)![1],
      child: /<child link="(\w+)"/.exec(body)![1],
      xyz: numbers(origin[1]).map((v) => v * 1000) as Vec3,
      rpy: numbers(origin[2]),
      axis: numbers(/<axis xyz="([^"]+)"/.exec(body)![1]),
    });
  }
  const meshes: Record<string, string[]> = {};
  for (const m of urdf.matchAll(/<link name="(\w+)">([\s\S]*?)<\/link>/g)) {
    meshes[m[1]] = [...m[2].matchAll(/<visual>[\s\S]*?filename="assets\/([\w.]+)"/g)].map((v) => v[1]);
  }
  return { joints, meshes };
}

// Binary STL vertices in millimetres.
function stlPoints(file: string): Vec3[] {
  const buf = readFileSync(join(SIM_DIR, file));
  const count = buf.readUInt32LE(80);
  const points: Vec3[] = [];
  for (let tri = 0; tri < count; tri += 1) {
    for (let corner = 0; corner < 3; corner += 1) {
      const at = 84 + tri * 50 + 12 + corner * 12;
      points.push([buf.readFloatLE(at) * 1000, buf.readFloatLE(at + 4) * 1000, buf.readFloatLE(at + 8) * 1000]);
    }
  }
  return points;
}

function boxOf(points: Vec3[], frame: Frame): Box {
  const box: Box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  for (const p of points) {
    const r = turn(frame.rot, p);
    for (let k = 0; k < 3; k += 1) {
      const v = r[k] + frame.at[k];
      if (v < box.min[k]) box.min[k] = v;
      if (v > box.max[k]) box.max[k] = v;
    }
  }
  return box;
}

function linkFrames(joints: UrdfJoint[], poseDeg: Record<string, number>): Record<string, Frame> {
  const frames: Record<string, Frame> = { base: { rot: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], at: [0, 0, 0] } };
  for (const joint of joints) {
    const parent = frames[joint.parent];
    const offset = turn(parent.rot, joint.xyz);
    const q = (poseDeg[JOINT_PARAM[joint.name]] * Math.PI) / 180;
    frames[joint.child] = {
      rot: mul(parent.rot, mul(rpyMatrix(joint.rpy), aboutAxis(joint.axis, q))),
      at: [parent.at[0] + offset[0], parent.at[1] + offset[1], parent.at[2] + offset[2]],
    };
  }
  return frames;
}

function worstGap(a: Box, b: Box): number {
  let worst = 0;
  for (let k = 0; k < 3; k += 1) {
    worst = Math.max(worst, Math.abs(a.min[k] - b.min[k]), Math.abs(a.max[k] - b.max[k]));
  }
  return worst;
}

describe('SO-100 arm matches the upstream URDF', () => {
  const { joints, meshes } = parseUrdf();

  beforeAll(async () => {
    await initOcct();
  });

  it('reads six joints and a motor mesh for every driven link', () => {
    expect(joints.map((j) => j.name)).toEqual(Object.keys(JOINT_PARAM));
    for (const joint of joints) expect(meshes[joint.parent]).toHaveLength(2);
  });

  it('has every motor output shaft on the joint axis it drives', () => {
    for (const joint of joints) {
      const axis = turn(rpyMatrix(joint.rpy), joint.axis);
      const along = axis.findIndex((v) => Math.abs(v) > 0.999);
      expect(along, `${joint.name} axis is link-aligned`).toBeGreaterThanOrEqual(0);
      const points = stlPoints(meshes[joint.parent][1]);
      const span = points.map((p) => p[along]);
      // The output spline is the small round boss on one end of the case;
      // the other end is the flat cover, whose rim is centimetres across.
      const ends = [Math.min(...span), Math.max(...span)].map((end) => {
        const ring = points.filter((p) => Math.abs(p[along] - end) < 0.3);
        const offAxis = ring.map((p) => Math.hypot(...p.map((v, k) => (k === along ? 0 : v - joint.xyz[k]))));
        return Math.max(...offAxis);
      });
      expect(Math.min(...ends), `${joint.name} shaft tip radius about the joint axis`).toBeLessThan(3);
    }
  });

  it('puts every link and motor where the URDF does, with all six joints bent', async () => {
    let code = readFileSync(EXAMPLE_PATH, 'utf8');
    for (const [name, value] of Object.entries(POSE_DEG)) {
      const before = code;
      code = code.replace(new RegExp(`param\\('${name}', -?[\\d.]+,`), `param('${name}', ${value},`);
      expect(code, `default of ${name} rewritten`).not.toBe(before);
    }
    const file = resolve(EXAMPLE_PATH);
    const solved = await listPartStats({ code, fileName: file, scriptDir: dirname(file) });
    expect(solved.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const byName = new Map(solved.parts.map((part) => [part.name, part]));

    const frames = linkFrames(joints, POSE_DEG);
    const gaps: Record<string, number> = {};
    for (const [link, files] of Object.entries(meshes)) {
      const expected: [string, string][] = [[LINK_PART[link], files[0]]];
      if (files[1] !== undefined) expected.push([SERVO_PART[link], files[1]]);
      for (const [partName, meshFile] of expected) {
        const part = byName.get(partName);
        expect(part, `part ${partName}`).toBeDefined();
        gaps[partName] = worstGap(part!.bbox as Box, boxOf(stlPoints(meshFile), frames[link]));
      }
    }
    expect(Object.keys(gaps)).toHaveLength(13);
    const off = Object.fromEntries(Object.entries(gaps).filter(([, gap]) => gap > BBOX_TOL_MM));
    expect(off).toEqual({});

    // A motor is the STS3215 case, not the block that bounds it.
    for (const servo of Object.values(SERVO_PART)) {
      const { bbox, volumeMm3 } = byName.get(servo)!;
      const block = (bbox.max[0] - bbox.min[0]) * (bbox.max[1] - bbox.min[1]) * (bbox.max[2] - bbox.min[2]);
      expect(volumeMm3, `${servo} volume`).toBeGreaterThan(34_000);
      expect(volumeMm3, `${servo} volume`).toBeLessThan(38_000);
      expect(volumeMm3 / block, `${servo} fill of its bounding box`).toBeLessThan(0.9);
    }
  }, PER_EXAMPLE_TIMEOUT_MS);
});
