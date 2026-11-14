// SPDX-License-Identifier: CC0-1.0
// Stage batten section: a length of flown electric pipe batten as it hangs
// over the stage, with its lift lines, a plugging raceway and two fixtures.
// What makes it a batten rather than a pole: 48 mm schedule-40 pipe with a
// bolted splice sleeve and capped ends marked with trim tape, two pickups
// where a basket of trim chain wraps the pipe and runs up through a shackle
// and turnbuckle to the wire-rope lift line, an electric raceway strapped
// behind the pipe with numbered circuit pigtails dropping from it, and two
// PAR cans hung on C-clamps and yokes, focused down toward the stage.
// Generic visualization geometry at about real size (3 m long, 2 m from the
// lowest plug to the top of the lift lines), millimetres, Z up, fixtures
// focused toward -Y, lowest connector on z = 0.

meta({
  name: "stage-batten-section",
  license: 'CC0-1.0',
  title: "Stage batten section",
  description: "Flown electric pipe batten at about real size: 3 m of 48 mm pipe with a bolted splice sleeve and capped ends with trim tape, two trim-chain pickups with shackles, turnbuckles and wire-rope lift lines, an electric plugging raceway strapped behind the pipe with circuit labels and four dangling stage-pin pigtails, and two PAR cans on C-clamps and yokes focused down to the stage. Material controls: pipe and fixtures, rigging hardware, raceway, trim tape. houseShow, touring and schoolHall presets.",
  tags: ['batten', 'pipe batten', 'electric batten', 'fly system', 'lift line', 'trim chain', 'raceway', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 7500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const pipe = param('pipe', '#26282b', { label: 'Pipe and fixtures' });
const rigging = param('rigging', '#b9c0c4', { label: 'Rigging hardware' });
const raceway = param('raceway', '#5d6670', { label: 'Electric raceway' });
const tape = param('tape', '#f2f0e8', { label: 'Trim tape and labels' });

presets({
  houseShow: { pipe: '#26282b', rigging: '#b9c0c4', raceway: '#5d6670', tape: '#f2f0e8' },
  touring: { pipe: '#a9b0b5', rigging: '#d8a21f', raceway: '#1f2124', tape: '#e8443a' },
  schoolHall: { pipe: '#3a4a5c', rigging: '#c7ccce', raceway: '#c9b48a', tape: '#f0c419' },
});

const LENS = '#f3e2a8';

const p = assembly("stage-batten-section");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const alongX = (len: number, r: number, n = 12) => cylinder(len, r, n).rotateY(90); // x from 0 to len

const L = 3000;
const ZP = 900; // pipe centre
const RP = 24;

// Pipe, splice sleeve with bolts, end caps and trim tape.
add("pipe", alongX(L, RP, 16).translate(-L / 2, 0, ZP).color(pipe));
add("splice-sleeve", alongX(300, RP + 6, 16).translate(-150, 0, ZP).color(pipe));
for (const x of [-110, -50, 50, 110]) add(`splice-bolt-${x}`, cylinder(90, 6, 6).translate(x, 0, ZP - 45).color(rigging));
for (const sx of [-1, 1]) {
  const tag = sx < 0 ? 'l' : 'r';
  add(`end-cap-${tag}`, alongX(14, RP + 3, 16).translate(sx < 0 ? -L / 2 - 14 : L / 2, 0, ZP).color(rigging));
  add(`trim-tape-${tag}`, alongX(60, RP + 1, 16).translate(sx * (L / 2 - 140) - 30, 0, ZP).color(tape));
}

// Pickups: trim chain basket, shackle, turnbuckle and wire-rope lift line.
for (const x0 of [-1000, 1000]) {
  const tag = x0 < 0 ? 'l' : 'r';
  for (const dx of [-24, 24]) add(`basket-${tag}-${dx}`, torus(RP + 8, 6, 8).rotateY(90).scale([1, 1, 1.4]).translate(x0 + dx, 0, ZP + 12).color(rigging));
  for (let k = 0; k < 4; k++) {
    const link = torus(18, 5, 8).scale([1, 1.8, 1]).rotateX(90);
    add(`chain-${tag}-${k}`, (k % 2 ? link.rotateZ(90) : link).translate(x0, 0, ZP + 85 + k * 46).color(rigging));
  }
  const ZS = ZP + 85 + 4 * 46;
  add(`shackle-${tag}`, torus(26, 7, 8).rotateX(90).translate(x0, 0, ZS + 10).color(rigging));
  add(`shackle-pin-${tag}`, alongX(80, 7, 8).translate(x0 - 40, 0, ZS - 14).color(rigging));
  add(`turnbuckle-eye-low-${tag}`, torus(16, 5, 8).rotateY(90).translate(x0, 0, ZS + 50).color(rigging));
  add(`turnbuckle-body-${tag}`, cylinder(160, 14, 8).translate(x0, 0, ZS + 66).color(rigging));
  add(`turnbuckle-eye-high-${tag}`, torus(16, 5, 8).rotateY(90).translate(x0, 0, ZS + 242).color(rigging));
  add(`lift-line-${tag}`, cylinder(ZP + 1100 - (ZS + 258), 4, 6).translate(x0, 0, ZS + 258).color(rigging));
  add(`rope-sleeve-${tag}`, cylinder(50, 9, 6).translate(x0, 0, ZS + 270).color(rigging));
}

// Electric raceway strapped behind the pipe, with labels and pigtails.
const YR = 95;
const RL = 2400;
add("raceway", blk(0, YR, ZP - 45, RL, 90, 90).color(raceway));
for (const sx of [-1, 1]) add(`raceway-cap-${sx < 0 ? 'l' : 'r'}`, blk(sx * (RL / 2 + 5), YR, ZP - 50, 10, 100, 100).color(pipe));
for (const x of [-700, 0, 700]) add(`raceway-strap-${x}`, blk(x, YR / 2, ZP - 30, 40, YR + 40, 60).color(rigging));
const PIGS = [-900, -300, 300, 900];
PIGS.forEach((x, i) => {
  add(`circuit-label-${i}`, blk(x, YR - 47, ZP - 20, 90, 4, 40).color(tape));
  add(`pigtail-${i}`, cylinder(ZP - 45 - 110, 8, 6).translate(x, YR, 110).color(pipe));
  add(`pigtail-plug-${i}`, blk(x, YR, 0, 50, 50, 110).color(pipe));
  add(`pigtail-band-${i}`, blk(x, YR, 80, 54, 54, 14).color(tape));
});

// Two PAR cans on C-clamps and yokes, focused down toward the stage.
const can = path().moveTo(0, -120).lineTo(70, -120).lineTo(95, -60).lineTo(95, 130).lineTo(105, 130).lineTo(105, 150)
  .lineTo(0, 150).close().revolve();
for (const x of [-500, 500]) {
  const tag = x < 0 ? 'l' : 'r';
  const ZT = ZP - 330; // trunnion
  add(`c-clamp-${tag}`, blk(x, -10, ZP - RP - 10, 50, 70, RP * 2 + 50).subtract(alongX(80, RP + 2, 12).translate(x - 40, 0, ZP)).color(pipe));
  add(`clamp-bolt-${tag}`, cylinder(70, 8, 8).translate(x, 0, ZP - RP - 80).color(pipe));
  add(`yoke-top-${tag}`, blk(x, 0, ZP - RP - 100, 250, 40, 20).color(pipe));
  for (const sx of [-1, 1]) {
    add(`yoke-arm-${tag}-${sx < 0 ? 'a' : 'b'}`, blk(x + sx * 117, 0, ZT - 20, 16, 40, ZP - RP - 100 - ZT + 20).color(pipe));
    add(`yoke-knob-${tag}-${sx < 0 ? 'a' : 'b'}`, alongX(30, 18, 10).translate(x + sx * 125 + (sx < 0 ? -30 : 0), 0, ZT).color(rigging));
  }
  add(`can-${tag}`, can.rotateX(120).translate(x, 0, ZT).color(pipe));
  add(`lens-${tag}`, cylinder(6, 90, 16).translate(0, 0, 146).rotateX(120).translate(x, 0, ZT).color(LENS));
  add(`gel-frame-${tag}`, cylinder(10, 112, 4).rotateZ(45).translate(0, 0, 152).rotateX(120).translate(x, 0, ZT).color(rigging));
  add(`safety-cable-${tag}`, torus(40, 3, 8).rotateY(90).scale([1, 1, 1.5]).translate(x + 40, 0, ZP).color(rigging));
}

return p.model();
