// Solar carport canopy: a parking shade whose roof is a tilted photovoltaic array.
// What makes it a solar carport rather than a table of panels: steel I-section
// columns on concrete piers, sloped I-beam girders with C-purlins carrying
// fifteen framed modules in portrait, a drip gutter along the low edge, knee
// braces, wheel stops for two parking stalls and an EV charger on one column.
// Two structures: four posts, or a cantilever with one rear row of braced posts
// so cars can pull under without a column in the way.
// Generic visualization geometry at real size (about 5.8 x 5.2 m, 2.7-3.5 m
// clear), millimetres, Z up, piers on z = 0.
meta({
  name: 'solar-carport-canopy',
  license: 'CC0-1.0',
  title: 'Solar carport canopy',
  description: 'Two-stall solar carport: I-section steel columns on concrete piers, sloped I-beam girders and C-purlins carrying fifteen framed PV modules in portrait, drip gutter, knee braces, wheel stops and a column-mounted EV charger. Material controls: galvanized steel, frame aluminum, solar glass, concrete, charger housing. Structure four-post or cantilever; fieldService and highVisibility presets.',
  tags: ['solar carport', 'carport', 'parking canopy', 'photovoltaic', 'EV charging', 'solar energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const structure = param('structure', 'four-post', { choices: ['four-post', 'cantilever'], label: 'Structure' });
const galvanizedSteel = param('galvanizedSteel', '#748184', { label: 'Galvanized steel columns, girders and purlins' });
const aluminum = param('aluminum', '#b7c1c4', { label: 'Module frame and gutter aluminum' });
const solarGlass = param('solarGlass', '#244a68', { label: 'Solar glass' });
const concrete = param('concrete', '#b3ada2', { label: 'Concrete piers and wheel stops' });
const chargerPlastic = param('chargerPlastic', '#2f8f6a', { label: 'EV charger housing' });
presets({
  fieldService: { galvanizedSteel: '#68787b', aluminum: '#a9b5b9', solarGlass: '#1e4668', concrete: '#a39d92', chargerPlastic: '#3a6f9c' },
  highVisibility: { galvanizedSteel: '#536367', aluminum: '#d4dcdf', solarGlass: '#183a5b', concrete: '#c4beb2', chargerPlastic: '#e0a31f' },
});

const p = assembly("solar-carport-canopy");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Solid along +Y from y0 for length len, with an XZ-plane cross-section given as [x, z] points.
const alongY = (pts, y0, len) => extrudePolygon(pts, len).rotateX(90).translate(0, y0 + len, 0);
// Solid along +X from x0 for length len, with a YZ-plane cross-section given as [y, z] points.
const alongX = (pts, x0, len) => extrudePolygon(pts.map(([y, z]) => [-z, y]), len).rotateY(90).translate(x0, 0, 0);
// Rod from p0 to p1 with an n-sided section.
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const ring = Array.from({ length: n }, (_, i) => [r * Math.cos(((i + 0.5) / n) * Math.PI * 2), r * Math.sin(((i + 0.5) / n) * Math.PI * 2)]);
  return extrudePolygon(ring, len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

// Roof plane: girder tops at ZC over y = 0, falling 8 degrees toward +Y.
const SLOPE = 8;
const ZC = 3100;
const TAN = Math.tan((SLOPE * Math.PI) / 180);
// Place a part built flat in roof coordinates (s down-slope along +Y, z above girder top).
const onRoof = (shape) => shape.rotateX(-SLOPE).translate(0, 0, ZC);
const girderTop = (y) => ZC - y * TAN;

// Steel sections: I-beam (girder), C-purlin and wide-flange column.
const I_BEAM = [[-90, -300], [90, -300], [90, -286], [5, -286], [5, -14], [90, -14], [90, 0], [-90, 0], [-90, -14], [-5, -14], [-5, -286], [-90, -286]];
const C_PURLIN = [[-40, 0], [40, 0], [40, 14], [-28, 14], [-28, 136], [40, 136], [40, 150], [-40, 150]];
const W_COLUMN = [[-100, -100], [100, -100], [100, -86], [6, -86], [6, 86], [100, 86], [100, 100], [-100, 100], [-100, 86], [-6, 86], [-6, -86], [-100, -86]];

// Girders on the two column lines, the purlins across them, and the low-edge gutter.
const GX = 2300;
const SPAN = 5300;
for (const x of [-GX, GX]) {
  add(`girder-${x < 0 ? 'left' : 'right'}`, onRoof(alongY(I_BEAM, -SPAN / 2, SPAN).translate(x, 0, 0)).color(galvanizedSteel));
}
const ROWS = [-1742, 0, 1742];
ROWS.flatMap((s) => [s - 450, s + 450]).forEach((s, i) => {
  add(`purlin-${i}`, onRoof(alongX(C_PURLIN, -2950, 5900).translate(0, s, 0)).color(galvanizedSteel));
});
add('drip-gutter', onRoof(alongX([[0, 60], [0, 200], [16, 200], [16, 76], [140, 76], [140, 200], [156, 200], [156, 60]], -2950, 5900).translate(0, SPAN / 2 - 40, 0)).color(aluminum));

// Fifteen portrait modules: aluminium frame, glass, and a cell-string seam.
ROWS.forEach((s, r) => {
  for (let c = 0; c < 5; c += 1) {
    const x = (c - 2) * 1154;
    add(`module-${r}-${c}-frame`, onRoof(box(1134, 1722, 35, true).translate(x, s, 167.5)).color(aluminum));
    add(`module-${r}-${c}-glass`, onRoof(box(1094, 1682, 4, true).translate(x, s, 186)).color(solarGlass));
    add(`module-${r}-${c}-seam`, onRoof(box(1094, 10, 2, true).translate(x, s, 189)).color(aluminum));
  }
});

// Columns: four posts, or one braced rear row for a cantilevered roof.
const cantilever = structure.value === 'cantilever';
const COLS = cantilever ? [-1500] : [-1900, 1900];
for (const x of [-GX, GX]) {
  for (const y of COLS) {
    const k = `${x < 0 ? 'left' : 'right'}-${y < 0 ? 'rear' : 'front'}`;
    const top = girderTop(y) - 280;
    add(`pier-${k}`, rod([x, y, 0], [x, y, 300], 300, 12).color(concrete));
    add(`base-plate-${k}`, box(380, 380, 25, true).translate(x, y, 312).color(galvanizedSteel));
    add(`column-${k}`, extrudePolygon(W_COLUMN, top - 325).translate(x, y, 325).color(galvanizedSteel));
    add(`column-cap-${k}`, box(260, 260, 20, true).translate(x, y, top + 10).color(galvanizedSteel));
    if (cantilever) {
      // Long raking strut out to the cantilevered girder, plus a short back brace.
      add(`strut-${k}`, rod([x, y + 90, top - 1500], [x, 1500, girderTop(1500) - 300], 55, 8).color(galvanizedSteel));
      add(`back-brace-${k}`, rod([x, y - 90, top - 600], [x, -2400, girderTop(-2400) - 300], 40, 8).color(galvanizedSteel));
    } else {
      const toward = y < 0 ? 1 : -1;
      add(`knee-brace-${k}`, rod([x, y + toward * 90, top - 700], [x, y + toward * 900, girderTop(y + toward * 900) - 300], 40, 8).color(galvanizedSteel));
    }
  }
}

// Two parking stalls: a wheel stop each at the rear.
for (const x of [-1350, 1350]) {
  add(`wheel-stop-${x < 0 ? 'left' : 'right'}`, alongX([[-80, 0], [80, 0], [50, 110], [-50, 110]], x - 900, 1800).translate(0, -2250, 0).color(concrete));
}

// EV charger on the right rear column, facing the stall.
const CY = COLS[0];
const CX = GX - 100 - 95;
add('ev-charger-housing', box(190, 300, 520, true).translate(CX, CY, 1350).color(chargerPlastic));
add('ev-charger-screen', box(6, 180, 130, true).translate(CX - 98, CY, 1480).color(solarGlass));
add('ev-charger-holster', box(70, 110, 140, true).translate(CX - 125, CY, 1230).color(galvanizedSteel));
// Charging cable hanging in a loop from the housing to the holstered plug.
const LOOP = [[CX - 60, CY + 110, 1100], [CX - 190, CY + 170, 660], [CX - 190, CY - 70, 650], [CX - 130, CY - 30, 1170]];
LOOP.slice(1).forEach((q, i) => {
  add(`ev-charger-cable-${i}`, rod(LOOP[i], q, 20, 6).color(galvanizedSteel));
});

return p.model();
