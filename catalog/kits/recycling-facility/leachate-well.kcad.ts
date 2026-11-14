// SPDX-License-Identifier: CC0-1.0
// Leachate well: the vertical extraction well on a landfill cell where a
// pneumatic pump lifts the leachate that collects in the waste mass. What
// makes it that wellhead rather than a post on a slab: a large HDPE casing
// rising from a concrete apron on a capped soil mound, a bolted blind
// flange wellhead with compressed-air and discharge hoses coming out
// through glands, a discharge line with a check valve, sample tap and flow
// totaliser elbowing into the buried header, a dip-meter port, a pump
// controller cabinet on a post, a numbered well tag, and three yellow
// bollards protecting it from site traffic.
// Generic visualization geometry at about real size (wellhead 1.5 m tall),
// millimetres, Z up, controller and tag on -Y.

meta({
  name: "leachate-well",
  license: 'CC0-1.0',
  title: "Leachate well",
  description: "Landfill leachate extraction wellhead at about real size: HDPE casing from a concrete apron on a capped soil mound, bolted blind flange with air and discharge hose glands, discharge line with check valve, sample tap and flow meter into the buried header, dip-meter port, pump controller cabinet on a post, numbered well tag and three protective bollards. Material controls: casing, concrete apron, fittings and bollards. landfill, stainless, weathered and highVisibility presets.",
  tags: ["recycling", "landfill", "leachate", "well", "wellhead", "pump", "pipework", "bollard", "materials recovery", "waste management", "residuals", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const casing = param('casing', '#26292b', { label: 'Well casing (HDPE)' });
const apron = param('apron', '#a39e93', { label: 'Apron (concrete)' });
const fittings = param('fittings', '#2f5d9a', { label: 'Valves and fittings (paint)' });
const bollards = param('bollards', '#f0c419', { label: 'Bollards (paint)' });

presets({
  landfill: { casing: '#26292b', apron: '#a39e93', fittings: '#2f5d9a', bollards: '#f0c419' },
  stainless: { casing: '#c4c9cb', apron: '#b5b0a5', fittings: '#8a9196', bollards: '#e0a526' },
  weathered: { casing: '#3a3936', apron: '#8a857a', fittings: '#4f6478', bollards: '#a88f3c' },
  highVisibility: { casing: '#2f6b4f', apron: '#c4bfb3', fittings: '#d9692c', bollards: '#f5d000' },
});

const p = assembly("leachate-well");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rodX = (x0: number, x1: number, r: number, seg: number) => cylinder(x1 - x0, r, seg).rotateY(90).translate(x0, 0, 0);
const rodY = (y0: number, y1: number, r: number, seg: number) => cylinder(y1 - y0, r, seg).rotateX(-90).translate(0, y0, 0);

// Capped soil mound with a square concrete apron round the casing.
add("soil-mound", sphere(1000).scale([1.9, 1.6, 0.32]).subtract(blk(0, 0, -400, 4000, 4000, 400)).color('#6b5a44'));
add("apron", blk(0, 0, 200, 1500, 1500, 150).color(apron));
add("apron-chamfer", blk(0, 0, 350, 1300, 1300, 30).color(apron));

// HDPE casing with a stub flange and bolted blind flange on top.
const CR = 230, CZ = 1250, KX = -950, KY = 380;
add("well-casing", cylinder(CZ - 350, CR, 20).translate(0, 0, 350).color(casing));
add("stub-flange", cylinder(50, CR + 90, 20).translate(0, 0, CZ).color(casing));
add("blind-flange", cylinder(40, CR + 90, 20).translate(0, 0, CZ + 50).color(fittings));
for (let k = 0; k < 8; k++) {
  const a = (k * Math.PI) / 4 + Math.PI / 8;
  add(`flange-bolt-${k}`, cylinder(110, 13, 6).translate(Math.cos(a) * (CR + 55), Math.sin(a) * (CR + 55), CZ - 10).color('#a8b4b6'));
}
const TZ = CZ + 90;
// Glands with the air and discharge hoses, and the dip-meter port with cap.
add("air-gland", cylinder(80, 45, 10).translate(-110, 60, TZ).color('#a8b4b6'));
add("discharge-gland", cylinder(80, 60, 12).translate(90, -40, TZ).color('#a8b4b6'));
add("dip-port", cylinder(120, 40, 10).translate(-60, -150, TZ).color('#a8b4b6'));
add("dip-cap", cylinder(30, 52, 10).translate(-60, -150, TZ + 120).color('#c8322a'));
add("air-hose-rise", cylinder(260, 22, 8).translate(-110, 60, TZ + 80).color('#1c1d1e'));
add("air-hose-bend", sphere(26).translate(-110, 60, TZ + 340).color('#1c1d1e'));
add("air-hose-run", rodY(60, KY, 22, 8).translate(-110, 0, TZ + 340).color('#1c1d1e'));
add("air-hose-corner", sphere(26).translate(-110, KY, TZ + 340).color('#1c1d1e'));
add("air-hose-cross", rodX(KX + 230, -110, 22, 8).translate(0, KY, TZ + 340).color('#1c1d1e'));
add("air-hose-drop", cylinder(TZ + 340 - 1300, 22, 8).translate(KX + 230, KY, 1300).color('#1c1d1e'));

// Discharge line: riser, elbow, check valve, sample tap, flow meter, down into the header.
const DZ = TZ + 260;
add("discharge-riser", cylinder(DZ - TZ - 80, 40, 10).translate(90, -40, TZ + 80).color(fittings));
add("discharge-elbow", sphere(46).translate(90, -40, DZ).color(fittings));
add("discharge-run", rodX(90, 1300, 40, 10).translate(0, -40, DZ).color(fittings));
add("check-valve", rodX(380, 560, 72, 12).translate(0, -40, DZ).color(fittings));
add("check-valve-cap", blk(470, -40, DZ + 60, 120, 90, 50).color(fittings));
add("sample-tap", cylinder(110, 16, 8).translate(700, -40, DZ - 140).color('#a8b4b6'));
add("sample-handle", blk(700, -80, DZ - 110, 20, 90, 18).color('#c8322a'));
add("flow-meter", rodX(860, 1080, 90, 14).translate(0, -40, DZ).color(fittings));
add("flow-meter-head", blk(970, -40, DZ + 85, 150, 150, 110).color('#c9ccce'));
add("flow-meter-dial", cylinder(10, 52, 14).rotateX(90).translate(970, -116, DZ + 140).color('#f2f2ee'));
add("header-elbow", sphere(46).translate(1300, -40, DZ).color(fittings));
add("header-drop", cylinder(DZ - 150, 40, 10).translate(1300, -40, 150).color(fittings));
add("header-pipe-stub", rodX(1300, 1900, 90, 14).translate(0, -40, 150).color(casing));
add("pipe-support", blk(1300, -40, 0, 160, 160, 150).color(apron));
add("line-support", blk(1300, -40, 150, 60, 60, DZ - 200).color('#5d6366'));

// Pump controller on a post, with a status beacon and a numbered well tag.
add("controller-post", blk(KX, KY, 0, 90, 90, 1100).color('#5d6366'));
add("controller-cabinet", blk(KX, KY - 20, 1050, 420, 220, 520).color('#c9ccce'));
add("cabinet-door-line", blk(KX + 150, KY - 133, 1080, 8, 6, 460).color('#5d6366'));
add("cabinet-panel", blk(KX - 40, KY - 134, 1300, 200, 6, 150).color('#1c1d1e'));
add("cabinet-counter", blk(KX - 40, KY - 137, 1330, 140, 4, 50).color('#7fd27f'));
add("cabinet-hood", blk(KX, KY - 30, 1570, 470, 280, 30).color('#c9ccce'));
add("status-beacon", cylinder(100, 45, 12).translate(KX + 120, KY - 20, 1600).color('#2f9a4f'));
add("well-tag", blk(-120, -CR - 6, 900, 240, 8, 160).color('#f2f2ee'));
add("well-tag-band", blk(-120, -CR - 10, 1010, 240, 6, 40).color('#c8322a'));
for (let k = 0; k < 3; k++) add(`well-tag-digit-${k}`, blk(-190 + k * 70, -CR - 11, 920, 40, 6, 70).color('#1c1d1e'));

// Three yellow bollards with black bands, round the apron.
for (const [k, x, y] of [[0, -950, -650], [1, 450, -1000], [2, 1050, 550]] as [number, number, number][]) {
  add(`bollard-${k}`, cylinder(1000, 70, 12).translate(x, y, 0).color(bollards));
  add(`bollard-band-${k}`, cylinder(80, 73, 12).translate(x, y, 750).color('#1c1d1e'));
  add(`bollard-cap-${k}`, sphere(70).translate(x, y, 1000).color(bollards));
}

return p.model();
