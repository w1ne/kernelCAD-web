// SPDX-License-Identifier: CC0-1.0
// Floating high-speed surface aerator, the machine that churns an aeration
// lagoon. What makes it one: three cylindrical floats at 120 degrees carrying
// a tubular frame; a vertical finned motor standing in the middle on a mounting
// ring; under it a stainless volute and diffuser cone at the water line; an
// umbrella of thrown water jets landing in a ring of white foam around the
// unit; mooring cables running out to the bank and a power cable held up by
// small buoys.
// Millimetres, Z up, water line at z = 0, unit centred on the origin.
meta({
  name: "surface-aerator",
  license: 'CC0-1.0',
  title: "Surface aerator assembly",
  description: "Floating high-speed surface aerator at about real size: three FRP floats at 120 degrees on a tubular stainless frame and mounting ring, a vertical finned motor with fan cowl, terminal box and lifting eye, a stainless volute and diffuser cone at the water line, an umbrella of thrown water jets landing in a foam ring on the lagoon surface, three mooring cables and a power cable on buoys. Material controls: floats, motor coating, stainless frame and volute, water; weathered, highVisibility and lagoonGreen presets.",
  tags: ['water treatment', 'wastewater', 'aerator', 'surface aerator', 'lagoon', 'floating', 'oxygen transfer'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const floats = param('floats', '#d9ad2f', { label: 'FRP floats' });
const coatedSteel = param('coatedSteel', '#3d8589', { label: 'Motor coating' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless frame and volute' });
const water = param('water', '#4d7c80', { label: 'Lagoon water' });
presets({
  weathered: { floats: '#b3995a', coatedSteel: '#687b78', stainlessSteel: '#9ca7a6', water: '#5a6f62' },
  highVisibility: { floats: '#f08a1c', coatedSteel: '#e5682d', stainlessSteel: '#e1ddd0', water: '#3b7d92' },
  lagoonGreen: { floats: '#d8dccb', coatedSteel: '#2f5f8a', stainlessSteel: '#b7c0bd', water: '#56713f' },
});

const p = assembly("surface-aerator");
// Lifted so the lowest point (float bottoms below the water line) sits on z = 0.
const add = (name, shape) => p.part(name, shape.translate(0, 0, 345).scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Lathe along X: [[radius, x], ...] with x rising, centred on (y, z).
const latheX = (pts, y, z, n = 12) => lathe(pts, n).rotateY(90).translate(0, y, z);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
const polar = (r, deg, z) => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180), z];

const spray = '#e4f0f1', foam = '#f2f5f2', cable = '#24282a', buoy = '#e2582a', dark = '#1f2325';
const FA = [90, 210, 330]; // float bearings

// ---- Lagoon surface and foam ring ----
add('water-surface', lathe([[5200, -120], [5200, 0]], 32).color(water));
add('foam-mound', lathe([[4100, -20], [3900, 25], [2600, 70], [1300, 90]], 20).color(foam));
for (let i = 0; i < 9; i++) {
  add(`foam-streak-${i}`, lathe([[420 + (i % 3) * 90, -10], [260, 45]], 7).translate(...polar(4150 + (i % 2) * 250, i * 40 + 12, 0)).color(foam));
}

// ---- Floats and frame ----
for (const a of FA) {
  add(`float-${a}`, latheX([[180, 1000], [380, 1150], [450, 1400], [450, 2900], [380, 3150], [180, 3300]], 0, 120, 14).rotateZ(a).color(floats));
  add(`float-band-a-${a}`, latheX([[465, 1700], [465, 1800]], 0, 120, 14).rotateZ(a).color(stainlessSteel));
  add(`float-band-b-${a}`, latheX([[465, 2550], [465, 2650]], 0, 120, 14).rotateZ(a).color(stainlessSteel));
  // Frame: two struts from the mounting ring to the float bands, a top tie.
  add(`frame-strut-a-${a}`, tube(polar(850, a, 600), polar(1750, a, 560), 55, 6).color(stainlessSteel));
  add(`frame-strut-b-${a}`, tube(polar(850, a, 600), polar(2600, a, 560), 55, 6).color(stainlessSteel));
  add(`frame-saddle-a-${a}`, tube(polar(1750, a, 560), polar(1750, a, 300), 45, 6).color(stainlessSteel));
  add(`frame-saddle-b-${a}`, tube(polar(2600, a, 560), polar(2600, a, 300), 45, 6).color(stainlessSteel));
  add(`mooring-${a}`, tube(polar(3250, a, 120), polar(5150, a + 8, -40), 22, 4).color(cable));
  add(`mooring-eye-${a}`, rod(70, 50, 260, 6).translate(...polar(3250, a, 0)).color(stainlessSteel));
}
for (let k = 0; k < 3; k++) {
  add(`frame-tie-${k}`, tube(polar(2600, FA[k], 560), polar(2600, FA[(k + 1) % 3], 560), 45, 6).color(stainlessSteel));
}
add('mounting-ring', lathe([[950, 480], [950, 680], [700, 700]], 18).color(stainlessSteel));

// ---- Volute, diffuser cone and thrown water ----
add('diffuser-cone', lathe([[1150, -150], [1150, -40], [800, 200], [650, 480]], 18).color(stainlessSteel));
add('volute-lip', lathe([[1250, -40], [1250, 40]], 18).color(stainlessSteel));
{
  const n = 22;
  for (let i = 0; i < n; i++) {
    const a = (360 * i) / n + 6, lift = 900 + (i % 3) * 180, reach = 3200 + (i % 4) * 220;
    const a0 = polar(1250, a, 50), a1 = polar(2100, a, lift), a2 = polar(reach, a + 3, 30);
    add(`jet-up-${i}`, tube(a0, a1, 120, 5).color(spray));
    add(`jet-down-${i}`, tube(a1, a2, 95, 5).color(spray));
  }
}

// ---- Motor ----
add('motor-flange', lathe([[650, 700], [650, 800], [500, 820]], 18).color(coatedSteel));
add('motor-body', lathe([[470, 820], [500, 900], [500, 1850], [440, 1920]], 16).color(coatedSteel));
for (let i = 0; i < 12; i++) {
  add(`motor-fin-${i}`, blk(480, -18, 920, 570, 18, 1820).rotateZ(i * 30 + 15).color(coatedSteel));
}
add('fan-cowl', lathe([[440, 1920], [450, 2120], [300, 2200]], 16).color(dark));
add('cowl-grille', lathe([[300, 2200], [300, 2220]], 16).color(stainlessSteel));
add('terminal-box', blk(480, -220, 1450, 760, 220, 1750).color(coatedSteel));
add('cable-gland', latheX([[50, 760], [50, 880]], 0, 1550, 8).color(dark));
add('lifting-eye-post', rod(45, 2220, 2400, 6).color(stainlessSteel));
add('lifting-eye', latheX([[110, -30], [110, 30]], 0, 2470, 10).color(stainlessSteel));

// ---- Power cable on buoys to the bank ----
{
  const start = [820, 0, 1550], end = polar(5150, 30, -30);
  add('power-cable-drop', tube(start, polar(1300, 30, 120), 30, 6).color(cable));
  add('power-cable', tube(polar(1300, 30, 120), end, 30, 6).color(cable));
  for (let k = 1; k <= 4; k++) {
    const r = 1300 + ((5150 - 1300) * k) / 5;
    add(`cable-buoy-${k}`, lathe([[60, -60], [190, 20], [190, 120], [60, 200]], 8).translate(...polar(r, 30, 0)).color(buoy));
  }
}

return p.model();
