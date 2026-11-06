// SPDX-License-Identifier: CC0-1.0
// Pallet stretch wrapper: the end-of-line machine that spins a pallet of cases
// on a turntable while a film carriage climbs a mast, wrapping the load in
// stretch film. What makes it read as a wrapper: the low round turntable in a
// square base with a loading ramp, the tall mast beside it, the carriage with
// its film roll and two pre-stretch rollers, a web of film running to the
// load, and (mid-cycle) a timber pallet of corrugated cases wrapped up to the
// carriage with the top layers still bare.
// Generic visualization geometry at real size, millimetres, Z up, base on
// z = 0, ramp on -X, mast on +X.
meta({
  name: "stretch-wrapper",
  license: 'CC0-1.0',
  title: "Pallet stretch wrapper",
  description: "Turntable pallet stretch wrapper: round turntable in a square base with a loading ramp, tall mast with a film carriage carrying a film roll and pre-stretch rollers, film web, control cabinet and load-height photo-eye; mid-cycle with a timber pallet of corrugated cases partly wrapped. Material controls: stainless steel, powder-coated steel, stretch film, timber pallet and cases. Load choice; sanitaryLine and legacyPlant presets.",
  tags: ['beverage bottling', 'packaging line', 'food manufacturing', 'end of line', 'pallet', 'stretch wrap', 'turntable', 'low poly', 'CC0'],
  kit: 'beverage-bottling-line',
  category: 'structure',
  origin: 'base',
  compat: ['beverage-bottling-line', 'factory', 'food-manufacturing', 'warehouse', 'scene'],
  triangleBudget: 1200,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.3, step: 0.05 });
const load = param('load', 'wrapping', { choices: ['wrapping', 'empty'], label: 'Load on turntable' });
const stainlessSteel = param('stainlessSteel', '#aebdc1', { label: 'Stainless rollers and trim' });
const powderCoat = param('powderCoat', '#397e91', { label: 'Powder-coated steel' });
const foodPolymer = param('foodPolymer', '#c9dfe2', { label: 'Stretch film' });
const palletTimber = param('palletTimber', '#b8895a', { label: 'Timber pallet and corrugated cases' });

presets({
  sanitaryLine: { stainlessSteel: '#d2dfe1', powderCoat: '#4b95a4', foodPolymer: '#dcebee', palletTimber: '#c99b68' },
  legacyPlant: { stainlessSteel: '#858f91', powderCoat: '#315b70', foodPolymer: '#9fbcc0', palletTimber: '#8f6a45' },
});

const p = assembly("stretch-wrapper");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Revolve an (r, z) profile about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

// Square base frame, loading ramp on -X, low round turntable with a rim.
add('base-frame', box(1760, 1760, 70, true).translate(0, 0, 35).color(powderCoat));
add('loading-ramp', extrudePolygon([[-880, -600], [-880, 600], [-1280, 600], [-1280, -600]], 8).color(stainlessSteel));
add('ramp-wedge', path().moveTo(-880, 0).lineTo(-1280, 0).lineTo(-880, 70).close().extrude(1200).rotateX(90).translate(0, 600, 0).color(powderCoat));
add('turntable', turned([[0, 70], [820, 70], [830, 90], [830, 110], [0, 110]]).color(powderCoat));
add('turntable-deck', turned([[0, 110], [760, 110], [760, 116], [0, 116]]).color(stainlessSteel));

// Mast with base plate, cap and a cable-chain track; control cabinet at its foot.
const xm = 1100;
add('mast-base', box(420, 420, 30, true).translate(xm, 0, 15).color(powderCoat));
add('mast', box(200, 200, 2700, true).translate(xm, 0, 1380).color(powderCoat));
add('mast-cap', box(240, 240, 40, true).translate(xm, 0, 2750).color(powderCoat));
add('mast-guide-track', box(20, 120, 2500, true).translate(xm - 110, 0, 1350).color(stainlessSteel));
add('control-cabinet', box(260, 220, 520, true).translate(xm + 80, -360, 290).color(powderCoat));
add('control-panel-face', box(10, 160, 220, true).translate(xm - 55, -360, 420).color(stainlessSteel));
add('emergency-stop', cylinder(16, 22, 12).rotateY(-90).translate(xm - 60, -360, 330).color(palletTimber));

// Film carriage: cage on the mast with film roll and two pre-stretch rollers facing the load.
const wrapping = load.value === 'wrapping';
const zc = wrapping ? 700 : 420;
add('carriage-frame', box(340, 380, 60, true).translate(xm - 170, 0, zc).color(powderCoat));
add('carriage-top', box(340, 380, 60, true).translate(xm - 170, 0, zc + 560).color(powderCoat));
add('carriage-back', box(60, 380, 620, true).translate(xm - 40, 0, zc + 280).color(powderCoat));
add('film-roll', turned([[38, 0], [95, 0], [95, 500], [38, 500]]).translate(xm - 250, 110, zc + 30).color(foodPolymer));
add('film-core', cylinder(540, 36, 10).translate(xm - 250, 110, zc + 10).color(palletTimber));
for (const [i, y] of [-40, -140].entries()) add(`prestretch-roller-${i}`, cylinder(500, 38, 12).translate(xm - 230, y, zc + 30).color(stainlessSteel));
add('photo-eye', box(70, 60, 60, true).translate(xm - 330, -160, zc + 620).color(stainlessSteel));

// Timber pallet with a four-layer stack of corrugated cases; film wrapped up to the carriage.
if (wrapping) {
  const z0 = 116;
  for (let i = 0; i < 3; i += 1) add(`pallet-bottom-board-${i}`, box(1200, 100, 22, true).translate(0, (i - 1) * 440, z0 + 11).color(palletTimber));
  for (let i = 0; i < 3; i += 1) add(`pallet-stringer-${i}`, box(1200, 100, 78, true).translate(0, (i - 1) * 440, z0 + 61).color(palletTimber));
  for (let i = 0; i < 7; i += 1) add(`pallet-deck-board-${i}`, box(145, 1000, 22, true).translate(-525 + i * 175, 0, z0 + 111).color(palletTimber));
  const zl = z0 + 122;
  const layerH = 290;
  for (let layer = 0; layer < 4; layer += 1) {
    for (let cx = 0; cx < 3; cx += 1) {
      for (let cy = 0; cy < 2; cy += 1) {
        add(`case-${layer}-${cx}-${cy}`, box(388, 488, layerH - 8, true).translate(-394 + cx * 394, -246 + cy * 492, zl + layer * layerH + layerH * 0.5).color(palletTimber));
      }
    }
  }
  // Film: wrapped band from the pallet deck to the carriage, and the web from the roll to the load corner.
  const filmTop = zc + 380;
  add('stretch-film-wrap', box(1216, 1016, filmTop - (z0 + 60), true).translate(0, 0, (filmTop + z0 + 60) * 0.5).color(foodPolymer));
  const [rx, ry, lx, ly] = [xm - 250, 110, 608, 508];
  const webLen = Math.hypot(lx - rx, ly - ry);
  add('film-web', box(webLen, 4, 460, true).rotateZ(Math.atan2(ly - ry, lx - rx) * 180 / Math.PI).translate((rx + lx) * 0.5, (ry + ly) * 0.5, zc + 270).color(foodPolymer));
}

return p.model();
