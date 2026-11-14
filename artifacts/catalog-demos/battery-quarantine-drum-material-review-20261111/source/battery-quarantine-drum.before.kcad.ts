// SPDX-License-Identifier: CC0-1.0
// Battery quarantine drum: where a recovery site isolates a damaged,
// swollen or hot lithium battery pulled off the tipping floor. What makes it
// a quarantine drum rather than a plain drum: an open-head UN drum whose lid
// is held by a bolted closing ring with a lever lug, a pressure-relief vent
// in the lid, a temperature probe through the lid wired to a wall-style
// alarm box on a post, a Class 9 striped hazard label, and a sack of
// vermiculite fill leaning against it. It stands on a low galvanised sump
// tray with a grated deck so a leaking cell cannot run across the floor.
// Generic visualization geometry at about real size (drum 600 mm dia x
// 900 mm), millimetres, Z up, labels on -Y.

meta({
  name: "battery-quarantine-drum",
  license: 'CC0-1.0',
  title: "Battery quarantine drum",
  description: "Lithium battery quarantine drum at about real size: open-head UN steel drum with bolted closing ring and lever lug, lid pressure-relief vent and lifting handle, temperature probe wired to an alarm box on a post, Class 9 striped hazard label, vermiculite sack, on a galvanised grated sump tray. Material controls: drum, closing ring, sump tray and alarm/labels. Optional vermiculite sack. lithiumBlue, leadAcidBlack and weathered presets.",
  tags: ['battery', 'lithium battery', 'quarantine', 'battery fire', 'drum', 'open head drum', 'class 9', 'hazardous waste', 'containers', 'recycling', 'materials recovery', 'waste management', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const drum = param('drum', '#2f5f8f', { label: 'Drum (painted steel)' });
const ring = param('ring', '#b9c0c2', { label: 'Closing ring and fittings (zinc)' });
const tray = param('tray', '#8e979a', { label: 'Sump tray (galvanised)' });
const alarm = param('alarm', '#e2b41f', { label: 'Alarm box and sack' });
const withSack = param('withSack', true, { label: 'Vermiculite sack' });

presets({
  lithiumBlue: { drum: '#2f5f8f', ring: '#b9c0c2', tray: '#8e979a', alarm: '#e2b41f' },
  leadAcidBlack: { drum: '#26292b', ring: '#c7cbcc', tray: '#6d7377', alarm: '#d4542b' },
  weathered: { drum: '#4b5f6b', ring: '#8d8a80', tray: '#76726a', alarm: '#b09038' },
});

const p = assembly("battery-quarantine-drum");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);

// Low galvanised sump tray with a grated deck.
const TW = 900;
const TH = 160;
add("tray", blk(0, 0, 30, TW, TW, TH - 30).subtract(blk(0, 0, 60, TW - 40, TW - 40, TH)).color(tray));
for (const x of [-TW / 2 + 60, TW / 2 - 60]) add(`tray-runner-${x}`, blk(x, 0, 0, 80, TW - 20, 30).color(tray));
for (let i = -5; i <= 5; i++) add(`grate-${i}`, blk(i * 78, 0, TH - 34, 10, TW - 44, 30).color(tray));
add("grate-cross", blk(0, 0, TH - 34, TW - 44, 10, 30).color(tray));

// Open-head drum: body with two swaged beads, lid, bolted closing ring.
const DZ = TH - 4;
const R = 300;
const H = 900;
add("drum-body", cylinder(H, R, 28).translate(0, 0, DZ).color(drum));
for (const z of [0.3, 0.62]) add(`bead-${Math.round(z * 100)}`, cylinder(26, R + 9, 28).translate(0, 0, DZ + H * z).color(drum));
add("bottom-chime", cylinder(24, R + 8, 28).translate(0, 0, DZ).color(drum));
add("lid", cylinder(26, R + 10, 28).translate(0, 0, DZ + H).color(drum));
add("lid-dish", cylinder(14, R - 60, 24).translate(0, 0, DZ + H + 26).color(drum));
add("closing-ring", torus(R + 14, 16, 28).translate(0, 0, DZ + H + 6).color(ring));
// Lever lug on the closing ring, with its bolt, at the front-left.
const LA = -125;
const lx = (r: number) => r * Math.cos((LA * Math.PI) / 180);
const ly = (r: number) => r * Math.sin((LA * Math.PI) / 180);
add("ring-lug", blk(0, 0, -30, 70, 70, 60).rotateZ(LA).translate(lx(R + 40), ly(R + 40), DZ + H + 6).color(ring));
add("ring-lever", blk(0, 0, -10, 200, 40, 20).rotateZ(LA + 90).translate(lx(R + 64), ly(R + 64), DZ + H - 20).color(ring));
add("ring-bolt", cylinder(120, 9, 8).rotateX(90).rotateZ(LA).translate(lx(R + 40), ly(R + 40), DZ + H + 6).color('#3a3c3e'));

// Lid fittings: pressure-relief vent, lifting handle, temperature probe gland.
add("vent-boss", cylinder(30, 40, 14).translate(130, 120, DZ + H + 40).color(ring));
add("vent-cap", sphere(34).scale(1, 1, 0.6).translate(130, 120, DZ + H + 72).color('#d4542b'));
for (const x of [-90, 90]) add(`handle-post-${x}`, blk(x, 140, DZ + H + 40, 20, 20, 60).color(ring));
add("handle-bar", cylinder(220, 12, 10).rotateY(90).translate(-110, 140, DZ + H + 100).color(ring));
add("probe-gland", cylinder(40, 26, 12).translate(-60, -120, DZ + H + 40).color(ring));
add("probe-head", blk(-60, -120, DZ + H + 80, 60, 60, 50).color(alarm));

// Alarm post: square post on a foot, alarm box with beacon, probe cable.
const AX = 620;
const AY = 180;
add("alarm-foot", blk(AX, AY, 0, 220, 220, 20).color(tray));
add("alarm-post", blk(AX, AY, 20, 60, 60, 1240).color(tray));
add("alarm-box", extrudeRoundedRect(220, 280, 20, 100, { axis: 'y' }).translate(AX, AY - 130, 1120).color(alarm));
add("alarm-display", blk(AX, AY - 132, 1180, 140, 4, 60).color('#1d2a24'));
add("alarm-readout", blk(AX - 20, AY - 135, 1195, 80, 3, 30).color('#7fe07a'));
add("alarm-beacon", sphere(46).scale(1, 1, 1.3).translate(AX, AY - 80, 1290).color('#d4542b'));
add("probe-cable", cylinder(611, 7, 6).rotateY(90).rotateZ(21).translate(-60, -120, DZ + H + 120).color('#26292b'));

// Class 9 label: white diamond, black stripes in the top half, plus a UN plate.
const LZ = DZ + 560;
add("class9-diamond", box(220, 4, 220, true).rotateY(45).translate(0, -R - 3, LZ).rotateZ(-30).color('#f2f0ea'));
for (const [i, w] of [[0, 150], [1, 230], [2, 290]] as const) add(`class9-stripe-${i}`, blk(0, -R - 6, LZ + 120 - i * 46, w * 0.55, 4, 20).rotateZ(-30).color('#1b1c1d'));
add("un-plate", blk(0, -R - 4, DZ + 300, 220, 4, 110).rotateZ(-65).color('#f2f0ea'));
add("un-plate-text", blk(0, -R - 7, DZ + 340, 160, 3, 26).rotateZ(-65).color('#1b1c1d'));

// Vermiculite sack slumped against the tray.
if (withSack.value) {
  add("sack", extrudeRoundedRect(420, 520, 90, 170).rotateZ(20).translate(-560, -380, 0).color(alarm));
  add("sack-top", extrudeRoundedRect(300, 400, 80, 70).rotateZ(20).translate(-560, -380, 170).color(alarm));
  add("sack-label", blk(0, 0, 0, 220, 260, 4).rotateZ(20).translate(-560, -380, 240).color('#f2f0ea'));
}

return p.model();
