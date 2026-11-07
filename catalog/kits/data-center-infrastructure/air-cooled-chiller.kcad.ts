// SPDX-License-Identifier: CC0-1.0
// Air-cooled chiller: the rooftop or yard chiller that rejects a data hall's
// heat. What makes it one: a long base frame carrying a V-coil condenser
// section (two finned coil slabs leaning together into a V, closed at the
// ends) under a fan deck with two rows of axial fans in flared venturi
// shrouds behind wire guards, and a compressor and control enclosure at one
// end with a panel door, HMI screen and the chilled-water nozzles.
// Millimetres, Z up, the length runs along X, the control end faces -X.
meta({
  name: "air-cooled-chiller",
  license: 'CC0-1.0',
  title: "Air-cooled chiller",
  description: "V-coil air-cooled chiller: channel base frame, two finned condenser coil slabs leaning into a V with copper headers and module dividers, drain pan, fan deck with six axial fans in flared venturi shrouds, pitched blades and wire guards, compressor and control enclosure with panel seams, door handle, HMI screen and insulated chilled-water nozzles with flanges. Material controls: casing paint, condenser coil, fan guards, base frame and chilled-water piping; coatedCoil, graphite and weathered presets.",
  tags: ['data center', 'cooling', 'chiller', 'air cooled', 'condenser', 'HVAC', 'critical infrastructure', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 12000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const casing = param('casing', '#dddcd3', { label: 'Casing paint' });
const coil = param('coil', '#9db1b5', { label: 'Condenser coil fins' });
const guard = param('guard', '#26292b', { label: 'Fan guards and blades' });
const frame = param('frame', '#4d5a61', { label: 'Base frame' });
const piping = param('piping', '#2f6db5', { label: 'Chilled-water piping' });

presets({
  coatedCoil: { coil: '#c39a52' },
  graphite: { casing: '#5b6166', frame: '#2c3135', guard: '#141618', piping: '#c9472f' },
  weathered: { casing: '#c6c2b4', coil: '#8a958f', guard: '#3a3936', frame: '#5d5850', piping: '#4f6e8f' },
});

const p = assembly("air-cooled-chiller");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Turned profile [[radius, z], ...] about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const ring = (r0, r1, z0, z1) => turned([[r0, z0], [r1, z0], [r1, z1], [r0, z1]]);
const rod = (r, z0, z1) => turned([[0, z0], [r, z0], [r, z1], [0, z1]]);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Cross-section [[y, z], ...] extruded along X from x0 to x1.
const prismX = (pts, x0, x1) => extrudePolygon(pts, x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
// Turned part with its axis along -X (nozzles out of the control end).
const outOfEnd = (shape) => shape.rotateY(-90);

// Fixed trade colours: copper coil headers, HMI glass, red isolator on a yellow plate.
const copperHeader = '#b87442', hmiGlass = '#3f7fa8', isolatorRed = '#c8301f', isolatorYellow = '#e7c533';

const X0 = -1800, XC = -950, X1 = 1800;
const coilTop = 2150, coilBase = 320;
const vLeft = [[-1100, coilTop], [-985, coilTop], [-170, coilBase], [-285, coilBase]];
const vRight = vLeft.map(([y, z]) => [-y, z]).reverse();

// ---- Base frame ----
for (const y of [-1040, 1040]) {
  add(`base-rail-${y}`, blk(X0, y - 60, 0, X1, y + 60, 200).color(frame));
}
for (const x of [-1750, -950, 0, 900, 1750]) {
  add(`base-cross-${x}`, blk(x - 50, -980, 60, x + 50, 980, 200).color(frame));
}
add('drain-pan', blk(XC, -320, 200, X1, 320, coilBase).color(frame));

// ---- V-coil condenser section ----
add('coil-left', prismX(vLeft, XC, X1 - 20).color(coil));
add('coil-right', prismX(vRight, XC, X1 - 20).color(coil));
for (const [x0, x1] of [[XC, XC + 40], [X1 - 60, X1 - 20]]) {
  add(`coil-header-left-${x0}`, prismX(vLeft.map(([y, z]) => [y - 8, z]), x0, x1).color(copperHeader));
  add(`coil-header-right-${x0}`, prismX(vRight.map(([y, z]) => [y + 8, z]), x0, x1).color(copperHeader));
}
for (const x of [-30, 890]) {
  add(`coil-divider-left-${x}`, prismX(vLeft.map(([y, z]) => [y - 10, z]), x, x + 40).color(casing));
  add(`coil-divider-right-${x}`, prismX(vRight.map(([y, z]) => [y + 10, z]), x, x + 40).color(casing));
}
add('v-end-panel', prismX([[-285, coilBase], [285, coilBase], [985, coilTop], [-985, coilTop]], X1 - 20, X1).color(casing));
for (const y of [-1, 1]) {
  add(`coil-corner-post-${y}`, blk(X1 - 80, y * 1100 - 40, 200, X1, y * 1100 + 40, coilTop).color(casing));
}

// ---- Fan deck with six axial fans ----
const deckZ = coilTop + 60;
add('fan-deck', blk(XC, -1100, coilTop, X1, 1100, deckZ).color(casing));
const fanXs = [-490, 425, 1340];
for (const fx of fanXs) {
  for (const fy of [-545, 545]) {
    const id = `${fx}-${fy}`;
    add(`fan-shroud-${id}`, turned([[400, deckZ], [440, deckZ], [440, deckZ + 160], [478, deckZ + 210], [438, deckZ + 210], [400, deckZ + 165]]).translate(fx, fy, 0).color(casing));
    add(`fan-motor-${id}`, rod(70, deckZ - 40, deckZ + 70).translate(fx, fy, 0).color(frame));
    add(`fan-hub-${id}`, turned([[0, deckZ + 70], [80, deckZ + 70], [60, deckZ + 110], [0, deckZ + 120]]).translate(fx, fy, 0).color(guard));
    for (let k = 0; k < 5; k++) {
      add(`fan-blade-${id}-${k}`, blk(70, -60, -7, 385, 60, 7).rotateX(24).rotateZ(72 * k + 10).translate(fx, fy, deckZ + 95).color(guard));
    }
    for (const r of [140, 260, 380, 470]) {
      add(`fan-guard-ring-${id}-${r}`, ring(r - 7, r, deckZ + 205, deckZ + 215).translate(fx, fy, 0).color(guard));
    }
    for (const a of [0, 45, 90, 135]) {
      add(`fan-guard-bar-${id}-${a}`, blk(-470, -8, deckZ + 214, 470, 8, deckZ + 224).rotateZ(a).translate(fx, fy, 0).color(guard));
    }
  }
}

// ---- Compressor and control enclosure at the -X end ----
const encTop = 1950;
add('control-enclosure', blk(X0, -1100, 200, XC, 1100, encTop).color(casing));
add('control-roof', blk(X0 - 30, -1130, encTop, XC + 30, 1130, encTop + 40).color(casing));
for (const y of [-550, 0, 550]) {
  add(`end-seam-${y}`, blk(X0 - 6, y - 6, 260, X0, y + 6, encTop - 60).color(frame));
}
for (const x of [-1375]) {
  add(`side-seam-${x}`, blk(x - 6, -1106, 260, x + 6, -1100, encTop - 60).color(frame));
}
for (let i = 0; i < 6; i++) {
  add(`side-louvre-${i}`, blk(-170, -6, -15, 170, 6, 15).rotateX(-25).translate(-1170, -1106, 435 + 140 * i).color(frame));
}
// Control panel door with HMI and handle, on the end face.
add('control-door', blk(X0 - 14, -520, 900, X0, -20, 1820).color(casing));
add('hmi-bezel', blk(X0 - 22, -400, 1450, X0 - 14, -140, 1640).color(guard));
add('hmi-screen', blk(X0 - 26, -385, 1470, X0 - 22, -155, 1620).color(hmiGlass));
add('door-handle', blk(X0 - 50, -90, 1240, X0 - 14, -60, 1400).color(guard));
add('isolator-switch', outOfEnd(rod(40, 0, 50)).translate(X0 - 14, 300, 1600).color(isolatorRed));
add('isolator-plate', blk(X0 - 18, 240, 1530, X0 - 14, 360, 1670).color(isolatorYellow));

// ---- Chilled-water nozzles: insulated pipe, flange and bolt ring ----
for (const [y, z, tag] of [[420, 520, 'supply'], [420, 900, 'return']]) {
  add(`chw-${tag}`, outOfEnd(rod(95, 0, 320)).translate(X0, y, z).color(piping));
  add(`chw-${tag}-flange`, outOfEnd(ring(0, 150, 320, 350)).translate(X0, y, z).color(frame));
  add(`chw-${tag}-collar`, outOfEnd(ring(95, 110, 0, 60)).translate(X0, y, z).color(frame));
}

return p.model();
