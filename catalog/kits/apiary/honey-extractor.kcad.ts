// SPDX-License-Identifier: CC0-1.0
// Manual honey extractor: the hand-cranked centrifuge a beekeeper spins
// uncapped frames in to throw the honey out of the comb.
// What makes it an extractor rather than a drum: a thin-walled stainless drum
// with a rolled rim and a conical floor draining to a honey gate (a valve with
// a lever and a downward spout) low on the front, three tubular legs on a
// brace ring with feet, a bar across the top carrying the gearbox, a crank
// with a turned grip, and a split lid with one half lifted away so the frame
// basket and the capped comb frames standing in it show inside.
// Generic visualization geometry at real size (500 mm drum), millimetres,
// Z up, ground on z = 0, honey gate facing -Y.

meta({
  name: "honey-extractor",
  license: 'CC0-1.0',
  title: "Manual honey extractor",
  description: "Hand-cranked tangential honey extractor: thin-walled stainless drum with rolled rim and conical floor, honey gate with lever and spout, three tubular legs on a brace ring with feet, top bar with gearbox, crank with turned grip, split lid with one half open onto a frame basket holding comb frames. Material controls: stainless steel, gearbox enamel, honey-gate polymer, comb wax, frame timber. Frame-load choice; brightStainless and warmHarvest presets.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'extractor', 'centrifuge', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frames = param('frames', 'loaded', { choices: ['loaded', 'empty'], label: 'Frames in the basket' });

const stainless = param('stainless', '#b9c2c0', { label: 'Drum, legs and lid (stainless steel)' });
const enamel = param('enamel', '#2f5f8a', { label: 'Gearbox and top bar (painted enamel)' });
const polymer = param('polymer', '#c8352b', { label: 'Honey gate and crank grip (polymer)' });
const comb = param('comb', '#e3b24a', { label: 'Capped comb (beeswax)' });
const timber = param('timber', '#c79a5c', { label: 'Frame bars (timber)' });

presets({
  brightStainless: { stainless: '#dfe5e2', enamel: '#3c78a8', polymer: '#d8432f', comb: '#f0c860', timber: '#d9ad6e' },
  warmHarvest: { stainless: '#8f9895', enamel: '#4a5a3a', polymer: '#2b2b2b', comb: '#c98a2a', timber: '#9c7444' },
});

const p = assembly("honey-extractor");
const add = (name, shape) => p.part(name, shape.scale(scale));
// Revolve an (r, z) profile about Z.
const lathe = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const R = 250; // drum radius
const ZF = 420; // drum floor at the wall
const ZT = 1000; // drum rim

// Thin-walled drum: conical floor, wall, and a rolled bead at the rim.
add('drum', lathe([
  [0, ZF - 40], [R, ZF], [R, ZT], [R - 5, ZT], [R - 5, ZF + 6], [0, ZF - 34],
]).color(stainless));
add('rim-bead', torus(R, 7, 12).translate(0, 0, ZT).color(stainless));
add('drum-band', torus(R + 2, 4, 10).translate(0, 0, ZF + 40).color(stainless));

// Three tubular legs on a brace ring, with feet.
for (const a of [90, 210, 330]) {
  const x = (R - 20) * Math.cos((a * Math.PI) / 180);
  const y = (R - 20) * Math.sin((a * Math.PI) / 180);
  add(`leg-${a}`, cylinder(ZF + 60, 16, 12).translate(x, y, 18).color(stainless));
  add(`foot-${a}`, cylinder(18, 30, 12).translate(x, y, 0).color(enamel));
}
add('leg-brace', torus(R - 20, 8, 10).translate(0, 0, 160).color(stainless));

// Honey gate low on the front: flange, valve body, lever and spout.
const gy = -R;
add('gate-flange', cylinder(10, 38, 14).rotateX(90).translate(0, gy + 2, ZF + 42).color(stainless));
add('gate-body', box(70, 70, 80, true).translate(0, gy - 40, ZF + 42).color(polymer));
add('gate-spout', cylinder(50, 18, 12).translate(0, gy - 50, ZF - 40).color(polymer));
add('gate-lever', box(18, 14, 110, true).translate(0, 0, 55).rotateX(25).translate(0, gy - 60, ZF + 75).color(polymer));
add('gate-lever-knob', sphere(16).translate(0, gy - 108, ZF + 177).color(polymer));

// Top bar across the rim with the gearbox and crank.
const ZB = ZT + 8;
add('top-bar', box(2 * R + 40, 50, 24, true).translate(0, 0, ZB + 12).color(enamel));
add('gearbox', lathe([[0, ZB], [70, ZB], [70, ZB + 60], [55, ZB + 90], [0, ZB + 95]]).color(enamel));
add('crank-shaft', cylinder(110, 10, 10).rotateY(90).translate(60, 0, ZB + 50).color(stainless));
add('crank-hub', cylinder(30, 22, 12).rotateY(90).translate(165, 0, ZB + 50).color(enamel));
add('crank-arm', box(20, 22, 200, true).translate(0, 0, 90).rotateX(-30).translate(185, 0, ZB + 50).color(stainless));
add('crank-grip', cylinder(110, 18, 12).rotateY(90).translate(185, 90, ZB + 206).color(polymer));
add('spindle', cylinder(ZB - ZF + 20, 12, 10).translate(0, 0, ZF - 10).color(stainless));

// Split lid: the back half closed, the front half folded back over it on its
// hinge along the bar, leaving the front of the drum open.
const half = (y) => cylinder(6, R + 10, 32).intersect(box(2 * R + 40, R + 20, 20, true).translate(0, y * (R + 20) / 2, 0));
add('lid-closed', half(1).translate(0, 0, ZT + 6).color(stainless));
add('lid-folded', half(-1).rotateX(180).translate(0, 0, ZT + 18).color(stainless));
add('lid-knob', cylinder(20, 16, 10).translate(0, 150, ZT + 18).color(polymer));

// Frame basket: a stainless cage around the spindle holding frames
// tangentially, visible through the open lid half.
add('basket-ring-top', torus(150, 5, 16).translate(0, 0, ZT - 60).color(stainless));
add('basket-ring-low', torus(150, 5, 16).translate(0, 0, ZF + 60).color(stainless));
if (frames.value === 'loaded') {
  for (const a of [0, 90, 180, 270]) {
    const frame = box(230, 24, 380, true).color(comb);
    const bar = box(270, 28, 22, true).translate(0, 0, 200).color(timber);
    add(`frame-${a}`, frame.rotateZ(a + 90).translate(150 * Math.cos((a * Math.PI) / 180), 150 * Math.sin((a * Math.PI) / 180), ZF + 280));
    add(`frame-bar-${a}`, bar.rotateZ(a + 90).translate(150 * Math.cos((a * Math.PI) / 180), 150 * Math.sin((a * Math.PI) / 180), ZF + 280));
  }
}

return p.model();
