// SPDX-License-Identifier: CC0-1.0
// Truck wheel-wash station: the drive-through bath that cleans mud off a
// tipper's wheels before it leaves a recovery site for the public road. What
// makes it a wheel wash rather than a slab: a galvanised steel platform with
// ramped ends and a deck of open grating the wheels roll over, raised side
// walls carrying angled spray bars with nozzle rows aimed at the tyres, a
// settlement tank alongside with a sludge hopper and drain valve, a pump
// set feeding the spray bars through a pipe loop, and a control panel on a
// post at the driver's window height.
// Generic visualization geometry for a compact 4 m bath with 0.9 m ramps,
// millimetres, Z up, trucks drive along X, tank on +Y, panel on -Y.

meta({
  name: "truck-wheel-wash",
  license: 'CC0-1.0',
  title: "Truck wheel-wash station",
  description: "Drive-through truck wheel wash: galvanised platform with ramped ends and open grating deck, side walls with angled spray bars and nozzle rows, settlement tank with sludge hopper and drain valve, pump set and pipe loop, driver-height control panel on a post. Material controls: platform steel, settlement tank, pipework and control panel. Optional spray jets shown running. galvanised, contractorGreen and muddy presets.",
  tags: ['wheel wash', 'truck wash', 'wheel bath', 'spray bar', 'settlement tank', 'site exit', 'reception', 'recycling', 'materials recovery', 'waste management', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const platform = param('platform', '#a3abad', { label: 'Platform and grating (galvanised)' });
const tank = param('tank', '#2f6a9a', { label: 'Settlement tank (painted steel)' });
const pipework = param('pipework', '#d5862b', { label: 'Pipework and pump' });
const panel = param('panel', '#e6e3da', { label: 'Control panel' });
const spraying = param('spraying', true, { label: 'Spray jets running' });

presets({
  galvanised: { platform: '#a3abad', tank: '#2f6a9a', pipework: '#d5862b', panel: '#e6e3da' },
  contractorGreen: { platform: '#a3abad', tank: '#3d6b3a', pipework: '#e2c22a', panel: '#d9d6cc' },
  muddy: { platform: '#7d6a52', tank: '#4d5a52', pipework: '#9a6a3a', panel: '#b5ab96' },
});

const p = assembly("truck-wheel-wash");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Side profile in (x, z), extruded across Y from y0 to y1.
const profileXZ = (pts: number[][], y0: number, y1: number) => extrudePolygon(pts, y1 - y0).rotateX(90).translate(0, y1, 0);

const BL = 4000;
const BW = 2000;
const DZ = 240;
const RL = 900;

// Platform: deck frame plus ramps at each end.
add("deck-frame", blk(0, 0, 0, BL, BW, DZ).subtract(blk(0, 0, 60, BL - 120, BW - 120, DZ)).color(platform));
add("ramp-in", profileXZ([[-BL / 2 - RL, 0], [-BL / 2, 0], [-BL / 2, DZ]], -BW / 2, BW / 2).color(platform));
add("ramp-out", profileXZ([[BL / 2, 0], [BL / 2 + RL, 0], [BL / 2, DZ]], -BW / 2, BW / 2).color(platform));
for (let i = 0; i < 6; i++) add(`ramp-cleat-in-${i}`, blk(-BL / 2 - RL + 110 + i * 140, 0, 4 + (i * 140 + 110) * DZ / RL - 10, 30, BW - 80, 20).color('#6f7578'));
for (let i = 0; i < 6; i++) add(`ramp-cleat-out-${i}`, blk(BL / 2 + RL - 110 - i * 140, 0, 4 + (i * 140 + 110) * DZ / RL - 10, 30, BW - 80, 20).color('#6f7578'));
// Open grating bars running across the lane.
for (let i = 0; i < 26; i++) add(`grate-${i}`, blk(-BL / 2 + 100 + i * 152, 0, DZ - 50, 26, BW - 120, 50).color(platform));
add("water-bath", blk(0, 0, 60, BL - 120, BW - 120, 80).color('#5b6a62'));

// Side walls with spray bars aimed in and down at the tyres.
const WH = 900;
for (const s of [-1, 1]) {
  const y = s * (BW / 2 + 60);
  add(`side-wall-${s}`, blk(0, y, 0, BL, 120, WH).color(platform));
  add(`wall-cap-${s}`, blk(0, y, WH, BL + 40, 180, 30).color('#6f7578'));
  for (let i = 0; i < 2; i++) {
    const z = 360 + i * 260;
    add(`spray-bar-${s}-${i}`, cylinder(BL - 400, 30, 10).rotateY(90).translate(-BL / 2 + 200, y - s * 90, z).color(pipework));
    for (let n = 0; n < 9; n++) {
      const x = -BL / 2 + 400 + n * 400;
      add(`nozzle-${s}-${i}-${n}`, cylinder(70, 14, 8).rotateX(s * (90 + 25)).translate(x, y - s * 110, z).color('#3a3c3e'));
      if (spraying.value && i === 0 && n % 2 === 0) add(`jet-${s}-${n}`, cylinder(320, 30, 6).rotateX(s * (90 + 30)).translate(x, y - s * 170, z - 30).color('#bfe3f2'));
    }
  }
}
// Floor spray bar under the grating.
add("floor-spray-bar", cylinder(BL - 400, 34, 10).rotateY(90).translate(-BL / 2 + 200, 0, 110).color(pipework));

// Settlement tank on the +Y side, with sludge hopper and drain valve.
const TY = BW / 2 + 1200;
const TW = 1600;
add("tank-body", blk(0, TY, 700, 3000, TW, 1300).color(tank));
add("tank-hopper", profileXZ([[-1500, 700], [1500, 700], [300, 200], [-300, 200]], TY - TW / 2, TY + TW / 2).color(tank));
for (const x of [-1300, 1300]) for (const y of [TY - 650, TY + 650]) add(`tank-leg-${x}-${y}`, blk(x, y, 0, 120, 120, 700).color(tank));
add("tank-water", blk(0, TY, 1990, 2900, TW - 100, 20).color('#5b6a62'));
add("tank-rim", blk(0, TY, 2000, 3060, TW + 60, 50).subtract(blk(0, TY, 1980, 2900, TW - 100, 100)).color(platform));
for (const x of [-750, 0, 750]) add(`tank-rib-${x}`, blk(x, TY - TW / 2 - 15, 700, 60, 30, 1300).color(tank));
add("drain-pipe", cylinder(220, 50, 12).translate(0, TY, 0).color(pipework));
add("drain-valve", blk(0, TY - 120, 60, 140, 120, 120).color('#2b2d2f'));
add("drain-wheel", torus(70, 10, 14).rotateX(90).translate(0, TY - 190, 120).color('#c23b2c'));

// Pump set on a skid between the tank and the wall, and the pipe loop.
const PX = -BL / 2 + 700;
const PY = BW / 2 + 260;
add("pump-skid", blk(PX, PY + 120, 0, 700, 360, 60).color('#6f7578'));
add("pump-motor", cylinder(380, 140, 16).rotateY(90).translate(PX - 300, PY + 120, 220).color(tank));
add("pump-volute", cylinder(160, 170, 16).rotateY(90).translate(PX + 80, PY + 120, 220).color(pipework));
add("pump-riser", cylinder(480, 44, 12).translate(PX + 160, PY + 120, 220).color(pipework));
add("pump-header", cylinder(320, 44, 12).rotateX(90).translate(PX + 160, PY + 140, 700).color(pipework));
add("suction-pipe", cylinder(PX + 1500 - 160, 44, 12).rotateY(-90).translate(-1500 + 0, PY + 300, 300).color(pipework));

// Control panel on a post at driver-window height, on the -Y side.
const KX = BL / 2 - 400;
const KY = -BW / 2 - 700;
add("panel-foot", blk(KX, KY, 0, 300, 300, 30).color('#6f7578'));
add("panel-post", blk(KX, KY, 30, 100, 100, 1700).color(platform));
add("panel-box", extrudeRoundedRect(500, 600, 30, 260, { axis: 'y' }).translate(KX, KY - 130, 1900).color(panel));
add("panel-hood", blk(KX, KY - 30, 2200, 580, 360, 30).color(platform));
add("panel-start", cylinder(20, 40, 12).rotateX(90).translate(KX - 120, KY - 130, 2060).color('#3a9a3a'));
add("panel-stop", cylinder(20, 50, 12).rotateX(90).translate(KX + 120, KY - 130, 2060).color('#c23b2c'));
add("panel-screen", blk(KX, KY - 132, 1760, 300, 4, 160).color('#1d2a24'));

return p.model();
