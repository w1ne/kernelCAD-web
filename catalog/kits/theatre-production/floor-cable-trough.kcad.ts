// SPDX-License-Identifier: CC0-1.0
// Floor cable trough: a length of in-floor cable trench let into a stage
// deck, the channel that carries lighting and sound cables across the stage
// without a cable ramp on the floor.
// What makes it a cable trough rather than a slot: an aluminium channel
// extrusion with lips sitting flush in the timber deck, chequer-plate lids
// with lifting holes (one lid lifted off and laid on the deck), feeder and
// signal cables lying in the channel and dropping out of the open end, and
// a flush floor-box outlet with sockets in the closed lid.
// Generic visualization geometry at about real size (1.5 m length, 260 mm
// wide channel, 120 mm deck), millimetres, Z up, channel along X, front
// toward -Y, deck on z = 0.

meta({
  name: "floor-cable-trough",
  license: 'CC0-1.0',
  title: "Floor cable trough",
  description: "In-floor cable trench at about real size: a 1.5 m length of lipped aluminium channel set flush into a timber stage deck, chequer-plate lids with lifting holes (one lifted off and laid beside the trench), feeder and signal cables lying in the open channel and dropping out of the end onto the floor, and a flush floor-box outlet with two sockets in the closed lid. Material controls: stage deck, aluminium channel, chequer lids, cable jackets. houseShow, touring and blackBox presets.",
  tags: ['cable trough', 'cable trench', 'floor trunking', 'floor box', 'stage cabling', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 3500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const deck = param('deck', '#8a6542', { label: 'Stage deck' });
const channel = param('channel', '#c3cacd', { label: 'Aluminium channel' });
const lid = param('lid', '#6f767c', { label: 'Chequer-plate lids' });
const cable = param('cable', '#1d1f22', { label: 'Signal cable jackets' });

presets({
  houseShow: { deck: '#8a6542', channel: '#c3cacd', lid: '#6f767c', cable: '#1d1f22' },
  touring: { deck: '#2a2b2e', channel: '#c3cacd', lid: '#e0b22a', cable: '#1d1f22' },
  blackBox: { deck: '#1c1d1f', channel: '#4a4f54', lid: '#2e3236', cable: '#3a3c40' },
});

const FEEDER = ['#2a62b8', '#c23b2a'];
const DARK = '#141516';

const p = assembly("floor-cable-trough");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// (y, z) outline extruded `t` long along X, centred on x = 0.
const profileYZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const alongX = (len: number, r: number, n = 12) => cylinder(len, r, n).rotateY(90); // x from 0 to len

const L = 1500;
const DW = 900; // deck width (y)
const ZD = 114; // deck top
const LIP = 6;
const ZT = ZD + LIP; // channel lip top
const ZF = 64; // channel inner floor
const IW = 100; // inner half width

// Timber deck either side of the channel, with a board joint line.
const side = DW / 2 - 106;
for (const [s, sg] of [["f", -1], ["b", 1]] as [string, number][]) {
  add(`deck-${s}`, blk(0, sg * (106 + side / 2), 0, L, side, ZD).color(deck));
  add(`deck-joint-${s}`, blk(0, sg * (106 + side / 2), ZD, L, 4, 1).color(DARK));
}
add("deck-under", blk(0, 0, 0, L, 212, ZF - 6).color(deck));

// Lipped aluminium channel extrusion.
add("channel", profileYZ([
  [-130, ZT], [-130, ZD], [-106, ZD], [-106, ZF - 6], [106, ZF - 6], [106, ZD], [130, ZD], [130, ZT],
  [IW, ZT], [IW, ZF], [-IW, ZF], [-IW, ZT],
], L).color(channel));

// Cables lying in the channel along its full length, dropping out of the
// open (-X) end onto the floor.
const rodXZ = (x0: number, z0: number, x1: number, z1: number, r: number) =>
  cylinder(Math.hypot(x1 - x0, z1 - z0), r, 12).rotateY((Math.atan2(x1 - x0, z1 - z0) * 180) / Math.PI).translate(x0, 0, z0);
const cables: [number, number, string][] = [[-70, 18, FEEDER[0]], [-30, 13, cable], [5, 13, cable], [40, 18, FEEDER[1]], [75, 11, cable]];
for (const [i, [y, r, c]] of cables.entries()) {
  const zc = ZF + r;
  add(`cable-${i}`, alongX(L, r).translate(-L / 2, y, zc).color(c));
  add(`cable-${i}-drop`, rodXZ(-L / 2, zc, -L / 2 - 140, r + 2, r).translate(0, y, 0).color(c));
  add(`cable-${i}-run`, alongX(220 + i * 50, r).translate(-L / 2 - 140 - 220 - i * 50, y, r + 2).color(c));
}

// Chequer-plate lid: plate, raised diamond pattern and two lifting holes.
const LL = L / 2 - 6;
const lidShape = (name: string, x: number, y: number, z: number) => {
  add(`${name}-plate`, blk(x, y, z, LL, 2 * IW - 4, 8).color(lid));
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 3; j++)
      add(`${name}-tread-${i}-${j}`, box(30, 8, 2, true).rotateZ((i + j) % 2 ? 45 : -45).translate(x - LL / 2 + 60 + i * ((LL - 120) / 7), y - 60 + j * 60, z + 9).color(lid));
  for (const [s, dx] of [["l", -LL / 2 + 25], ["r", LL / 2 - 25]] as [string, number][])
    add(`${name}-lift-${s}`, blk(x + dx, y, z + 8, 26, 12, 1).color(DARK));
};
// Closed lid flush over the +X half.
lidShape("lid-closed", L / 4, 0, ZT - 8);
// Lid for the -X half lifted out and laid on the deck in front.
lidShape("lid-lifted", -L / 4 - 40, -(106 + side / 2) + 20, ZD);

// Flush floor-box outlet in the closed lid: a raised flap with two sockets
// facing the front.
const FX = L / 2 - 180;
add("floorbox-flap", blk(FX, -20, ZT + 1, 150, 130, 50).color(channel));
for (const [s, dx] of [["a", -38], ["b", 38]] as [string, number][]) {
  add(`floorbox-socket-${s}`, cylinder(6, 24, 16).rotateX(90).translate(FX + dx, -85, ZT + 26).color(DARK));
  add(`floorbox-socket-${s}-key`, blk(FX + dx, -92, ZT + 40, 8, 4, 6).color(FEEDER[1]));
}

return p.model();
