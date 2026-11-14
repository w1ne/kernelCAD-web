// SPDX-License-Identifier: CC0-1.0
// Beverage carbonation vessel: the pressure tank where chilled product picks up
// CO2 before the filler. What makes it this thing: a tall revolved stainless
// shell with dished pressure heads (or a cone bottom that drains clean), an
// insulated jacket band with stiffener rings, three splayed sanitary legs on
// adjustable ball feet, a clamped top manway, a CO2 line running down the
// side to a sparger inlet near the bottom, a sight-glass level tube, a dial
// pressure gauge and a relief valve on the top head.
// Generic visualization geometry at real size, millimetres, Z up, feet on
// z = 0, gauge and sight glass face -Y.
meta({
  name: "carbonation-vessel",
  license: 'CC0-1.0',
  title: "Beverage carbonation vessel",
  description: "Sanitary carbonation pressure vessel: revolved stainless shell with dished top head and a dished or cone bottom, insulated jacket with stiffener rings, three splayed legs on ball feet, clamped manway, CO2 line to a sparger inlet, sight-glass level tube, dial pressure gauge and relief valve. Material controls: stainless steel, painted jacket, food-grade polymer, safety paint. Bottom-head choice; sanitaryLine and legacyPlant presets.",
  tags: ['beverage bottling', 'packaging line', 'food manufacturing', 'pressure vessel', 'tank', 'carbonation', 'CO2', 'low poly', 'CC0'],
  kit: 'beverage-bottling-line',
  category: 'structure',
  origin: 'base',
  compat: ['beverage-bottling-line', 'factory', 'food-manufacturing', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.3, step: 0.05 });
const bottom = param('bottom', 'dished', { choices: ['dished', 'cone'], label: 'Bottom head' });
const stainlessSteel = param('stainlessSteel', '#aebdc1', { label: 'Stainless steel' });
const powderCoat = param('powderCoat', '#397e91', { label: 'Painted insulation jacket' });
const foodPolymer = param('foodPolymer', '#3999a1', { label: 'Food-grade polymer: sight glass, gauge face, gaskets' });
const safetyPaint = param('safetyPaint', '#e3a331', { label: 'Safety paint: CO2 line and relief valve' });

presets({
  sanitaryLine: { stainlessSteel: '#d2dfe1', powderCoat: '#4b95a4', foodPolymer: '#2c828c', safetyPaint: '#f0b336' },
  legacyPlant: { stainlessSteel: '#858f91', powderCoat: '#315b70', foodPolymer: '#286c75', safetyPaint: '#bd7b24' },
});

const p = assembly("carbonation-vessel");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Round polygon of n points.
const circle = (r, n = 12) => Array.from({ length: n }, (_, i) => {
  const t = ((i + 0.5) / n) * Math.PI * 2;
  return [r * Math.cos(t), r * Math.sin(t)];
});
// Revolve an (r, z) profile about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Rod from p0 to p1 with an n-sided section.
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
// Flat ring of outer radius r, width w, thickness t at height z.
const ring = (r, w, t, z) => extrudePolygon(circle(r, 18), t).subtract(extrudePolygon(circle(r - w, 18), t + 10).translate(0, 0, -5)).translate(0, 0, z);

// Shell: straight wall from zLow to zTop with dished heads; cone bottom drops lower and steeper.
const R = 360;
const zTop = 1560;
const cone = bottom.value === 'cone';
const zLow = cone ? 700 : 560;
const bottomHead = cone ? [[0, 360], [50, 360], [R, zLow]] : [[0, 470], [160, 480], [270, 505], [335, 530], [R, zLow]];
const topHead = [[R, zTop], [335, zTop + 30], [270, zTop + 55], [160, zTop + 80], [0, zTop + 90]];
add('shell', turned([...bottomHead, ...topHead]).color(stainlessSteel));

// Insulated jacket band with stiffener rings top and bottom.
add('insulation-jacket', turned([[R - 5, zLow + 120], [R + 22, zLow + 120], [R + 22, zTop - 120], [R - 5, zTop - 120]]).color(powderCoat));
for (const [k, z] of [[0, zLow + 110], [1, (zLow + zTop) * 0.5], [2, zTop - 130]]) add(`stiffener-ring-${k}`, ring(R + 34, 40, 20, z).color(stainlessSteel));

// Three splayed legs on ball feet, welded to pads on the shell.
const zPad = zLow + 40;
for (let i = 0; i < 3; i += 1) {
  const a = (i * 120 + 90) * Math.PI / 180;
  const [c, s] = [Math.cos(a), Math.sin(a)];
  add(`leg-${i}`, rod([440 * c, 440 * s, 60], [(R + 20) * c, (R + 20) * s, zPad + 80], 30, 10).color(stainlessSteel));
  add(`leg-pad-${i}`, box(30, 140, 220, true).translate(R + 10, 0, zPad + 40).rotateZ(i * 120 + 90).color(stainlessSteel));
  add(`ball-foot-${i}`, turned([[0, 0], [70, 0], [70, 14], [32, 40], [30, 70], [0, 70]]).translate(440 * c, 440 * s, 0).color(stainlessSteel));
}

// Bottom outlet with butterfly valve and handle under the low point.
const zOut = cone ? 360 : 470;
add('bottom-outlet', rod([0, 0, zOut], [0, 0, zOut - 150], 32, 12).color(stainlessSteel));
add('outlet-valve', cylinder(50, 58, 12).translate(0, 0, zOut - 150).color(stainlessSteel));
add('outlet-valve-handle', box(180, 24, 14, true).translate(80, 0, zOut - 110).color(foodPolymer));

// Top head: clamped manway with a handle, relief valve, gauge and product inlet.
add('manway-neck', cylinder(110, 150, 16).translate(-140, 0, zTop + 20).color(stainlessSteel));
add('manway-lid', turned([[0, 0], [170, 0], [170, 24], [120, 44], [0, 52]]).translate(-140, 0, zTop + 130).color(stainlessSteel));
add('manway-gasket', ring(165, 20, 10, zTop + 124).translate(-140, 0, 0).color(foodPolymer));
add('manway-handle', rod([-210, 0, zTop + 220], [-70, 0, zTop + 220], 10).color(stainlessSteel));
add('manway-handle-post-a', rod([-210, 0, zTop + 170], [-210, 0, zTop + 220], 10).color(stainlessSteel));
add('manway-handle-post-b', rod([-70, 0, zTop + 170], [-70, 0, zTop + 220], 10).color(stainlessSteel));
add('relief-valve-body', cylinder(110, 34, 10).translate(170, 80, zTop + 40).color(stainlessSteel));
add('relief-valve-cap', turned([[0, 0], [44, 0], [44, 30], [20, 60], [0, 60]]).translate(170, 80, zTop + 150).color(safetyPaint));
add('product-inlet', rod([120, -120, zTop + 50], [120, -120, zTop + 220], 32, 12).color(stainlessSteel));
add('product-inlet-elbow', rod([120, -120, zTop + 220], [120, -420, zTop + 220], 32, 12).color(stainlessSteel));

// Pressure gauge on a short stem facing -Y high on the shell.
add('gauge-stem', rod([0, -R - 10, zTop - 60], [0, -R - 90, zTop - 60], 10).color(stainlessSteel));
add('pressure-gauge', cylinder(40, 75, 18).rotateX(90).translate(0, -R - 90, zTop - 60).color(stainlessSteel));
add('gauge-face', cylinder(6, 64, 18).rotateX(90).translate(0, -R - 128, zTop - 60).color(foodPolymer));

// Sight-glass level tube on two side fittings.
const xs = 200;
const ys = -Math.sqrt(R * R - xs * xs) - 70;
add('sight-glass-fitting-low', rod([xs, ys + 60, zLow + 160], [xs, ys, zLow + 160], 18).color(stainlessSteel));
add('sight-glass-fitting-high', rod([xs, ys + 60, zTop - 180], [xs, ys, zTop - 180], 18).color(stainlessSteel));
add('sight-glass-tube', rod([xs, ys, zLow + 140], [xs, ys, zTop - 160], 20, 10).color(foodPolymer));

// CO2 line: down the +X side to a sparger inlet just above the bottom head.
const xc = R + 90;
add('co2-line-top', rod([R - 40, 0, zTop + 40], [xc, 0, zTop + 40], 18).color(safetyPaint));
add('co2-line-drop', rod([xc, 0, zTop + 40], [xc, 0, zLow + 70], 18).color(safetyPaint));
add('co2-sparger-inlet', rod([xc, 0, zLow + 70], [R - 10, 0, zLow + 70], 18).color(safetyPaint));
add('co2-regulator', box(80, 80, 120, true).translate(xc, 0, (zLow + zTop) * 0.5 + 200).color(stainlessSteel));
add('co2-regulator-dial', cylinder(10, 34, 12).rotateY(90).translate(xc + 40, 0, (zLow + zTop) * 0.5 + 220).color(foodPolymer));

// Nameplate on the jacket.
add('nameplate', box(160, 10, 100, true).rotateZ(-30).translate(-0.5 * (R + 25), -0.866 * (R + 25), zLow + 400).color(stainlessSteel));

return p.model();
