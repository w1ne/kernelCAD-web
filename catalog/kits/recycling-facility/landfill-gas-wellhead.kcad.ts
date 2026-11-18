// SPDX-License-Identifier: CC0-1.0
// Landfill gas wellhead: the top of a vertical extraction well drilled into
// a capped landfill cell, where methane is drawn off to a flare or engine.
// What makes it a gas wellhead rather than a post: a black HDPE well casing
// rising out of a bentonite-sealed soil mound, a capped head with brass
// sampling taps, a riser and elbow into a lateral that drops to the buried
// collection header, a gate valve with a handwheel to balance suction, an
// orifice flow-measurement section, three yellow bollards to keep the
// compactor off it, and a numbered well marker.
// Generic visualization geometry at about real size (casing 250 mm OD,
// head about 1.1 m above the mound), millimetres, Z up, taps toward -Y.

meta({
  name: "landfill-gas-wellhead",
  license: 'CC0-1.0',
  title: "Landfill gas wellhead",
  description: "Landfill gas extraction wellhead at about real size: black HDPE well casing in a sealed soil mound, capped head with brass sampling taps, riser, elbow and lateral dropping to the collection header, gate valve with handwheel, orifice flow section, three protective bollards and a numbered well marker. Material controls: HDPE pipework, valve paint, brass taps, bollard yellow. blueValve, redValve and weathered presets.",
  tags: ['landfill gas', 'gas well', 'wellhead', 'methane extraction', 'lfg', 'hdpe pipe', 'residuals', 'recycling', 'materials recovery', 'waste management', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const hdpe = param('hdpe', '#26282a', { label: 'Casing and pipework (black HDPE)' });
const valvePaint = param('valvePaint', '#2f6db3', { label: 'Gate valve and marker (paint)' });
const brass = param('brass', '#b8913a', { label: 'Sampling taps (brass)' });
const bollard = param('bollard', '#e3b420', { label: 'Protective bollards' });
const SOIL = '#6b5b45';

presets({
  blueValve: { hdpe: '#26282a', valvePaint: '#2f6db3', brass: '#b8913a', bollard: '#e3b420' },
  redValve: { hdpe: '#26282a', valvePaint: '#b8352c', brass: '#b8913a', bollard: '#e3b420' },
  weathered: { hdpe: '#3a3a36', valvePaint: '#5a6f86', brass: '#8a7442', bollard: '#b39a48' },
});

const p = assembly("landfill-gas-wellhead");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);

const CR = 125;
const MOUND = 220;
const HEAD = 1050;

// Sealed soil mound around the casing.
add("mound", sphere(1000).scale([1.25, 1.15, 0.22]).subtract(blk(0, 0, -400, 3000, 3000, 400)).color(SOIL));
add("bentonite-collar", cylinder(60, 330, 20).translate(0, 0, MOUND - 40).color('#8c8478'));

// Casing, head flange and the cap with its sampling taps.
add("casing", cylinder(HEAD - MOUND + 40, CR, 20).translate(0, 0, MOUND - 40).color(hdpe));
add("casing-band", cylinder(40, CR + 8, 20).translate(0, 0, MOUND + 200).color(hdpe));
add("head-flange", cylinder(40, 185, 20).translate(0, 0, HEAD).color(hdpe));
for (let i = 0; i < 8; i++) {
  const a = (i * Math.PI) / 4;
  add(`flange-bolt-${i}`, cylinder(60, 12, 6).translate(160 * Math.cos(a), 160 * Math.sin(a), HEAD - 10).color(brass));
}
add("head-cap", cylinder(70, 150, 20).translate(0, 0, HEAD + 40).color(hdpe));
for (const [x, i] of [[-70, 0], [70, 1]]) {
  add(`tap-boss-${i}`, cylinder(40, 20, 10).translate(x, -80, HEAD + 110).color(brass));
  add(`tap-valve-${i}`, blk(x, -80, HEAD + 150, 36, 36, 40).color(brass));
  add(`tap-nipple-${i}`, cylinder(50, 9, 8).rotateX(90).translate(x, -98, HEAD + 170).color(brass));
  add(`tap-lever-${i}`, blk(x, -80, HEAD + 192, 12, 70, 10).color(valvePaint));
}
add("thermowell", cylinder(130, 14, 8).translate(40, 70, HEAD + 110).color(brass));
add("thermowell-dial", cylinder(24, 45, 14).rotateX(90).translate(40, 58, HEAD + 260).color('#f1f0ea'));

// Riser off the -X side of the casing, elbow and lateral running back (+Y).
const RR = 60;
const LZ = 820;
add("tee-branch", cylinder(240, RR, 14).rotateY(-90).translate(-(CR - 40), 0, LZ).color(hdpe));
add("elbow-a", sphere(RR + 6).translate(-(CR + 200), 0, LZ).color(hdpe));
add("lateral-1", cylinder(420, RR, 14).rotateX(-90).translate(-(CR + 200), 0, LZ).color(hdpe));
// Gate valve on the lateral: body, bonnet, stem and handwheel.
const VY = 300;
add("valve-body", blk(-(CR + 200), VY, LZ - 90, 160, 120, 180).color(valvePaint));
add("valve-flange-a", cylinder(24, 100, 16).rotateX(-90).translate(-(CR + 200), VY - 84, LZ).color(valvePaint));
add("valve-flange-b", cylinder(24, 100, 16).rotateX(-90).translate(-(CR + 200), VY + 60, LZ).color(valvePaint));
add("valve-bonnet", cylinder(160, 55, 12).translate(-(CR + 200), VY, LZ + 90).color(valvePaint));
add("valve-stem", cylinder(120, 12, 8).translate(-(CR + 200), VY, LZ + 250).color(brass));
add("handwheel", torus(110, 12, 16).translate(-(CR + 200), VY, LZ + 350).color(valvePaint));
for (let i = 0; i < 3; i++) add(`handwheel-spoke-${i}`, blk(-(CR + 200), VY, LZ + 344, 220, 14, 12).rotateZ(i * 60).color(valvePaint));
// Orifice flow section downstream of the valve, with its two pressure taps.
add("orifice-plate", cylinder(20, 110, 16).rotateX(-90).translate(-(CR + 200), 500, LZ).color(brass));
for (const y of [460, 560]) add(`dp-tap-${y}`, cylinder(70, 10, 8).translate(-(CR + 200), y, LZ + RR - 5).color(brass));
add("lateral-2", cylinder(400, RR, 14).rotateX(-90).translate(-(CR + 200), 520, LZ).color(hdpe));
add("elbow-c", sphere(RR + 6).translate(-(CR + 200), 920, LZ).color(hdpe));
add("lateral-drop", cylinder(LZ - 150, RR, 14).translate(-(CR + 200), 920, 150).color(hdpe));
// Collection header half-buried behind the well.
add("header", cylinder(3000, 110, 18).rotateY(90).translate(-1500, 1050, 112).color(hdpe));
add("header-saddle", blk(-(CR + 200), 1050, 120, 240, 240, 160).color(hdpe));
add("header-trench", blk(0, 1050, 0, 3100, 380, 60).color(SOIL));

// Three protective bollards with reflective bands.
const bol = [[-650, -500], [650, -500], [-650, 650]];
bol.forEach(([x, y], i) => {
  add(`bollard-${i}`, cylinder(1300, 60, 14).translate(x, y, 0).color(bollard));
  add(`bollard-cap-${i}`, sphere(60).translate(x, y, 1300).color(bollard));
  for (const z of [950, 1150]) add(`bollard-band-${i}-${z}`, cylinder(60, 62, 14).translate(x, y, z).color('#202020'));
});

// Numbered well marker post on the camera side.
add("marker-post", blk(450, -820, 0, 60, 60, 1250).color(valvePaint));
add("marker-plate", blk(450, -855, 900, 360, 8, 260).color('#f1f0ea'));
add("marker-band", blk(450, -861, 1080, 360, 4, 60).color(valvePaint));
// Well number and gas-hazard lines on the plate.
for (const [z, w] of [[990, 260], [950, 200], [920, 230]]) add(`marker-line-${z}`, blk(450, -861, z, w, 4, z === 990 ? 40 : 14).color('#202020'));

return p.model();
