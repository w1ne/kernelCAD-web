// SPDX-License-Identifier: CC0-1.0
// Media filter vessel: the pressure sand/media filter that cleans recirculated
// nutrient solution or source water before it reaches drippers, shown as a
// skid with one or two vessels.
// What makes it a media filter: a tall pressure vessel with domed top and
// bottom heads standing on three splayed legs, a top inspection flange and a
// side manhole for changing the media, PVC inlet and outlet headers with
// butterfly valves (so each vessel can be backwashed), a pressure gauge on
// each side of the bed, and a drain valve at the lowest point.
// Generic visualization geometry at about real size (vessel 600 mm across,
// about 1.5 m tall), millimetres, Z up, piping toward -Y.

meta({
  name: "media-filter-vessel",
  license: 'CC0-1.0',
  title: "Media filter vessel",
  description: "Pressure media (sand) filter at about real size: domed steel or fibreglass vessel on three splayed legs with top inspection flange, side manhole, PVC inlet and outlet headers with butterfly valves, two pressure gauges and a bottom drain; single vessel or a backwashing duplex pair on a skid. Material controls: vessel, legs and flanges, PVC pipework and valve handles, plus a vessel count choice. epoxyBlue, fibreglass, stainless and weathered presets.",
  tags: ['media filter', 'sand filter', 'pressure filter', 'backwash', 'filtration', 'irrigation', 'water treatment', 'pressure vessel', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 4800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const vessel = param('vessel', '#2f6fa8', { label: 'Vessel (epoxy-coated steel)' });
const frame = param('frame', '#3d4347', { label: 'Legs, flanges and skid (steel)' });
const pipe = param('pipe', '#dcdcd4', { label: 'Pipework (PVC)' });
const handle = param('handle', '#c0392b', { label: 'Valve handles' });
const count = param('vessels', 'duplex', { choices: ['single', 'duplex'], label: 'Vessels' });

presets({
  epoxyBlue: { vessel: '#2f6fa8', frame: '#3d4347', pipe: '#dcdcd4', handle: '#c0392b' },
  fibreglass: { vessel: '#d9c9a3', frame: '#4a4f52', pipe: '#5a6066', handle: '#e0a21c' },
  stainless: { vessel: '#b9c0c4', frame: '#7c8388', pipe: '#e6e6e0', handle: '#2f6fa8' },
  weathered: { vessel: '#4f6a80', frame: '#5c5a52', pipe: '#bdb9aa', handle: '#9a4a3a' },
});

const p = assembly("media-filter-vessel");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
// cylinder(...).rotateX(90) runs from its origin toward -Y.
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);
const turned = (pts: [number, number][], seg = 24) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve(360, seg);
};
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};

const R = 300; // vessel radius
const Z0 = 380; // bottom of the shell straight
const SH = 800; // straight shell height
const duplex = count.value === 'duplex';
const xs = duplex ? [-420, 420] : [0];
const HY = -R - 200; // header line in front of the vessels
const ZIN = Z0 + SH + 120; // inlet header height (top)
const ZOUT = Z0 - 60; // outlet header height (bottom)

// Skid.
const skidW = duplex ? 1700 : 900;
add("skid-rail-front", blk(0, -360, 0, skidW, 100, 60).color(frame));
add("skid-rail-back", blk(0, 360, 0, skidW, 100, 60).color(frame));
for (const x of [-skidW / 2 + 50, skidW / 2 - 50]) add(`skid-cross-${x > 0 ? 'r' : 'l'}`, blk(x, 0, 0, 100, 820, 60).color(frame));

xs.forEach((x, i) => {
  const v = `vessel-${i}`;
  // Shell with elliptical-ish domed heads, revolved as one profile.
  add(`${v}-shell`, turned([
    [0, Z0 - 170], [130, Z0 - 155], [230, Z0 - 110], [285, Z0 - 50], [R, Z0],
    [R, Z0 + SH], [285, Z0 + SH + 50], [230, Z0 + SH + 110], [130, Z0 + SH + 155], [0, Z0 + SH + 170],
  ]).translate(x, 0, 0).color(vessel));
  add(`${v}-girth-seam-lo`, cylZ(x, 0, Z0 - 6, 12, R + 6, 24).color(frame));
  add(`${v}-girth-seam-hi`, cylZ(x, 0, Z0 + SH - 6, 12, R + 6, 24).color(frame));
  // Three splayed legs welded to the lower head, with pads on the skid.
  for (let k = 0; k < 3; k++) {
    const a = Math.PI / 2 + (k * 2 * Math.PI) / 3;
    const top: [number, number, number] = [x + 250 * Math.cos(a), 250 * Math.sin(a), Z0];
    const foot: [number, number, number] = [x + 330 * Math.cos(a), 330 * Math.sin(a), 80];
    add(`${v}-leg-${k}`, rod(foot, top, 32, 8).color(frame));
    add(`${v}-leg-pad-${k}`, blk(foot[0], foot[1], 60, 120, 120, 16).color(frame));
  }
  // Top inspection flange with bolts.
  add(`${v}-top-flange`, cylZ(x, 0, Z0 + SH + 160, 40, 150, 20).color(frame));
  add(`${v}-top-cover`, cylZ(x, 0, Z0 + SH + 200, 22, 135, 20).color(vessel));
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * 2 * Math.PI;
    add(`${v}-bolt-${k}`, cylZ(x + 140 * Math.cos(a), 140 * Math.sin(a), Z0 + SH + 200, 30, 9, 6).color('#c9ccce'));
  }
  // Side manhole facing -X (media change).
  const side = duplex ? (i === 0 ? -1 : 1) : -1;
  add(`${v}-manhole-neck`, cylX(x + side * (R - 20) - (side < 0 ? 80 : 0), 0, Z0 + 260, 100, 130, 18).color(vessel));
  add(`${v}-manhole-cover`, cylX(x + side * (R + 80) - (side < 0 ? 30 : 0), 0, Z0 + 260, 30, 150, 18).color(frame));
  add(`${v}-manhole-handle`, blk(x + side * (R + 120), 0, Z0 + 240, 20, 120, 40).color('#c9ccce'));
  // Inlet nozzle (top) and outlet nozzle (bottom) out to the front headers.
  add(`${v}-inlet-nozzle`, rod([x, 0, Z0 + SH + 150], [x, -R + 60, Z0 + SH + 130], 55, 12).color(pipe));
  add(`${v}-inlet-drop`, cylY(x, -R + 60, ZIN, -HY - R + 60, 55).color(pipe));
  add(`${v}-outlet-nozzle`, cylY(x, -R + 40, ZOUT, -HY - R + 40, 55).color(pipe));
  add(`${v}-outlet-stub`, cylZ(x, -R + 40, ZOUT, Z0 - ZOUT - 40, 55, 12).color(pipe));
  // Butterfly valves on each nozzle: wafer body plus lever handle.
  for (const [tag, z] of [['in', ZIN], ['out', ZOUT]] as const) {
    add(`${v}-${tag}-valve`, cylY(x, -R - 60, z, 50, 85, 14).color(frame));
    add(`${v}-${tag}-valve-neck`, cylZ(x, -R - 85, z + 70, 50, 14, 8).color(frame));
    add(`${v}-${tag}-handle`, blk(x + 60, -R - 85, z + 115, 170, 26, 18).color(handle));
  }
  // Pressure gauges above and below the bed.
  for (const [tag, z] of [['p1', Z0 + SH - 80], ['p2', Z0 + 120]] as const) {
    const gx = x + (duplex ? -side : 1) * 170;
    const gy = -Math.sqrt(R * R - 170 * 170);
    add(`${v}-${tag}-gauge-stem`, cylY(gx, gy, z, 70, 10, 8).color('#c9a84a'));
    add(`${v}-${tag}-gauge`, cylY(gx, gy - 70, z, 30, 55, 18).color('#d9dcde'));
    add(`${v}-${tag}-gauge-face`, cylY(gx, gy - 100, z, 3, 46, 18).color('#f4f4ee'));
    add(`${v}-${tag}-gauge-needle`, box(36, 2, 5, true).translate(14, 0, 0).rotateY(-35).translate(gx, gy - 104, z).color('#c0392b'));
  }
  // Bottom drain valve.
  add(`${v}-drain-pipe`, rod([x + 80, -60, Z0 - 140], [x + 200, -240, 110], 25).color(pipe));
  add(`${v}-drain-valve`, blk(x + 200, -240, 90, 60, 60, 60).color(frame));
  add(`${v}-drain-lever`, blk(x + 240, -240, 150, 90, 14, 12).color(handle));
});

// Front headers: inlet on top, outlet at the bottom, each with a flanged end.
const hw = duplex ? 1300 : 700;
for (const [tag, z] of [['inlet', ZIN], ['outlet', ZOUT]] as const) {
  add(`${tag}-header`, cylX(-hw / 2, HY, z, hw, 62).color(pipe));
  add(`${tag}-flange`, cylX(-hw / 2 - 30, HY, z, 30, 95, 16).color(frame));
  add(`${tag}-cap`, cylX(hw / 2, HY, z, 25, 66).color(pipe));
}
add("flow-arrow-in", blk(-hw / 2 + 160, HY - 64, ZIN - 12, 140, 3, 24).color('#2a8a4a'));
add("flow-arrow-out", blk(-hw / 2 + 160, HY - 64, ZOUT - 12, 140, 3, 24).color('#2f6fa8'));
add("outlet-header-support-l", blk(-hw / 2 + 120, HY, 60, 70, 70, ZOUT - 120).color(frame));
add("outlet-header-support-r", blk(hw / 2 - 120, HY, 60, 70, 70, ZOUT - 120).color(frame));
add("front-rail-extension", blk(0, HY, 0, hw, 100, 60).color(frame));

return p.model();
