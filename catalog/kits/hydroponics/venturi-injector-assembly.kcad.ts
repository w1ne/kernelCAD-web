// SPDX-License-Identifier: CC0-1.0
// Venturi injector assembly: the bypass-mounted venturi (Mazzei-style)
// injector that draws liquid fertiliser or acid into an irrigation line with
// no pump of its own, shown with the drum it draws from.
// What makes it a venturi bypass: a main line with a throttling ball valve
// that forces part of the flow up through a U-shaped bypass loop; on the loop
// sit isolation valves and the hourglass injector body, whose throat suction
// port pulls concentrate through a metering valve and a clear tube with a
// foot strainer from a fertiliser drum. Pressure gauges before and after the
// injector show the differential that makes it draw.
// Generic visualization geometry at about real size (1 in injector on a
// 2 in line), millimetres, Z up, front toward -Y.

meta({
  name: "venturi-injector-assembly",
  license: 'CC0-1.0',
  title: "Venturi injector assembly",
  description: "Venturi fertiliser injector bypass at about real size: PVC main line on pipe stands with a throttling ball valve, a U-shaped bypass loop with two isolation ball valves and an hourglass injector body, inlet and outlet pressure gauges, throat suction port with a metering valve, clear suction tube and foot strainer into a capped fertiliser drum. Material controls: PVC pipework, injector body, valve handles and drum, plus a drum size choice. greyPvc, whitePvc, acidDosing and weathered presets.",
  tags: ['venturi injector', 'fertilizer injector', 'fertiliser injector', 'mazzei', 'fertigation', 'bypass', 'irrigation', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 2800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const pipe = param('pipe', '#8e9497', { label: 'Pipework (PVC)' });
const injector = param('injector', '#2a2d30', { label: 'Injector body (polymer)' });
const handle = param('handle', '#c0392b', { label: 'Valve handles' });
const drum = param('drum', '#2f6fa8', { label: 'Fertiliser drum (polyethylene)' });
const drumSize = param('drumSize', '60 L', { choices: ['25 L', '60 L'], label: 'Drum size' });

presets({
  greyPvc: { pipe: '#8e9497', injector: '#2a2d30', handle: '#c0392b', drum: '#2f6fa8' },
  whitePvc: { pipe: '#e2e2da', injector: '#2a2d30', handle: '#2f6fa8', drum: '#e6e3d6' },
  acidDosing: { pipe: '#8e9497', injector: '#d9d4c2', handle: '#e0a21c', drum: '#c0392b' },
  weathered: { pipe: '#a9a99c', injector: '#3e403c', handle: '#9a4a3a', drum: '#4f6a80' },
});

const p = assembly("venturi-injector-assembly");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
// cylinder(...).rotateX(90) runs from its origin toward -Y.
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};
// Revolved profile around X: [r, x] points.
const turnedX = (pts: [number, number][], seg = 16) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, x] of pts.slice(1)) pb = pb.lineTo(r, x);
  return pb.close().revolve(360, seg).rotateY(90);
};
// Ball valve on a run along X (or Z when vertical): body, stem and lever handle.
const ballValve = (name: string, x: number, y: number, z: number, r: number, vertical: boolean) => {
  if (vertical) add(`${name}-body`, cylZ(x, y, z - 2.2 * r, 4.4 * r, r * 1.5, 10).color(pipe));
  else add(`${name}-body`, cylX(x - 2.2 * r, y, z, 4.4 * r, r * 1.5, 10).color(pipe));
  add(`${name}-ball`, cylY(x, y + r * 1.4, z, r * 2.8, r * 1.85, 12).color(pipe));
  add(`${name}-stem`, cylY(x, y - r * 1.4, z, r * 0.9, r * 0.35, 6).color('#c9ccce'));
  add(`${name}-handle`, blk(x + r * 1.6, y - r * 2.4, z - r * 0.3, r * 4.2, r * 0.5, r * 0.6).color(handle));
};

const ZM = 360; // main line height
const PR = 30; // 2 in main line radius
const BR = 17; // 1 in bypass radius
const XB = 380; // bypass legs at +/- XB
const ZT = 700; // bypass top run height

// Main line on two pipe stands, throttled by a ball valve between the tees.
add("main-line", cylX(-900, 0, ZM, 1800, PR).color(pipe));
for (const side of [-1, 1]) {
  const tag = side > 0 ? 'r' : 'l';
  add(`main-end-${tag}`, cylX(side > 0 ? 880 : -900, 0, ZM, 20, PR + 6).color(pipe));
  add(`tee-${tag}`, cylX(side * XB - 50, 0, ZM, 100, PR + 6).color(pipe));
  add(`tee-branch-${tag}`, cylZ(side * XB, 0, ZM, 70, BR + 8).color(pipe));
  const sx = side * 720;
  add(`stand-post-${tag}`, blk(sx, 0, 0, 40, 40, ZM - PR - 8).color('#3d4347'));
  add(`stand-foot-${tag}`, blk(sx, 0, 0, 170, 170, 12).color('#3d4347'));
  add(`stand-saddle-${tag}`, cylX(sx - 25, 0, ZM, 50, PR + 6).color('#3d4347'));
}
ballValve("throttle-valve", 0, 0, ZM, PR, false);
add("flow-arrow", blk(-640, -PR - 2, ZM - 6, 140, 3, 12).color('#f2f2ec'));

// Bypass loop: two risers with isolation valves, top run carrying the injector.
for (const side of [-1, 1]) {
  const tag = side > 0 ? 'out' : 'in';
  add(`riser-${tag}`, cylZ(side * XB, 0, ZM + 70, ZT - ZM - 70, BR).color(pipe));
  add(`elbow-${tag}`, cylZ(side * XB, 0, ZT - 26, 52, BR + 6, 12).color(pipe));
  ballValve(`${tag}-valve`, side * XB, 0, ZM + 170, BR, true);
}
add("top-run-l", cylX(-XB, 0, ZT, XB - 150, BR).color(pipe));
add("top-run-r", cylX(150, 0, ZT, XB - 150, BR).color(pipe));

// Injector: unions and hourglass body with suction port on the throat.
add("union-in", cylX(-150, 0, ZT, 40, BR + 9, 8).color(injector));
add("union-out", cylX(110, 0, ZT, 40, BR + 9, 8).color(injector));
add("injector-body", turnedX([
  [0, -110], [30, -110], [30, -70], [12, -12], [12, 12], [26, 70], [30, 110], [0, 110],
]).translate(0, 0, ZT).color(injector));
add("suction-port", cylY(0, -10, ZT - 10, 60, 11, 10).color(injector));
add("suction-check", cylY(0, -70, ZT - 10, 26, 15, 10).color('#5a6066'));
add("injector-label", blk(-60, -31, ZT - 8, 36, 3, 16).color('#e0a21c'));

// Pressure gauges before and after the injector.
for (const [tag, x] of [['in', -240], ['out', 240]] as const) {
  add(`${tag}-gauge-stem`, cylZ(x, 0, ZT + BR - 4, 50, 5, 6).color('#c9a84a'));
  add(`${tag}-gauge`, cylY(x, 14, ZT + 90, 26, 32, 16).color('#d9dcde'));
  add(`${tag}-gauge-face`, cylY(x, -12, ZT + 90, 2, 27, 16).color('#f4f4ee'));
  add(`${tag}-gauge-needle`, box(22, 2, 3, true).translate(8, 0, 0).rotateY(tag === 'in' ? -60 : -15).translate(x, -15, ZT + 90).color('#c0392b'));
}

// Fertiliser drum in front, with metering valve and suction tube.
const big = drumSize.value === '60 L';
const DR = big ? 200 : 150;
const DH = big ? 560 : 400;
const DX = 500;
const DY = -380;
add("drum-body", path().moveTo(0, 0).lineTo(DR - 10, 0).lineTo(DR, 20).lineTo(DR, DH - 30).lineTo(DR - 20, DH).lineTo(0, DH).close()
  .revolve(360, 20).translate(DX, DY, 0).color(drum));
for (const [i, z] of [DH * 0.33, DH * 0.66].entries()) add(`drum-rib-${i}`, cylZ(DX, DY, z, 14, DR + 5, 20).color(drum));
add("drum-cap", cylZ(DX + DR * 0.45, DY, DH, 30, 40, 12).color('#2a2d30'));
add("drum-vent", cylZ(DX - DR * 0.45, DY, DH, 22, 22, 8).color('#2a2d30'));
add("drum-handle", blk(DX, DY + DR * 0.55, DH - 10, 150, 26, 50).color(drum));
add("drum-hazard-label", blk(DX, DY - DR - 1, DH * 0.42, 150, 3, 110).color('#f2f2ec'));
add("drum-hazard-mark", box(50, 3, 50, true).rotateY(45).translate(DX, DY - DR - 3, DH * 0.42 + 55).color('#e0a21c'));
// Clear suction tube: from the injector port down to a metering valve, into the drum cap.
const tube = '#cfd8d2';
add("tube-0", rod([0, -96, ZT - 10], [0, -200, ZT - 40], 8).color(tube));
add("metering-valve", blk(0, -200, ZT - 80, 50, 50, 70).color('#5a6066'));
add("metering-knob", cylY(0, -225, ZT - 45, 30, 18, 10).color(handle));
add("tube-1", rod([0, -200, ZT - 80], [DX + DR * 0.45, DY + 60, DH + 120], 8).color(tube));
add("tube-2", rod([DX + DR * 0.45, DY + 60, DH + 120], [DX + DR * 0.45, DY, DH + 30], 8).color(tube));
add("tube-in-drum", cylZ(DX + DR * 0.45, DY, 40, DH - 10, 8, 8).color(tube));
add("foot-strainer", cylZ(DX + DR * 0.45, DY, 14, 40, 16, 8).color('#2a2d30'));

return p.model();
