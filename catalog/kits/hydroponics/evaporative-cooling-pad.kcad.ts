// SPDX-License-Identifier: CC0-1.0
// Evaporative cooling pad: a section of the wet wall at the inlet end of a
// fan-and-pad greenhouse. Exhaust fans at the far end pull outside air
// through the wetted pad, which cools it as the water evaporates.
// What makes it a cooling pad: three cellulose honeycomb pad modules with
// their 45-degree flutes showing, held in an aluminium frame under a
// distribution pipe and cap that soak them from the top, a gutter along the
// bottom catching the run-off, and a recirculation tank with a pump and a
// riser climbing back up to the distribution pipe through a ball valve.
// The lower half of the pads is darker where they are wet.
// Generic visualization geometry at about real size (1.8 m x 1.5 m pad,
// 150 mm thick), millimetres, Z up, front -Y.

meta({
  name: "evaporative-cooling-pad",
  license: 'CC0-1.0',
  title: "Evaporative cooling pad",
  description: "Fan-and-pad greenhouse wet wall section at about real size: three 150 mm cellulose honeycomb pad modules with angled flutes, wet lower band, aluminium frame and posts, top distribution pipe under a hinged cap, bottom run-off gutter, recirculation tank with pump and float valve, and a riser with ball valve back up to the distribution pipe. Material controls: pad media, frame, pipework and tank. cellulose, glassFibre, greenCoated and weathered presets.",
  tags: ['evaporative cooling', 'cooling pad', 'wet wall', 'fan and pad', 'cellulose pad', 'swamp cooler', 'greenhouse cooling', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 4000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const pad = param('padMedia', '#c99a5b', { label: 'Pad media (cellulose)' });
const frame = param('frame', '#c3c8cb', { label: 'Frame and cap (aluminium)' });
const pipe = param('pipework', '#5b6d7c', { label: 'Pipework (PVC)' });
const tank = param('tank', '#2f3b35', { label: 'Tank and gutter (PE)' });

presets({
  cellulose: { padMedia: '#c99a5b', frame: '#c3c8cb', pipework: '#5b6d7c', tank: '#2f3b35' },
  glassFibre: { padMedia: '#d8d6c8', frame: '#a9b0b4', pipework: '#3f4c58', tank: '#3a3d40' },
  greenCoated: { padMedia: '#6f8f4a', frame: '#e3e4df', pipework: '#2e5f8a', tank: '#2b2f33' },
  weathered: { padMedia: '#9e7a4c', frame: '#8f9392', pipework: '#6b7378', tank: '#3c3f3a' },
});

const p = assembly("evaporative-cooling-pad");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 6) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
// A thin flute bar on the pad face between two (x, z) points.
const flute = (x0: number, z0: number, x1: number, z1: number, y: number) => {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const ang = (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI;
  return box(len, 3, 7, true).rotateY(-ang).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
};

const PW = 600, PH = 1500, PT = 150, Z0 = 420, N = 3;
const W = PW * N;
const yF = -PT / 2;
// Pad modules: honeycomb block, darker wet band, flutes at 45 degrees
// alternating direction module to module like a cross-fluted pad.
for (let m = 0; m < N; m++) {
  const cx = -W / 2 + PW / 2 + m * PW;
  add(`pad-${m}`, blk(cx, 0, Z0, PW - 8, PT, PH).color(pad));
  add(`pad-wet-${m}`, blk(cx, yF - 0.5, Z0, PW - 8, 2, PH * 0.42).color('#8a6236'));
  const x0 = cx - PW / 2 + 10, x1 = cx + PW / 2 - 10, z0 = Z0 + 10, z1 = Z0 + PH - 10;
  const dir = m % 2 === 0 ? 1 : -1;
  // Lines x - dir*z = c clipped to the module rectangle.
  for (let c = -PH; c < PW; c += 70) {
    const pts: [number, number][] = [];
    for (const z of [z0, z1]) { const x = (dir > 0 ? x0 : x1) + dir * (c + (z - z0)); if (x >= x0 && x <= x1) pts.push([x, z]); }
    for (const x of [x0, x1]) { const z = z0 + (dir * (x - (dir > 0 ? x0 : x1)) - c); if (z >= z0 && z <= z1) pts.push([x, z]); }
    if (pts.length < 2) continue;
    pts.sort((a, b) => a[1] - b[1]);
    const [a, b] = [pts[0], pts[pts.length - 1]];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 30) continue;
    add(`flute-${m}-${c}`, flute(a[0], a[1], b[0], b[1], yF - 1.5).color('#a5793f'));
  }
}

// Aluminium frame: posts, mullions, bottom support rail and top cap.
for (const x of [-W / 2 - 40, W / 2 + 40]) {
  add(`post-${x}`, blk(x, 0, 0, 80, PT + 60, Z0 + PH + 200).color(frame));
  add(`foot-${x}`, blk(x, 0, 0, 160, PT + 160, 10).color(frame));
}
for (let m = 1; m < N; m++) add(`mullion-${m}`, blk(-W / 2 + m * PW, yF - 6, Z0, 24, 12, PH).color(frame));
add("bottom-rail", blk(0, 0, Z0 - 40, W + 40, PT + 20, 40).color(frame));
add("top-rail", blk(0, yF - 8, Z0 + PH - 50, W + 40, 16, 50).color(frame));
add("cap", profileYZ([[-PT / 2 - 40, Z0 + PH + 160], [PT / 2 + 30, Z0 + PH + 200], [PT / 2 + 30, Z0 + PH + 40], [PT / 2 + 20, Z0 + PH + 40], [PT / 2 + 20, Z0 + PH + 185], [-PT / 2 - 30, Z0 + PH + 150], [-PT / 2 - 30, Z0 + PH], [-PT / 2 - 40, Z0 + PH]], W + 80).color(frame));
// Distribution pipe under the cap, spraying down onto the pad top.
add("distribution-pipe", cylX(-W / 2 - 20, 0, Z0 + PH + 70, W + 40, 25).color(pipe));
add("distribution-end", cylX(-W / 2 - 40, 0, Z0 + PH + 70, 20, 30).color('#3b3f42'));

// Run-off gutter along the bottom, draining to the tank at the right.
add("gutter", profileYZ([[-PT / 2 - 60, Z0 - 40], [-PT / 2 - 60, Z0 - 170], [PT / 2 + 60, Z0 - 170], [PT / 2 + 60, Z0 - 40], [PT / 2 + 50, Z0 - 40], [PT / 2 + 50, Z0 - 160], [-PT / 2 - 50, Z0 - 160], [-PT / 2 - 50, Z0 - 40]], W).color(tank));
for (const x of [-500, 0, 500]) add(`gutter-stand-${x}`, blk(x, 0, 0, 40, PT + 80, Z0 - 170).color(frame));
add("gutter-outlet", cylZ(W / 2 - 80, -60, Z0 - 230, 60, 28).color(pipe));
add("gutter-drop", rod([W / 2 - 80, -60, Z0 - 225], [W / 2 + 20, -330, 250], 26, 12).color(pipe));

// Recirculation tank below gutter level, in front at the right, with a
// pump, float make-up valve and the riser back up to the distribution pipe.
const TX = W / 2 + 100, TY = -400;
add("tank", cylZ(TX, TY, 0, 220, 200, 18).color(tank));
add("tank-lid", cylZ(TX, TY, 220, 24, 210, 18).color(tank));
add("tank-band", cylZ(TX, TY, 100, 24, 204, 18).color('#3e4b44'));
const PX = TX + 60, PY = TY - 40;
add("pump", cylZ(PX, PY, 244, 130, 60, 14).color('#2e5f8a'));
add("pump-fins", cylZ(PX, PY, 300, 50, 66, 14).color('#264e72'));
add("pump-cable", rod([PX + 60, PY, 340], [PX + 200, PY + 60, 30], 6).color('#1f2326'));
add("float-valve", cylZ(TX - 90, TY + 60, 244, 60, 30, 10).color('#e3e4df'));
add("makeup-line", cylX(TX - 90, TY + 60, 290, 400, 10, 8).color('#1f2326'));
const RY = -170, RZ = Z0 + PH + 70;
add("riser-stub", cylZ(PX, PY, 374, 60, 22).color(pipe));
add("riser-run", cylinder(PY < RY ? RY - PY : 1, 22, 12).rotateX(-90).translate(PX, PY, 434).color(pipe));
add("riser-elbow-low", sphere(26).translate(PX, RY, 434).color(pipe));
add("riser", cylZ(PX, RY, 434, RZ - 434, 22).color(pipe));
add("riser-elbow-high", sphere(26).translate(PX, RY, RZ).color(pipe));
add("riser-top", cylX(W / 2 - 100, RY, RZ, PX - (W / 2 - 100), 22).color(pipe));
add("riser-into-cap", cylinder(-RY, 22, 12).rotateX(-90).translate(W / 2 - 100, RY, RZ).color(pipe));
add("ball-valve", cylZ(PX, RY, 900, 90, 36, 6).color('#3b3f42'));
add("valve-handle", blk(PX, RY - 60, 960, 30, 120, 14).color('#c0392b'));
add("pressure-gauge", cylinder(20, 40, 16).rotateX(90).translate(PX, RY - 25, 1200).color('#e3e4df'));
add("gauge-face", cylinder(2, 34, 16).rotateX(90).translate(PX, RY - 26, 1200).color('#22262a'));

return p.model();
