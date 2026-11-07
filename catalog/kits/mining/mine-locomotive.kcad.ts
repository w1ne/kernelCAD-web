// Underground trolley-wire mine locomotive, the low, heavy haulage engine
// that pulls ore cars along a narrow-gauge drift. What makes it one: a long,
// very low body on an outside plate frame with exposed flanged wheels and
// axle boxes, a sloped motor and resistor hood at one end and an open,
// canopied operator's compartment at the other with a sideways seat,
// controller and hand-brake wheel; heavy buffer beams with coupler pockets and
// headlights at both ends; a trolley pole on the canopy pressing its shoe
// against the overhead wire. Track, ties and a wire support are included.
// Millimetres, Z up, length along X, hood towards +X.
meta({
  name: "mine-locomotive",
  license: 'CC0-1.0',
  title: "Underground mine locomotive",
  description: "Narrow-gauge underground trolley locomotive at about real size: low outside plate frame with flanged wheels, axle boxes and sand boxes, sloped louvred motor hood, open operator compartment under a steel canopy with seat, controller, brake handwheel and windscreen, striped buffer beams with coupler pockets, link-and-pin couplers and headlights at both ends, trolley pole and shoe on the overhead wire with a gallows support, on 914 mm gauge rails, ties and ballast. Material controls: body coating, frame and rail steel, rubber, lamp glass; weathered, highVisibility and greenFleet presets.",
  tags: ['mining', 'underground', 'locomotive', 'trolley locomotive', 'narrow gauge', 'haulage', 'rail', 'mine car'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene', 'railway'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#d38b25', { label: 'Body coating' });
const structuralSteel = param('structuralSteel', '#3f474c', { label: 'Frame, wheel and rail steel' });
const rubber = param('rubber', '#25292b', { label: 'Rubber and cable' });
const instrumentGlass = param('instrumentGlass', '#e9e2a8', { label: 'Lamp and windscreen glass' });
presets({
  weathered: { coatedSteel: '#8c6b45', structuralSteel: '#5b5b56', rubber: '#393a38', instrumentGlass: '#b9b28a' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', rubber: '#24282a', instrumentGlass: '#f5f0b8' },
  greenFleet: { coatedSteel: '#3f7a4f', structuralSteel: '#2f3336', rubber: '#1e2022', instrumentGlass: '#e6e0b0' },
});

const p = assembly("mine-locomotive");
const add = (name, shape) => p.part(name, shape.scale(scale));

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
// Lathe along Y: [[radius, y], ...] with y rising, centred on (x, z).
const latheY = (pts, x, z, n = 12) => lathe(pts, n).rotateX(-90).translate(x, 0, z);
// Closed (y, z) section extruded along X from x0 to x1.
const sideX = (pts, x0, x1) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [u, v] of pts.slice(1)) o = o.lineTo(u, v);
  return o.close().extrude(x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
};
// Closed (x, z) side profile extruded along Y from y0 to y1.
const sideY = (pts, y0, y1) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [u, v] of pts.slice(1)) o = o.lineTo(u, v);
  return o.close().extrude(y1 - y0).rotateX(90).translate(0, y1, 0);
};
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};

const ballast = '#77706a', timber = '#6b5440', dark = '#1c1f21', yellow = '#e8c22a';
const g = 457; // half gauge (914 mm track)
const railTop = 370, wr = 380, wz = railTop + wr;
const deck = 1200;

// ---- Track: ballast, ties and flat-bottom rails ----
add('ballast', sideX([[-1100, 0], [1100, 0], [800, 120], [-800, 120]], -4200, 4200).color(ballast));
for (let x = -4000; x <= 4000; x += 650) add(`tie-${x}`, blk(x - 100, -800, 100, x + 100, 800, 220).color(timber));
for (const s of [-1, 1]) {
  const y = s * g;
  add(`rail-${s}`, sideX([[y - 60, 220], [y + 60, 220], [y + 60, 240], [y + 12, 255], [y + 12, 335], [y + 32, 340], [y + 32, railTop], [y - 32, railTop], [y - 32, 340], [y - 12, 335], [y - 12, 255], [y - 60, 240]], -4200, 4200).color(structuralSteel));
}

// ---- Wheelsets and axle boxes ----
for (const x of [-950, 950]) {
  add(`wheel-${x}-a`, latheY([[wr - 15, -g - 70], [wr, -g + 20], [wr + 40, -g + 35], [wr + 40, -g + 55]], x, wz, 18).color(structuralSteel));
  add(`wheel-${x}-b`, latheY([[wr + 40, g - 55], [wr + 40, g - 35], [wr, g - 20], [wr - 15, g + 70]], x, wz, 18).color(structuralSteel));
  add(`axle-${x}`, latheY([[90, -620], [90, 620]], x, wz, 8).color(structuralSteel));
  for (const s of [-1, 1]) {
    add(`axle-box-${x}-${s}`, blk(x - 200, s * 620 - 70, wz - 200, x + 200, s * 620 + 70, wz + 220).color(structuralSteel));
    add(`spring-${x}-${s}`, blk(x - 380, s * 630 - 50, wz + 220, x + 380, s * 630 + 50, wz + 300).color(dark));
  }
}

// ---- Outside plate frame, sand boxes and buffer beams ----
const frame = [[-2850, 900], [2850, 900], [2850, 1200], [-2850, 1200]];
for (const s of [-1, 1]) {
  add(`side-frame-${s}`, sideY(frame, s > 0 ? 540 : -620, s > 0 ? 620 : -540).color(structuralSteel));
  for (const x of [-1750, 1750]) add(`sand-box-${x}-${s}`, blk(x - 220, s * 620, 950, x + 220, s * 620 + s * 160, 1180).color(coatedSteel));
}
add('deck-plate', blk(-2850, -620, deck - 40, 2850, 620, deck).color(structuralSteel));
for (const e of [-1, 1]) {
  const x0 = e * 2850, x1 = e * 3000;
  add(`buffer-beam-${e}`, blk(Math.min(x0, x1), -700, 620, Math.max(x0, x1), 700, 1200).color(coatedSteel));
  for (let k = 0; k < 5; k++) {
    const y = -650 + k * 280;
    add(`hazard-stripe-${e}-${k}`, sideX([[y, 640], [y + 120, 640], [y + 260, 1180], [y + 140, 1180]], e > 0 ? 3000 : -3010, e > 0 ? 3010 : -3000).color(k % 2 ? dark : yellow));
  }
  add(`coupler-pocket-${e}`, blk(e > 0 ? 3000 : -3180, -180, 750, e > 0 ? 3180 : -3000, 180, 980).color(dark));
  add(`coupler-link-${e}`, blk(e > 0 ? 3180 : -3420, -40, 840, e > 0 ? 3420 : -3180, 40, 890).color(structuralSteel));
  add(`coupler-pin-${e}`, rod(25, 700, 1080, 6).translate(e * 3090, 0, 0).color(structuralSteel));
  for (const y of [-500, 500]) add(`buffer-pad-${e}-${y}`, latheX(e > 0 ? [[110, 3000], [110, 3080]] : [[110, -3080], [110, -3000]], y, 900, 8).color(rubber));
}

// ---- Motor and resistor hood (+X) ----
add('hood', sideY([[-900, deck], [2850, deck], [2850, 1620], [2650, 1850], [-900, 1850]], -560, 560).color(coatedSteel));
add('hood-top-cover-a', blk(-700, -460, 1850, 700, 460, 1880).color(coatedSteel));
add('hood-top-cover-b', blk(900, -460, 1850, 2300, 460, 1880).color(coatedSteel));
for (const s of [-1, 1]) {
  for (let x = -500; x < 2300; x += 220) add(`hood-louvre-${s}-${x}`, blk(x, s * 560 - 15, 1400, x + 140, s * 560 + 15, 1700).color(dark));
  add(`grab-rail-${s}`, tube([-600, s * 600, 1700], [2400, s * 600, 1700], 18, 6).color(yellow));
}
for (const x of [-500, 2200]) add(`lifting-eye-${x}`, latheY([[70, -30], [70, 30]], x, 1930, 8).color(structuralSteel));
add('headlight-front-housing', latheX([[130, 2850], [130, 2950]], 0, 1700, 12).color(dark));
add('headlight-front', latheX([[105, 2950], [105, 2970]], 0, 1700, 12).color(instrumentGlass));

// ---- Open operator compartment and canopy (-X) ----
const cx0 = -2850, cx1 = -950;
add('cab-wall-rear', blk(cx0, -620, deck, cx0 + 120, 620, 1750).color(coatedSteel));
add('cab-wall-side', blk(cx0, 500, deck, cx1, 620, 1750).color(coatedSteel));
add('cab-wall-side-low', blk(cx0 + 900, -620, deck, cx1, -500, 1500).color(coatedSteel));
add('cab-bulkhead', blk(cx1, -620, deck, cx1 + 60, 620, 1850).color(coatedSteel));
add('windscreen', blk(cx1 - 20, -380, 1850, cx1 + 40, 380, 2180).color(instrumentGlass));
add('windscreen-frame', blk(cx1 - 30, -420, 2180, cx1 + 50, 420, 2230).color(coatedSteel));
for (const [x, y] of [[cx0 + 60, -560], [cx0 + 60, 560], [cx1 - 60, -560], [cx1 - 60, 560]]) add(`canopy-post-${x}-${y}`, rod(45, deck, 2380, 8).translate(x, y, 0).color(structuralSteel));
add('canopy', sideX([[-700, 2380], [700, 2380], [650, 2460], [-650, 2460]], cx0 - 50, cx1 + 80).color(coatedSteel));
add('seat-base', blk(-2350, 150, deck, -1850, 500, 1600).color(structuralSteel));
add('seat-cushion', blk(-2380, 120, 1600, -1820, 520, 1700).color(rubber));
add('seat-back', blk(-2380, 420, 1700, -1820, 520, 2100).color(rubber));
add('controller', blk(-1650, -250, deck, -1300, 150, 1750).color(dark));
add('controller-handle', tube([-1475, -50, 1750], [-1475, -50, 1950], 25, 6).color(yellow));
add('brake-column', rod(40, deck, 1800, 8).translate(-2500, -350, 0).color(structuralSteel));
add('brake-handwheel', lathe([[260, 1800], [260, 1840]], 12).translate(-2500, -350, 0).color(yellow));
add('headlight-rear-housing', latheX([[130, -3000], [130, -2900]], 0, 1650, 12).color(dark));
add('headlight-rear', latheX([[105, -3020], [105, -3000]], 0, 1650, 12).color(instrumentGlass));
add('cab-step', blk(-2700, -760, 700, -2200, -620, 740).color(structuralSteel));

// ---- Trolley pole and overhead wire ----
const wireZ = 3300;
add('pole-base', rod(140, 2460, 2620, 10).translate(-2100, 0, 0).color(dark));
add('trolley-pole', tube([-2100, 0, 2600], [400, 0, wireZ - 90], 35, 6).color(structuralSteel));
add('pole-shoe', blk(330, -80, wireZ - 110, 520, 80, wireZ - 15).color(dark));
add('pole-rope', tube([380, 0, wireZ - 120], [-2700, -600, 1700], 10, 4).color(rubber));
add('trolley-wire', latheX([[12, -4200], [12, 4200]], 0, wireZ, 6).color(structuralSteel));
add('wire-gallows-post', rod(80, 0, wireZ + 400, 8).translate(3700, 1300, 0).color(structuralSteel));
add('wire-gallows-arm', blk(3640, -60, wireZ + 300, 3760, 1360, wireZ + 400).color(structuralSteel));
add('wire-hanger', rod(20, wireZ, wireZ + 300, 6).translate(3700, 0, 0).color(structuralSteel));
add('wire-insulator', rod(60, wireZ + 120, wireZ + 260, 8).translate(3700, 0, 0).color('#7a4a32'));

return p.model();
