// SPDX-License-Identifier: CC0-1.0
// Folded fire hose pack: a high-rise or standpipe pack carried up the stairs
// on a firefighter's shoulder. What makes it one is the flat 65 mm hose
// flaked back and forth in an accordion, in two side-by-side stacks, so
// every layer ends in a rounded fold; two webbing straps with cam buckles
// cinch the bundle, a carry handle sits on top, and a shut-off nozzle with
// a bail handle rides strapped on the load. The female coupling hangs off
// the bottom layer at one end, ready to connect to the standpipe outlet.
// Generic visualization geometry at about real size (about 0.65 m long,
// 0.22 m wide, 0.3 m tall), millimetres, Z up, couplings toward -X, lowest
// point on z = 0.
meta({
  name: "folded-hose-pack",
  license: 'CC0-1.0',
  title: "Folded fire hose pack",
  description: "High-rise standpipe hose pack: flat 65 mm hose flaked in an accordion in two side-by-side stacks with rounded folds at every layer end, cinched by two webbing straps with cam buckles, a carry handle on top, a shut-off nozzle with bail handle strapped to the load, and the female coupling hanging off the bottom layer. Material controls: webbing and safety trim, hose fabric, coupling metal, nozzle bail and grip; weathered, highVisibility and doubleJacketWhite presets.",
  tags: ['fire hose', 'hose pack', 'high-rise pack', 'standpipe', 'shoulder load', 'fire rescue', 'fire service', 'emergency scene', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 3200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const webbingColor = param('webbingColor', '#2f3437', { label: 'Webbing and safety trim' });
const hoseFabricColor = param('hoseFabricColor', '#c94732', { label: 'Hose fabric' });
const couplingMetalColor = param('couplingMetalColor', '#c4bb9a', { label: 'Coupling metal' });
const nozzleColor = param('nozzleColor', '#e0b43a', { label: 'Nozzle bail and grip' });
presets({
  weathered: { webbingColor: '#4a4a44', hoseFabricColor: '#965443', couplingMetalColor: '#8c9698', nozzleColor: '#a8925a' },
  highVisibility: { webbingColor: '#f2df62', hoseFabricColor: '#e17825', couplingMetalColor: '#c1c2b5', nozzleColor: '#2f3437' },
  doubleJacketWhite: { webbingColor: '#b2382e', hoseFabricColor: '#e9e5da', couplingMetalColor: '#b9c1c4', nozzleColor: '#3b6fb0' },
});

const p = assembly("folded-hose-pack");
// Parts are collected, then lifted so the lowest point rests on z = 0.
const parts = [];
const add = (name, shape, finish) => parts.push([name, shape.color(finish)]);

const circle = (r, n, cx = 0, cy = 0) =>
  Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)]);
// Turned profile [[radius, z], ...] about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Side profile [[x, z], ...] extruded t wide across Y, centred on y = yc.
const sideXZ = (pts, t, yc = 0) => extrudePolygon(pts, t).rotateX(90).translate(0, yc + t / 2, 0);
// Front profile [[y, z], ...] extruded t long along +X, centred on x = xc.
const frontYZ = (pts, t, xc = 0) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(xc - t / 2, 0, 0);
const rect = (a0, b0, a1, b1) => [[a0, b0], [a1, b0], [a1, b1], [a0, b1]];
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

const W = 100; // flat hose width
const T = 17; // flat hose thickness
const PITCH = 21; // layer spacing: thickness plus a small gap
const LAYERS = 11;
const X0 = -300;
const X1 = 300;

// Centre line of the flaked hose in side view: straight runs joined by
// half-round folds alternating at each end, with a tail off the bottom layer.
const centreLine = (tail) => {
  const pts = [[X0 - tail, T / 2]];
  for (let i = 0; i < LAYERS; i++) {
    const z = T / 2 + i * PITCH;
    const right = i % 2 === 0;
    pts.push([right ? X1 : X0, z]);
    if (i === LAYERS - 1) break;
    for (let k = 1; k <= 8; k++) {
      const a = (-90 + (180 * k) / 8) * (Math.PI / 180);
      const r = PITCH / 2;
      pts.push(right ? [X1 + r * Math.cos(a), z + r + r * Math.sin(a)] : [X0 - r * Math.cos(a), z + r + r * Math.sin(a)]);
    }
  }
  return pts;
};
// Offset a polyline by +-t/2 into a closed band outline.
const band = (line, t) => {
  const left = [];
  const right = [];
  line.forEach((q, i) => {
    const a = line[Math.max(i - 1, 0)];
    const b = line[Math.min(i + 1, line.length - 1)];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const n = Math.hypot(dx, dz);
    const nx = -dz / n;
    const nz = dx / n;
    left.push([q[0] + (nx * t) / 2, q[1] + (nz * t) / 2]);
    right.push([q[0] - (nx * t) / 2, q[1] - (nz * t) / 2]);
  });
  return [...left, ...right.reverse()];
};

const STACK_Y = [-(W / 2 + 3), W / 2 + 3];
add('hose-stack-a', sideXZ(band(centreLine(140), T), W, STACK_Y[0]), hoseFabricColor);
add('hose-stack-b', sideXZ(band(centreLine(0), T), W, STACK_Y[1]), hoseFabricColor);
const TOP = T + (LAYERS - 1) * PITCH;

// Female coupling on the tail of the bottom layer, with rocker lugs.
const cx = X0 - 140;
const cz = 38;
add('female-shank', turned([[0, 0], [36, 0], [36, 60], [0, 60]]).rotateY(-90).translate(cx + 20, STACK_Y[0], cz), couplingMetalColor);
add('female-swivel', turned([[0, 0], [48, 0], [52, 8], [52, 58], [48, 64], [0, 64]]).rotateY(-90).translate(cx - 36, STACK_Y[0], cz), couplingMetalColor);
for (const a of [90, 210, 330]) {
  const t = (a * Math.PI) / 180;
  add(`rocker-lug-${a}`, box(34, 16, 16, true).translate(cx - 70, STACK_Y[0] + 56 * Math.cos(t), cz + 56 * Math.sin(t)), couplingMetalColor);
}

// Two cinch straps round the bundle with cam buckles on top.
const loop = (y0, z0, y1, z1, t, w, xc) => frontYZ(rect(y0 - t, z0 - t, y1 + t, z1 + t), w, xc).subtract(frontYZ(rect(y0, z0, y1, z1), w + 4, xc));
const HW = W + 3;
for (const x of [-170, 170]) {
  add(`cinch-strap-${x}`, loop(-HW - 1, 0, HW + 1, TOP + 1, 5, 50, x).translate(0, 0, 5), webbingColor);
  add(`cam-buckle-${x}`, box(58, 50, 14, true).translate(x, 50, TOP + 13), couplingMetalColor);
}
// Carry handle on top.
add('carry-handle', loop(-40, TOP + 12, 40, TOP + 100, 8, 60, 0), webbingColor);
add('handle-grip', rod([0, -40, TOP + 104], [0, 40, TOP + 104], 18, 10), nozzleColor);

// Shut-off nozzle strapped on the load, tip toward +X.
const NZ = TOP + 46;
const NY = -60;
add('nozzle-coupling', turned([[0, 0], [40, 0], [40, 50], [0, 50]]).rotateY(90).translate(60, NY, NZ), couplingMetalColor);
add('nozzle-body', turned([[0, 0], [34, 0], [36, 60], [30, 120], [22, 170], [0, 170]]).rotateY(90).translate(110, NY, NZ), couplingMetalColor);
add('nozzle-tip', turned([[0, 0], [26, 0], [16, 40], [0, 40]]).rotateY(90).translate(280, NY, NZ), nozzleColor);
add('valve-ball', sphere(34).translate(140, NY, NZ), couplingMetalColor);
add('bail-handle', rod([140, NY - 36, NZ], [100, NY - 36, NZ + 60], 7).union(rod([100, NY - 36, NZ + 60], [100, NY + 36, NZ + 60], 7)).union(rod([100, NY + 36, NZ + 60], [140, NY + 36, NZ], 7)), nozzleColor);

let lowest = Infinity;
for (const [, shape] of parts) lowest = Math.min(lowest, (await shape.boundingBox({ exact: true })).min[2]);
for (const [name, shape] of parts) p.part(name, shape.translate(0, 0, -lowest).scale(scale));

return p.model();
