// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Independent contact study of the 15-tooth deadbeat demonstration.
// Tooth and pallet profile equations follow the original rendered mechanism.
// This derivative has real joints and explicit convex collision pieces.
// Scale, densities and losses below are TEST ASSUMPTIONS, not measured hardware.
// No pendulum/balance/spring was present in the original: default stiffness is zero.
const radiusMm = param('radiusMm', 34, { min: 20, max: 60, description: 'Assumed escape wheel tip radius, mm' });
const wheelDensity = param('wheelDensity', 8500, { min: 1000, max: 20000, description: 'Assumed wheel density, kg/m3' });
const anchorDensity = param('anchorDensity', 7850, { min: 1000, max: 20000, description: 'Assumed anchor density, kg/m3' });
const palletDensity = param('palletDensity', 4000, { min: 1000, max: 20000, description: 'Assumed pallet density, kg/m3' });
const anchorStiffness = param('anchorStiffnessNmmPerDeg', 0, { min: 0, max: 0.1, description: 'Optional surrogate torsion spring; original has no oscillator, N mm/deg' });
const R = Number(radiusMm);
const deg = Math.PI / 180;
const pitch = 2 * Math.PI / 15;
const center = 1 / Math.cos(42 * deg);
const thetaA = 36.6 * deg;
const thetaB = 47.4 * deg;
const unlock = 2 * deg;
const drop = 3 * deg;
const phiInitialDeg = 7.5;
const thickness = 0.096 * R;
function axis(p) { return { type: 'axis', origin: { kind: 'vec3', value: p }, axis: [0, 0, 1] }; }
function fixed(p) { return { ...axis(p), type: 'frame' }; }
function poly(input, z0, z1) {
  const points = input.filter((p, i) => Math.hypot(p[0] - input[(i + input.length - 1) % input.length][0], p[1] - input[(i + input.length - 1) % input.length][1]) > 1e-10);
  let s = path().moveTo(points[0][0] * R, points[0][1] * R);
  for (let i = 1; i < points.length; ++i) s = s.lineTo(points[i][0] * R, points[i][1] * R);
  return s.close().extrude(z1 - z0).translate(0, 0, z0);
}
function cross(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
function area(points) {
  return points.reduce((sum, a, i) => {
    const b = points[(i + 1) % points.length];
    return sum + a[0] * b[1] - a[1] * b[0];
  }, 0) / 2;
}
// Ear clipping preserves concave pallet surfaces. A whole-pallet hull would fill the locking arc.
function triangles(input) {
  const pts = area(input) < 0 ? [...input].reverse() : [...input];
  for (let i = pts.length - 1; i >= 0; --i) {
    if (Math.abs(cross(pts[(i + pts.length - 1) % pts.length], pts[i], pts[(i + 1) % pts.length])) < 1e-12) pts.splice(i, 1);
  }
  const out = [];
  let guard = pts.length * pts.length;
  while (pts.length > 3 && --guard > 0) {
    let clipped = false;
    for (let i = 0; i < pts.length; ++i) {
      const a = pts[(i + pts.length - 1) % pts.length], b = pts[i], c = pts[(i + 1) % pts.length];
      if (cross(a, b, c) <= 1e-12) continue;
      const contains = pts.some((p) => p !== a && p !== b && p !== c &&
        cross(a, b, p) >= -1e-12 && cross(b, c, p) >= -1e-12 && cross(c, a, p) >= -1e-12);
      if (contains) continue;
      out.push([a, b, c]); pts.splice(i, 1); clipped = true; break;
    }
    if (!clipped) throw new Error('Contact profile is not a simple polygon.');
  }
  if (pts.length !== 3) throw new Error('Incomplete contact profile decomposition.');
  out.push(pts);
  const sum = out.reduce((s, t) => s + Math.abs(area(t)), 0);
  if (Math.abs(sum - Math.abs(area(input))) > 1e-10) throw new Error('Contact profile area changed.');
  return out;
}
function pieces(points, z0, z1) { return triangles(points).map((t) => poly(t, z0, z1)); }
function loc(r, b) { return [r * Math.sin(b), -r * Math.cos(b)]; }
function tip(theta) {
  const x = Math.sin(theta), y = Math.cos(theta) - center;
  return [Math.hypot(x, y), Math.atan2(x, -y)];
}
const rIn = tip(thetaA)[0] + 0.002;
const rOut = tip(thetaB)[0] - 0.002;
const wheelPieces = [];
let wheel = cylinder(thickness, 0.735 * R, 90).translate(0, 0, -thickness / 2)
  .subtract(cylinder(thickness + 2, 0.625 * R, 90).translate(0, 0, -thickness / 2 - 1));
for (let i = 0; i < 90; ++i) {
  const a = i * 2 * Math.PI / 90, b = (i + 1) * 2 * Math.PI / 90;
  wheelPieces.push(poly([[0.625 * Math.sin(a), 0.625 * Math.cos(a)], [0.735 * Math.sin(a), 0.735 * Math.cos(a)],
    [0.735 * Math.sin(b), 0.735 * Math.cos(b)], [0.625 * Math.sin(b), 0.625 * Math.cos(b)]], -thickness / 2, thickness / 2));
}
const hub = cylinder(thickness + 0.020 * R, 0.215 * R, 48).translate(0, 0, -thickness / 2 - 0.010 * R)
  .hole('top', { u: 0, v: 0, diameter: 0.144 * R, depth: 'through' });
wheel = wheel.union(hub);
// The hub collision cylinder fills the bearing hole; base/shaft contact is excluded by the revolute mate.
wheelPieces.push(cylinder(thickness + 0.020 * R, 0.215 * R, 48).translate(0, 0, -thickness / 2 - 0.010 * R));
for (let k = 0; k < 15; ++k) {
  const th = k * pitch;
  const polar = [[0.710, -16.0], [0.840, -9.5], [0.950, -3.2], [0.998, -0.45], [0.999, 0], [0.930, -1.95], [0.820, -5.2], [0.710, -9.4]];
  const pts = polar.map(([r, a]) => [r * Math.sin(th + a * deg), r * Math.cos(th + a * deg)]);
  wheel = wheel.union(poly(pts, -0.046 * R, 0.046 * R));
  wheelPieces.push(...pieces(pts, -0.046 * R, 0.046 * R));
}
for (let k = 0; k < 5; ++k) {
  const left = [], right = [];
  for (let i = 0; i <= 10; ++i) {
    const u = i / 10, r = 0.185 + u * (0.640 - 0.185), a = k * 2 * Math.PI / 5 + 0.14 * Math.sin(Math.PI * u);
    const w = (0.066 * (1 - u) + 0.038 * u) / 2;
    const x = r * Math.sin(a), y = r * Math.cos(a);
    left.push([x - Math.cos(a) * w, y + Math.sin(a) * w]);
    right.push([x + Math.cos(a) * w, y - Math.sin(a) * w]);
  }
  const pts = [...left, ...right.reverse()];
  wheel = wheel.union(poly(pts, -0.039 * R, 0.039 * R));
  wheelPieces.push(...pieces(pts, -0.039 * R, 0.039 * R));
}
function pallet(entry) {
  const impulse = [];
  for (let i = 0; i <= 24; ++i) {
    const u = i / 24, th = (entry ? -thetaB : thetaA) + u * (thetaB - thetaA);
    const [r, beta] = tip(th);
    const phi = entry ? unlock - u * (unlock + drop) : -unlock + u * (unlock + drop);
    impulse.push([Math.min(rOut, Math.max(rIn, r)), beta - phi + (entry ? -0.003 : 0.003)]);
  }
  const boundary = [...impulse], b0 = impulse[0][1], b1 = impulse[24][1], top = (entry ? -59 : 59) * deg;
  for (let i = 1; i <= 18; ++i) boundary.push([entry ? rIn : rOut, b1 + (top - b1) * i / 18]);
  for (let i = 0; i <= 18; ++i) boundary.push([entry ? rOut : rIn, top + (b0 - top) * i / 18]);
  return boundary.map(([r, b]) => loc(r, b));
}
const entryPts = pallet(true), exitPts = pallet(false);
const anchorPieces = [];
let anchor = cylinder(0.124 * R, 0.180 * R, 48).translate(0, 0, -0.062 * R);
anchorPieces.push(cylinder(0.124 * R, 0.180 * R, 48).translate(0, 0, -0.062 * R));
for (const side of [-1, 1]) {
  // Open pallet seat: the jaw ends at the ruby's existing 59-degree back face.
  // This removes the old jaw/ruby overlap without changing either contact profile.
  const pts = [], b0 = side * 59 * deg, b1 = side * 66.5 * deg;
  const lo = tip(thetaA)[0] - 0.014, hi = tip(thetaB)[0] + 0.036;
  for (let i = 0; i < 8; ++i) pts.push(loc(hi, b0 + (b1 - b0) * i / 7));
  pts.push([side * 0.72, -0.24], [side * 0.44, -0.03], [side * 0.17, 0.12], [0, 0.14],
    [0, -0.14], [side * 0.17, -0.11], [side * 0.42, -0.19], [side * 0.64, -0.34], loc(lo, b1));
  for (let i = 0; i < 8; ++i) pts.push(loc(lo, b1 + (b0 - b1) * i / 7));
  anchor = anchor.union(poly(pts, -0.050 * R, 0.050 * R));
  anchorPieces.push(...pieces(pts, -0.050 * R, 0.050 * R));
}
const stemPts = [[-0.068, 0.12], [-0.038, 0.36], [-0.038, 0.54], [-0.088, 0.65], [-0.064, 0.73], [-0.024, 0.65],
  [0.024, 0.65], [0.064, 0.73], [0.088, 0.65], [0.038, 0.54], [0.038, 0.36], [0.068, 0.12]];
anchor = anchor.union(poly(stemPts, -0.046 * R, 0.046 * R));
anchorPieces.push(...pieces(stemPts, -0.046 * R, 0.046 * R));
// Cut the arbor bore last: arm unions otherwise refill the hole in the hub.
// Use an explicit axis point; the union face centroid is not the arbor datum.
anchor = anchor.hole({ byNormal: 'Z', extreme: 'Z' }, { at: [0, 0, 0.062 * R], axis: [0, 0, -1], diameter: 0.120 * R, depth: 'through' });
const mountRadius = (rIn + rOut) / 2;
const entrySeat = loc(mountRadius, -59 * deg).map((v) => v * R);
const exitSeat = loc(mountRadius, 59 * deg).map((v) => v * R);
const entryMount = [entrySeat[0], entrySeat[1], 0];
const exitMount = [exitSeat[0], exitSeat[1], 0];
const plate = box(2.5 * R, 3.4 * R, 4, true).translate(0, 0.55 * R, -8);
const axle1 = cylinder(10, 0.060 * R, 32).translate(0, 0, -6);
const axle2 = cylinder(10, 0.050 * R, 32).translate(0, center * R, -6);
const base = plate.union(axle1).union(axle2);
const arm = assembly('deadbeat-contact-study');
arm.part('base', base, { density: 2700 }).collision([plate, axle1, axle2])
  .connector('wheel', axis([0, 0, 0])).connector('anchor', axis([0, center * R, 0]));
arm.part('wheel', wheel.color('#cfac46'), { density: Number(wheelDensity) }).collision(wheelPieces).connector('axis', axis([0, 0, 0]));
arm.part('anchor', anchor.color('#2b5485'), { density: Number(anchorDensity) }).collision(anchorPieces)
  .connector('axis', axis([0, 0, 0])).connector('entry', fixed(entryMount)).connector('exit', fixed(exitMount));
arm.part('entry', poly(entryPts, -0.048 * R, 0.048 * R).color('#c41e3a'), { density: Number(palletDensity) })
  .collision(pieces(entryPts, -0.048 * R, 0.048 * R)).connector('mount', fixed(entryMount));
arm.part('exit', poly(exitPts, -0.048 * R, 0.048 * R).color('#c41e3a'), { density: Number(palletDensity) })
  .collision(pieces(exitPts, -0.048 * R, 0.048 * R)).connector('mount', fixed(exitMount));
arm.mate('wheel', 'base.wheel', 'wheel.axis', 'revolute', { pose: 47.4, dampingNmmsPerDeg: 0.000001745329 });
arm.mate('anchor', 'base.anchor', 'anchor.axis', 'revolute', { pose: phiInitialDeg,
  stiffnessNmmPerDeg: Number(anchorStiffness), springRefDeg: 0, dampingNmmsPerDeg: 0.000001745329 });
arm.mate('entry-fixed', 'anchor.entry', 'entry.mount', 'fastened');
arm.mate('exit-fixed', 'anchor.exit', 'exit.mount', 'fastened');
return arm.model();
