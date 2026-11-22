// SPDX-License-Identifier: CC0-1.0
// Glass washing tank: the agitated stainless tank that scrubs labels, sugar
// and food residue off crushed glass (cullet) before it is screened and
// re-melted. What makes it that tank rather than a storage vessel: an open
// top full of wash water under a bridge beam carrying the agitator gearmotor,
// an overflow launder ring round the rim that skims floating paper and
// plastic, a steep cone bottom with a knife-gate drain for the washed glass,
// an inclined feed chute, and a walkway with handrail across the bridge.
// Generic visualization geometry at about real size (2.3 m diameter, 4 m
// high), millimetres, Z up, chute and drain face the -X/-Y camera.

meta({
  name: "glass-washing-tank",
  license: 'CC0-1.0',
  title: "Glass washing tank",
  description: "Agitated cullet wash tank at about real size: open-top stainless tank on four braced legs with a cone bottom and knife-gate drain, wash water at the rim, overflow launder ring with skim pipe, bridge beam and walkway carrying the agitator gearmotor, inclined cullet feed chute and access ladder. Material controls: stainless tank, support structure, drive and wash water. plant, weathered, labelWash and highVisibility presets.",
  tags: ["recycling", "cullet", "glass", "wash tank", "agitator", "cone tank", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const tank = param('tank', '#c4cbcd', { label: 'Tank and launder (stainless)' });
const structure = param('structure', '#3b5f7a', { label: 'Legs, bridge and walkway' });
const drive = param('drive', '#2e7d4f', { label: 'Agitator drive and valve actuator' });
const water = param('water', '#5e8f8a', { label: 'Wash water' });

presets({
  plant: { tank: '#c4cbcd', structure: '#3b5f7a', drive: '#2e7d4f', water: '#5e8f8a' },
  weathered: { tank: '#a6aaa4', structure: '#4f5a5e', drive: '#56695a', water: '#6f7a5c' },
  labelWash: { tank: '#d3d8da', structure: '#5a5f66', drive: '#2f5ea8', water: '#8fa39a' },
  highVisibility: { tank: '#e3e6e6', structure: '#d4572a', drive: '#f0b429', water: '#4d8fa6' },
});

const p = assembly("glass-washing-tank");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// An (x, z) side profile extruded along Y over width t, centred on y = 0.
const profileXZ = (pts: number[][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
// Turned profile [[radius, z], ...] about Z.
const turned = (pts: number[][]) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const R = 1100, ZO = 900, ZC = 1700, ZT = 3400, LG = 820;

// Open-top cup: cone bottom, straight wall, floor of the wet well at the water line.
add("tank-body", turned([[0, ZO], [180, ZO], [R, ZC], [R, ZT], [R - 30, ZT], [R - 30, ZT - 150], [0, ZT - 150]]).color(tank));
add("wash-water", cylinder(20, R - 30, 28).translate(0, 0, ZT - 150).color(water));
add("rim", torus(R, 30, 28).translate(0, 0, ZT).color(tank));
for (const z of [ZC, ZC + 850]) add(`band-${z}`, cylinder(70, R + 20, 28).translate(0, 0, z).color(tank));

// Overflow launder ring just under the rim, with a skim pipe down the front.
add("launder", turned([[R, ZT - 420], [R + 240, ZT - 420], [R + 240, ZT - 120], [R + 210, ZT - 120], [R + 210, ZT - 390], [R, ZT - 390]]).color(tank));
add("skim-pipe", cylinder(ZT - 420 - 600, 60, 10).translate(-300, -R - 120, 600).color(tank));
add("skim-elbow", sphere(80).translate(-300, -R - 120, 600).color(tank));
add("skim-run", cylinder(700, 60, 10).rotateX(90).translate(-300, -R - 120, 600).color(tank));

// Four legs with base plates, a ring girt and diagonal braces.
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  add(`leg-${sx}-${sy}`, blk(sx * LG, sy * LG, 0, 160, 160, ZC + 600).color(structure));
  add(`base-plate-${sx}-${sy}`, blk(sx * LG, sy * LG, 0, 320, 320, 25).color(tank));
}
for (const s of [-1, 1]) {
  add(`girt-x-${s}`, blk(0, s * LG, 700, 2 * LG, 120, 120).color(structure));
  add(`girt-y-${s}`, blk(s * LG, 0, 700, 120, 2 * LG, 120).color(structure));
}

// Cone drain: knife gate with actuator and a short spout to the glass screen.
add("knife-gate", blk(0, 0, ZO - 180, 420, 300, 180).color(tank));
add("gate-actuator", cylinder(520, 70, 12).rotateY(-90).translate(-210, 0, ZO - 90).color(drive));
add("drain-spout", turned([[150, ZO - 180], [150, ZO - 560], [0, ZO - 560], [0, ZO - 180]]).color(tank));

// Bridge beam across the top with the agitator gearmotor and its shaft.
add("bridge", blk(0, 0, ZT + 40, 2 * R + 500, 260, 180).color(structure));
for (const s of [-1, 1]) add(`bridge-seat-${s}`, blk(s * (R + 120), 0, ZT - 120, 240, 300, 160).color(structure));
add("gearbox", blk(0, 0, ZT + 220, 420, 420, 300).color(drive));
add("motor", cylinder(520, 150, 16).translate(0, 0, ZT + 520).color(drive));
add("motor-fan-cover", cylinder(60, 160, 16).translate(0, 0, ZT + 1040).color(structure));
add("agitator-shaft", cylinder(ZT - 150 - 1300, 45, 10).translate(0, 0, 1300).color(tank));

// Walkway along the bridge (+Y side) with handrail posts and rails.
add("walkway", blk(0, 330, ZT + 200, 2 * R + 500, 400, 30).color(structure));
for (const x of [-R - 200, -R / 2, 0, R / 2, R + 200]) add(`rail-post-${x}`, blk(x, 510, ZT + 230, 40, 40, 1000).color(drive));
add("handrail", blk(0, 510, ZT + 1200, 2 * R + 440, 40, 40).color(drive));
add("midrail", blk(0, 510, ZT + 700, 2 * R + 440, 30, 30).color(drive));

// Inclined cullet feed chute arriving over the rim from -X, on a stand.
add("feed-chute", profileXZ([[-2600, 2500], [-900, ZT + 300], [-900, ZT + 150], [-2600, 2350]], 500).color(tank));
for (const s of [-1, 1]) add(`chute-side-${s}`, profileXZ([[-2600, 2500], [-900, ZT + 300], [-900, ZT + 480], [-2600, 2680]], 24).translate(0, s * 260, 0).color(tank));
add("chute-stand", blk(-2450, 0, 0, 140, 140, 2400).color(structure));
add("chute-stand-foot", blk(-2450, 0, 0, 300, 300, 25).color(tank));

// Access ladder up the -Y side to the walkway.
for (const s of [-1, 1]) add(`ladder-stile-${s}`, blk(R + 120 + s * 220, -LG - 80, 0, 50, 50, ZT + 260).color(structure));
for (let z = 300; z < ZT + 200; z += 300) add(`rung-${z}`, cylinder(440, 16, 6).rotateY(90).translate(R + 120 - 220, -LG - 80, z).color(structure));
for (const z of [1200, 2400]) add(`ladder-tie-${z}`, blk(LG + 310, -LG - 80, z, 620, 50, 60).color(structure));

return p.model();
