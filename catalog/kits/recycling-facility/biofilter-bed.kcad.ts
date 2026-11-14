// SPDX-License-Identifier: CC0-1.0
// Biofilter bed: the open odour-control bed that treats the foul air pulled
// out of a composting or tipping hall. What makes it a biofilter rather than
// a cabinet with canisters: a long concrete-walled bed filled with mounded
// wood-chip media, an extraction fan pushing the air through a round
// pre-humidifier tower and into the plenum under the media, perforated
// irrigation lines with sprinkler heads across the top to keep the media
// damp, a drain trough with a sump outlet along the front wall, and a
// sampling hood sitting on the media where the outgoing air is tested.
// Generic visualization geometry at about real size (11 m long, 1.6 m bed
// walls), millimetres, Z up, fan and drain on -Y.

meta({
  name: "biofilter-bed",
  license: 'CC0-1.0',
  title: "Biofilter bed",
  description: "Open odour-control biofilter at about real size: concrete-walled bed of mounded wood-chip media, extraction fan feeding a round pre-humidifier tower and duct into the under-floor plenum, irrigation lines with sprinkler heads, front drain trough with sump outlet and an air-sampling hood on the media. One or two cells. Material controls: concrete walls, filter media, ductwork and fan paint. organics, weathered, fibreglass and highVisibility presets.",
  tags: ["recycling", "biofilter", "odour control", "air treatment", "composting", "wood chip", "fan", "humidifier", "materials recovery", "waste management", "organics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const concrete = param('concrete', '#a7a39a', { label: 'Bed walls (concrete)' });
const media = param('media', '#6b4a2e', { label: 'Filter media (wood chip)' });
const duct = param('duct', '#a9b2b4', { label: 'Ductwork and humidifier (galvanised / FRP)' });
const fan = param('fan', '#2f6b4f', { label: 'Fan and pumps (paint)' });
const cells = param('cells', 'two', { choices: ['one', 'two'], label: 'Media cells' });

presets({
  organics: { concrete: '#a7a39a', media: '#6b4a2e', duct: '#a9b2b4', fan: '#2f6b4f' },
  weathered: { concrete: '#8c887e', media: '#4f3a28', duct: '#8e9592', fan: '#4d6655' },
  fibreglass: { concrete: '#b3aea3', media: '#7a5634', duct: '#c9c2a2', fan: '#2f5d9a' },
  highVisibility: { concrete: '#c2beb3', media: '#8a5d34', duct: '#d0d6d8', fan: '#e07a2a' },
});

const p = assembly("biofilter-bed");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rodX = (x0: number, x1: number, y: number, z: number, r: number, seg = 12) => cylinder(x1 - x0, r, seg).rotateY(90).translate(x0, y, z);
const rodY = (x: number, y0: number, y1: number, z: number, r: number, seg = 12) => cylinder(y1 - y0, r, seg).rotateX(-90).translate(x, y0, z);

// Concrete bed: outer walls with the media mounded inside.
const L = 8000, W = 3800, WH = 1600, T = 220;
add("bed", blk(0, 0, 0, L, W, WH).subtract(blk(0, 0, 250, L - 2 * T, W - 2 * T, WH)).color(concrete));
add("wall-coping", blk(0, -W / 2 + T / 2, WH, L, T + 40, 40).color(concrete));
const two = cells.value === 'two';
if (two) add("cell-divider", blk(0, 0, 250, T, W - 2 * T, WH - 250).color(concrete));
add("media-fill", blk(0, 0, 250, L - 2 * T, W - 2 * T, WH - 450).color(media));
const mounds = two ? [-L / 4, L / 4] : [0];
mounds.forEach((x, i) => add(`media-mound-${i}`, sphere(1000).scale([(two ? L / 2 - 260 : L - 2 * T) / 2000, (W - 2 * T) / 2000, 0.32]).translate(x, 0, WH - 200).color(media)));

// Loose chips on the surface give the media its texture.
let seed = 17;
const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
const chipTones = ['#8a6440', '#4f3620', '#a07a4c', '#5d4228'];
for (let k = 0; k < 40; k++) {
  const x = (rnd() - 0.5) * (L - 900), y = (rnd() - 0.5) * (W - 1100);
  add(`chip-${k}`, box(180 + rnd() * 160, 60 + rnd() * 50, 30, true).rotateZ(rnd() * 180).rotateX(rnd() * 30)
    .translate(x, y, WH - 200 + 300 * Math.sqrt(Math.max(0, 1 - (y / (W / 2 - 300)) ** 2))).color(chipTones[k % 4]));
}

// Irrigation lines across the top with sprinkler risers on stakes.
for (const y of [-900, 0, 900]) {
  add(`irrigation-${y + 1000}`, rodX(-L / 2 + T, L / 2 - T, y, WH + 260, 30, 8).color('#2a2c2e'));
  for (const x of [-3000, -1500, 0, 1500, 3000]) {
    add(`stake-${y + 1000}-${x + 4000}`, blk(x, y, WH - 150, 40, 40, 380).color('#5d6366'));
    add(`sprinkler-${y + 1000}-${x + 4000}`, cylinder(90, 26, 8).translate(x, y, WH + 290).color('#2f5d9a'));
  }
}
add("irrigation-header", rodY(-L / 2 + 120, -W / 2 + 60, W / 2 - 60, WH + 260, 40, 8).color('#2a2c2e'));
add("solenoid-valve", blk(-L / 2 + 120, -W / 2 + 120, WH + 200, 160, 160, 160).color(fan));

// Drain trough along the front wall with a sump outlet.
add("drain-trough", blk(0, -W / 2 - 200, 0, L, 360, 180).subtract(blk(0, -W / 2 - 200, 60, L - 80, 280, 200)).color(concrete));
add("drain-water", blk(0, -W / 2 - 200, 60, L - 80, 280, 50).color('#4a5a4c'));
for (let k = 0; k < 6; k++) add(`weep-pipe-${k}`, rodY(-L / 2 + 700 + k * 1320, -W / 2 - 60, -W / 2 + 10, 300, 45, 8).color('#2a2c2e'));
add("sump", blk(L / 2 + 400, -W / 2 - 200, 0, 700, 700, 450).color(concrete));
add("sump-lid", blk(L / 2 + 400, -W / 2 - 200, 450, 640, 640, 30).color('#5d6366'));
add("sump-pump-riser", cylinder(700, 50, 8).translate(L / 2 + 400, -W / 2 - 200, 480).color(fan));

// Fan, pre-humidifier tower and inlet duct into the plenum at the -X end.
const HX = -L / 2 - 1300, HY = 600, HR = 700, HH = 3400;
add("humidifier-tower", cylinder(HH, HR, 20).color(duct).translate(HX, HY, 0));
add("humidifier-cap", sphere(HR).scale([1, 1, 0.35]).translate(HX, HY, HH).color(duct));
add("humidifier-band-low", cylinder(80, HR + 25, 20).translate(HX, HY, 900).color(fan));
add("humidifier-band-high", cylinder(80, HR + 25, 20).translate(HX, HY, 2600).color(fan));
add("humidifier-hatch", blk(HX - HR + 30, HY, 1300, 80, 600, 800).color('#5d6366'));
add("plenum-duct", rodX(HX + HR - 50, -L / 2 + 40, HY, 560, 320, 14).color(duct));
add("duct-flange", rodX(-L / 2 - 120, -L / 2 - 40, HY, 560, 380, 14).color(duct));
const FY = -1500;
add("fan-skid", blk(HX, FY, 0, 1500, 1300, 150).color('#3a3f42'));
add("fan-scroll", rodY(HX, FY - 250, FY + 250, 1000, 720, 18).color(fan));
add("fan-outlet", blk(HX + 300, FY + 300, 1300, 700, 500, 700).color(fan));
add("fan-to-tower", rodY(HX, FY + 500, HY - HR + 60, 1650, 260, 14).color(duct));
add("fan-elbow", sphere(270).translate(HX, FY + 500, 1650).color(duct));
add("fan-motor", rodY(HX, FY - 760, FY - 260, 1000, 260, 14).color(fan));
add("motor-fins", rodY(HX, FY - 700, FY - 560, 1000, 285, 14).color('#2b2f33'));
add("fan-intake", cylinder(2300, 380, 14).translate(HX - 900, FY, 0).color(duct));
add("intake-bend", rodX(HX - 900, HX - 400, FY, 1000, 380, 14).color(duct));
add("intake-cowl", sphere(400).scale([1, 1, 0.45]).translate(HX - 900, FY, 2300).color(duct));

// Sampling hood on the media where emissions are tested.
add("sampling-hood", sphere(500).scale([1, 1, 0.5]).subtract(blk(0, 0, -400, 1200, 1200, 400)).translate(L / 2 - 1300, 600, WH + 110).color('#d8dad6'));
add("sampling-stack", cylinder(450, 60, 10).translate(L / 2 - 1300, 600, WH + 330).color('#d8dad6'));

// Warning sign on the front wall.
add("sign", blk(-1400, -W / 2 - 14, 900, 900, 16, 500).color('#f2f2ee'));
add("sign-band", blk(-1400, -W / 2 - 24, 1260, 900, 12, 130).color(fan));

return p.model();
