// String inverter: converts the DC from several PV module strings into grid AC,
// mounted out in the array field on its own strut stand.
// What makes it a string inverter rather than a cabinet: a shallow sealed
// enclosure with a chamfered front, a finned heat sink behind it, a sun and rain
// hood over the top, an LED status strip and small display on the front, a row
// of paired MC4 string connectors and DC isolator knobs along the underside,
// cable glands with cables dropping to a ground conduit, and a galvanized
// two-post unistrut stand with foot plates.
// Generic visualization geometry at real size (commercial unit about 0.76 m
// wide, utility unit about 1.05 m), millimetres, Z up, stand feet on z = 0.
meta({
  name: 'string-inverter',
  license: 'CC0-1.0',
  title: 'String inverter',
  description: 'Field-mounted PV string inverter on a galvanized two-post strut stand: chamfered sealed enclosure, finned rear heat sink, sun and rain hood, LED status strip and display, paired MC4 string connectors, DC isolator knobs, cable glands and cables to a ground conduit. Material controls: stainless and galvanized steel, enclosure powder coat, display glass, rubber, isolator polymer. Rating commercial or utility; fieldService and highVisibility presets.',
  tags: ['string inverter', 'solar inverter', 'PV inverter', 'MC4', 'photovoltaic', 'solar energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const rating = param('rating', 'utility', { choices: ['commercial', 'utility'], label: 'Inverter rating' });
const stainlessSteel = param('stainlessSteel', '#c3caca', { label: 'Stainless hood, heat sink and galvanized stand' });
const powderCoat = param('powderCoat', '#dfe3e1', { label: 'Enclosure powder coat' });
const displayGlass = param('displayGlass', '#24515d', { label: 'Display and LED strip glass' });
const rubber = param('rubber', '#262c2e', { label: 'Cables, glands and connectors rubber' });
const isolatorPolymer = param('isolatorPolymer', '#c8352b', { label: 'DC isolator knob polymer' });
presets({
  fieldService: { stainlessSteel: '#abb5b7', powderCoat: '#c9cec9', displayGlass: '#376a73', rubber: '#282d2e', isolatorPolymer: '#c8352b' },
  highVisibility: { stainlessSteel: '#e0e5e4', powderCoat: '#d1722b', displayGlass: '#167d95', rubber: '#232728', isolatorPolymer: '#f2c230' },
});

const p = assembly("string-inverter");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Solid along +X from x0 for length len, with a YZ-plane cross-section given as [y, z] points.
const alongX = (pts, x0, len) => extrudePolygon(pts.map(([y, z]) => [-z, y]), len).rotateY(90).translate(x0, 0, 0);
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
  const ring = Array.from({ length: n }, (_, i) => [r * Math.cos(((i + 0.5) / n) * Math.PI * 2), r * Math.sin(((i + 0.5) / n) * Math.PI * 2)]);
  return extrudePolygon(ring, len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

// Enclosure size and string count by rating. Front faces -Y.
const utility = rating.value === 'utility';
const W = utility ? 1050 : 760;
const H = utility ? 700 : 560;
const STRINGS = utility ? 8 : 5;
const ZB = 760;
const ZT = ZB + H;

// Two-post unistrut stand with foot plates, rails and the hanger bracket.
const STRUT = [[-21, -21], [21, -21], [21, 21], [9, 21], [9, -9], [-9, -9], [-9, 21], [-21, 21]];
const PX = W / 2 - 120;
for (const x of [-PX, PX]) {
  const k = x < 0 ? 'left' : 'right';
  add(`stand-foot-${k}`, box(300, 420, 16, true).translate(x, 160, 8).color(stainlessSteel));
  add(`stand-post-${k}`, extrudePolygon(STRUT, ZT + 220).translate(x, 190, 16).color(stainlessSteel));
  add(`stand-brace-${k}`, rod([x, 190, 700], [x, 330, 20], 14, 6).color(stainlessSteel));
}
for (const [k, z] of [['upper', ZT - 90], ['lower', ZB + 110]]) {
  add(`stand-rail-${k}`, box(W + 100, 42, 42, true).translate(0, 190, z).color(stainlessSteel));
}

// Finned heat sink between the enclosure and the rails.
const FINS = Math.round(W / 70);
add('heat-sink-base', box(W - 60, 20, H - 60, true).translate(0, 145, ZB + H / 2).color(stainlessSteel));
for (let i = 0; i < FINS; i += 1) {
  add(`heat-sink-fin-${i}`, box(6, 30, H - 90, true).translate(-W / 2 + 60 + (i * (W - 120)) / (FINS - 1), 165, ZB + H / 2).color(stainlessSteel));
}

// Sealed enclosure: side profile with a chamfered front top and bottom.
add('inverter-body', alongX([[135, 0], [135, H], [-90, H], [-140, H - 60], [-140, 70], [-110, 0]], -W / 2, W).translate(0, 0, ZB).color(powderCoat));
add('front-cover', alongX([[-140, 90], [-140, H - 80], [-148, H - 90], [-148, 100]], -W / 2 + 40, W - 80).translate(0, 0, ZB).color(powderCoat));
add('led-status-strip', box(W * 0.42, 6, 18, true).translate(0, -150, ZB + H * 0.68).color(displayGlass));
add('display-window', box(150, 6, 90, true).translate(W * 0.28, -150, ZB + H * 0.52).color(displayGlass));
add('logo-band', box(W * 0.3, 4, 26, true).translate(-W * 0.22, -150, ZB + H * 0.52).color(stainlessSteel));

// Sun and rain hood, tilted to shed water forwards.
add('rain-hood', box(W + 80, 380, 10, true).rotateX(-7).translate(0, -10, ZT + 70).color(stainlessSteel));
add('rain-hood-lip', box(W + 80, 10, 70, true).translate(0, -200, ZT + 60).color(stainlessSteel));
for (const x of [-PX, PX]) {
  add(`rain-hood-arm-${x < 0 ? 'left' : 'right'}`, rod([x, 190, ZT + 110], [x, -150, ZT + 40], 10, 6).color(stainlessSteel));
}

// Underside: paired MC4 string connectors, DC isolators, cable glands and cables.
const X0 = -W / 2 + 70;
for (let i = 0; i < STRINGS; i += 1) {
  const x = X0 + i * 62;
  add(`mc4-plus-${i}`, rod([x, -70, ZB], [x, -70, ZB - 70], 11, 6).color(rubber));
  add(`mc4-minus-${i}`, rod([x, 0, ZB], [x, 0, ZB - 70], 11, 6).color(rubber));
}
const XS = X0 + STRINGS * 62 + 40;
for (let i = 0; i < 2; i += 1) {
  add(`dc-isolator-${i}`, turned([[0, 0], [34, 0], [34, 12], [26, 18], [26, 46], [0, 46]]).rotateX(180).translate(XS + i * 110, -50, ZB).color(isolatorPolymer));
  add(`dc-isolator-${i}-handle`, box(80, 18, 30, true).translate(XS + i * 110, -50, ZB - 52).color(isolatorPolymer));
}
const XG = W / 2 - 80;
add('ac-gland', turned([[0, 0], [38, 0], [38, 22], [30, 30], [30, 50], [0, 50]]).rotateX(180).translate(XG, -30, ZB).color(rubber));
add('comms-gland', turned([[0, 0], [20, 0], [20, 30], [0, 30]]).rotateX(180).translate(XG - 80, -30, ZB).color(rubber));
add('ac-cable', rod([XG, -30, ZB - 50], [XG - 40, 20, 200], 22, 8).color(rubber));
const XB = X0 + (STRINGS - 1) * 31;
add('string-cable-drop', rod([XB, -35, ZB - 70], [XB, -35, 330], 26, 8).color(rubber));
add('string-cable-run', rod([XB, -35, 330], [XG - 70, 20, 200], 26, 8).color(rubber));
add('ground-conduit', rod([XG - 60, 20, 0], [XG - 60, 20, 200], 55, 10).color(stainlessSteel));

return p.model();
