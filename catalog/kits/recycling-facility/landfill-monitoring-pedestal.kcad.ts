// SPDX-License-Identifier: CC0-1.0
// Landfill monitoring pedestal: the fixed station on a landfill perimeter
// that watches a gas and groundwater borehole around the clock and radios
// methane, carbon dioxide and water-level readings back to the site
// office, so gas migrating off site is caught early.
// What makes it a monitoring station: a concrete apron around the
// borehole, a hi-vis steel headworks cover with a hinged lid propped open
// over the HDPE well casing and its gas sampling tap, a sample line
// running to a steel pedestal cabinet on a post, the cabinet's window
// showing the gas analyser display, a tilted solar panel, a whip antenna,
// a status beacon and a borehole ID plate; three bollards guard it from
// site plant.
// Generic visualization geometry at about real size (2.0 m wide, 1.6 m
// deep, 2.6 m high), millimetres, Z up, cabinet window facing -Y.

meta({
  name: "landfill-monitoring-pedestal",
  license: 'CC0-1.0',
  title: "Landfill monitoring pedestal",
  description: "Landfill perimeter gas and groundwater monitoring station at about real size: concrete apron, hi-vis steel borehole headworks cover with lid open over the HDPE well casing and gas tap, sample line to a pedestal cabinet on a post with analyser display window, tilted solar panel, whip antenna, status beacon, ID plate and guard bollards. Material controls: cabinet and cover steel, concrete, well casing and solar glass. hiVis, councilGreen, stainless and weathered presets.",
  tags: ['landfill', 'landfill gas', 'monitoring', 'borehole', 'monitoring well', 'methane', 'groundwater', 'telemetry', 'solar panel', 'environmental monitoring', 'recycling', 'waste management', 'residuals', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cabinetSteel = param('cabinetSteel', '#e8b820', { label: 'Cabinet and headworks cover (painted steel)' });
const concrete = param('concrete', '#a9a59b', { label: 'Apron and bollard footings (concrete)' });
const casing = param('casing', '#2b2d2f', { label: 'Well casing and sample line (HDPE)' });
const solarGlass = param('solarGlass', '#24447a', { label: 'Solar panel and display (glass)' });

presets({
  hiVis: { cabinetSteel: '#e8b820', concrete: '#a9a59b', casing: '#2b2d2f', solarGlass: '#24447a' },
  councilGreen: { cabinetSteel: '#3f7a4a', concrete: '#b3afa5', casing: '#2b2d2f', solarGlass: '#24447a' },
  stainless: { cabinetSteel: '#b8bfc2', concrete: '#c2bdb1', casing: '#3a5f8a', solarGlass: '#1d2f55' },
  weathered: { cabinetSteel: '#a88a3a', concrete: '#8a857a', casing: '#3a3a36', solarGlass: '#2f3f5a' },
});

const p = assembly("landfill-monitoring-pedestal");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).translate(x, y, z);
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).rotateX(-90).translate(x, y, z);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};

// Concrete apron around the borehole and the pedestal.
add("apron", blk(0, 0, 0, 1700, 1300, 100).color(concrete));
add("apron-chamfer", blk(0, 0, 100, 1640, 1240, 20).color(concrete));

// Borehole headworks: casing, gas tap and a hi-vis cover with its lid open.
const BX = -420, BY = -120, CZ = 120;
add("headworks-cover", cylZ(BX, BY, CZ, 560, 200, 18).subtract(cylZ(BX, BY, CZ + 20, 600, 180, 18)).color(cabinetSteel));
add("cover-band", cylZ(BX, BY, CZ + 380, 60, 204, 18).color('#1d2023'));
add("well-casing", cylZ(BX, BY, CZ, 640, 60, 14).color(casing));
add("casing-cap", cylZ(BX, BY, CZ + 640, 40, 75, 14).color(casing));
add("gas-tap", cylY(BX, BY - 150, CZ + 600, 90, 18, 8).color('#c3c8cb'));
add("gas-tap-valve", blk(BX, BY - 150, CZ + 570, 50, 40, 60).color('#c0392b'));
add("dip-tape-reel", cylY(BX + 60, BY + 40, CZ + 500, 30, 50, 12).color('#e6e2d6'));
// Lid hinged at the back, swung up past vertical.
add("cover-lid", cylZ(0, -200, -15, 30, 210, 18).rotateX(-100).translate(BX, BY + 200, CZ + 560).color(cabinetSteel));
add("lid-id-plate", blk(0, -200, -25, 200, 120, 6).rotateX(-100).translate(BX, BY + 198, CZ + 560).color('#f2f2ec'));
add("cover-hasp", blk(BX, BY - 210, CZ + 470, 50, 20, 70).color('#2f3437'));

// Sample line from the tap to the cabinet.
const PX = 330, PY = 120, PZ = 1200;
add("sample-line-a", rod([BX, BY - 240, CZ + 600], [BX + 60, BY - 260, CZ + 300], 14).color(casing));
add("sample-line-b", rod([BX + 60, BY - 260, CZ + 300], [PX - 200, PY - 260, CZ + 260], 14).color(casing));
add("sample-line-c", rod([PX - 200, PY - 260, CZ + 260], [PX - 200, PY - 200, PZ + 100], 14).color(casing));

// Pedestal post and analyser cabinet.
add("post", blk(PX, PY + 100, 120, 120, 120, 2100).color('#7e8487'));
add("post-base", blk(PX, PY + 100, 120, 300, 300, 20).color('#7e8487'));
add("cabinet", blk(PX, PY - 60, PZ, 600, 300, 700).color(cabinetSteel));
add("cabinet-hood", blk(PX, PY - 80, PZ + 700, 680, 380, 40).color(cabinetSteel));
add("cabinet-door-gap", blk(PX, PY - 211, PZ + 25, 550, 2, 650).color('#2f3437'));
add("cabinet-door", blk(PX, PY - 214, PZ + 30, 540, 4, 640).color(cabinetSteel));
add("display-window", blk(PX - 60, PY - 216, PZ + 380, 320, 6, 220).color('#1d2023'));
add("display-screen", blk(PX - 60, PY - 220, PZ + 400, 260, 4, 160).color(solarGlass));
for (let i = 0; i < 3; i++) add(`display-bar-${i}`, blk(PX - 120 + i * 50, PY - 223, PZ + 420, 30, 3, 40 + i * 40).color('#7ee08a'));
add("door-handle", blk(PX + 230, PY - 222, PZ + 300, 30, 20, 140).color('#2f3437'));
add("id-plate", blk(PX + 60, PY - 216, PZ + 120, 300, 4, 120).color('#f2f2ec'));
add("id-plate-text", blk(PX + 60, PY - 219, PZ + 160, 240, 3, 40).color('#1d2023'));
add("vent-grille", blk(PX + 160, PY - 216, PZ + 500, 120, 4, 120).color('#5d6366'));

// Solar panel on an arm, tilted toward -Y, plus antenna and beacon.
const SZ = 2320;
add("solar-arm", blk(PX, PY + 100, SZ - 120, 80, 80, 120).color('#7e8487'));
add("solar-frame", blk(0, 0, -30, 900, 640, 30).rotateX(35).translate(PX, PY + 80, SZ).color('#c3c8cb'));
add("solar-panel", blk(0, 0, 0, 860, 600, 12).rotateX(35).translate(PX, PY + 80, SZ).color(solarGlass));
for (let i = 1; i < 4; i++) add(`solar-cell-line-${i}`, blk(-430 + i * 215, 0, 10, 8, 600, 4).rotateX(35).translate(PX, PY + 80, SZ).color('#c3c8cb'));
add("antenna-base", cylZ(PX + 250, PY - 60, PZ + 740, 40, 30, 10).color('#2f3437'));
add("antenna", cylZ(PX + 250, PY - 60, PZ + 780, 700, 8, 6).color('#1d2023'));
add("beacon", cylZ(PX - 230, PY - 60, PZ + 740, 110, 50, 14).color('#f07a1a'));

// Guard bollards.
for (const [x, y] of [[-1000, 250], [0, -760], [860, -720]]) {
  add(`bollard-${x}`, cylZ(x, y, 0, 1000, 70, 12).color(cabinetSteel));
  add(`bollard-band-${x}`, cylZ(x, y, 780, 90, 72, 12).color('#1d2023'));
  add(`bollard-cap-${x}`, cylZ(x, y, 1000, 30, 60, 12).color('#1d2023'));
}

return p.model();
