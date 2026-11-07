// Pipe spool rotator (welding turning rolls), which spins a large pipe spool
// slowly under a fixed welding torch so the root and cap passes can be laid
// down in the flat position. What makes it one: two low roller stands - a
// powered drive unit and a free idler - each with a pair of twin polyurethane
// tyres on steel hubs that cradle the pipe from below; the drive stand's
// gearmotor and chain guard sit on its side; the pipe spool rests on both
// stands with a weld-neck flange, a branch nozzle and a fresh girth weld;
// a hand pendant on a post and a foot pedal control the rotation.
// Millimetres, Z up, ground origin, pipe along X.
meta({
  name: "pipe-spool-rotator",
  license: 'CC0-1.0',
  title: "Pipe spool rotator",
  description: "Welding turning rolls at about real size carrying a 1 m pipe spool: a powered drive stand and a free idler stand, each with two pairs of twin polyurethane tyres on steel hubs in bearing blocks, adjustable roller-centre slots, a gearmotor with chain guard on the drive stand, and a pipe spool with weld-neck flange, branch nozzle with its own flange and a fresh girth weld, plus a pendant controller on a post and a foot pedal with cables. Material controls: frame paint, polyurethane tyres, pipe steel, machined steel; fresh-coat, weathered-yard and red-rolls presets.",
  tags: ["shipyard", "pipe shop", "welding rotator", "turning rolls", "pipe spool", "welding positioner", "outfitting", "CC0"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 4000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const framePaint = param('framePaint', '#3d7a4a', { label: 'Frame paint' });
const polyurethane = param('polyurethane', '#d0702a', { label: 'Polyurethane tyres' });
const pipeSteel = param('pipeSteel', '#666c6f', { label: 'Pipe spool steel' });
const machinedSteel = param('machinedSteel', '#b5bcc0', { label: 'Hubs and machined steel' });

presets({
  'fresh-coat': { framePaint: '#4a8f59', polyurethane: '#e07e33', pipeSteel: '#737a7d', machinedSteel: '#c8ced1' },
  'weathered-yard': { framePaint: '#4b5f45', polyurethane: '#a8622f', pipeSteel: '#7a5a45', machinedSteel: '#8f9597' },
  'red-rolls': { framePaint: '#2f4f7a', polyurethane: '#b5352b' },
});

const p = assembly("pipe-spool-rotator");
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
// Closed (y, z) profile extruded along X from x0 to x1.
const side = (pts, x0, x1) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [u, v] of pts.slice(1)) o = o.lineTo(u, v);
  return o.close().extrude(x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
};

const dark = '#25292c', weld = '#3a3632';
const wheelR = 230, wheelZ = 470, wheelY = 420;
const pipeR = 500;
const pipeZ = wheelZ + Math.sqrt((pipeR + wheelR) ** 2 - wheelY ** 2);

// ---- Two roller stands: drive at -X, idler at +X ----
for (const [k, cx] of [-1500, 1500].entries()) {
  const n = k ? 'idler' : 'drive';
  add(`${n}-frame`, side([[-720, 0], [720, 0], [720, 180], [560, 300], [-560, 300], [-720, 180]], cx - 260, cx + 260).color(framePaint));
  add(`${n}-top-plate`, blk(cx - 280, -620, 300, cx + 280, 620, 330).color(framePaint));
  for (const s of [-1, 1]) {
    for (const y of [s * 560, s * 280]) add(`${n}-slot-${y}`, blk(cx - 200, y - 25, 330, cx + 200, y + 25, 333).color(dark));
    add(`${n}-bearing-block-${s}-a`, blk(cx - 260, s * wheelY - 70, 330, cx - 190, s * wheelY + 70, wheelZ + 70).color(machinedSteel));
    add(`${n}-bearing-block-${s}-b`, blk(cx + 190, s * wheelY - 70, 330, cx + 260, s * wheelY + 70, wheelZ + 70).color(machinedSteel));
    add(`${n}-axle-${s}`, latheX([[40, cx - 280], [40, cx + 280]], s * wheelY, wheelZ, 8).color(machinedSteel));
    for (const x of [cx - 95, cx + 95]) {
      add(`${n}-tyre-${s}-${x}`, latheX([[wheelR - 25, x - 80], [wheelR, x - 60], [wheelR, x + 60], [wheelR - 25, x + 80]], s * wheelY, wheelZ, 16).color(polyurethane));
      add(`${n}-hub-${s}-${x}`, latheX([[150, x - 84], [150, x + 84]], s * wheelY, wheelZ, 12).color(machinedSteel));
    }
  }
  add(`${n}-lifting-eye-a`, rod(45, 0, 30, 8).rotateY(90).translate(cx + 260, -650, 220).color(framePaint));
  add(`${n}-lifting-eye-b`, rod(45, 0, 30, 8).rotateY(90).translate(cx + 260, 650, 220).color(framePaint));
}

// ---- Drive gearmotor and chain guard on the drive stand ----
add('gearbox', blk(-1880, -300, 120, -1760, 300, 520).color(framePaint));
add('drive-motor', latheX([[150, -2300], [165, -2260], [165, -1960], [130, -1880]], -120, 330, 12).color(framePaint));
add('motor-fan-cowl', latheX([[130, -2380], [150, -2300]], -120, 330, 12).color(dark));
add('motor-terminal-box', blk(-2180, -220, 480, -2020, -20, 560).color(framePaint));
add('chain-guard', side([[-wheelY - 120, wheelZ - 130], [wheelY + 120, wheelZ - 130], [wheelY + 120, wheelZ + 130], [-wheelY - 120, wheelZ + 130]], -1820, -1780).color('#e2b02b'));
add('drive-plate-label', blk(-1882, 60, 250, -1880, 260, 380).color('#efeadf'));

// ---- Pipe spool resting on both stands ----
add('pipe', latheX([[pipeR, -2600], [pipeR, 2350]], 0, pipeZ, 20).color(pipeSteel));
add('pipe-bore', latheX([[pipeR - 30, -2605], [pipeR - 30, -2595]], 0, pipeZ, 20).color(dark));
add('girth-weld', latheX([[pipeR + 8, -40], [pipeR + 8, 40]], 0, pipeZ, 20).color(weld));
add('weld-neck-hub', latheX([[pipeR, 2350], [pipeR + 60, 2500]], 0, pipeZ, 20).color(pipeSteel));
add('flange', latheX([[pipeR + 220, 2500], [pipeR + 220, 2620]], 0, pipeZ, 20).color(pipeSteel));
for (let i = 0; i < 12; i++) {
  const a = (2 * Math.PI * i) / 12;
  add(`flange-bolt-hole-${i}`, latheX([[24, 2618], [24, 2624]], (pipeR + 140) * Math.cos(a), pipeZ + (pipeR + 140) * Math.sin(a), 6).color(dark));
}
add('branch-nozzle', rod(170, pipeZ + 300, pipeZ + pipeR + 320, 12).translate(700, 0, 0).color(pipeSteel));
add('branch-weld', rod(185, pipeZ + pipeR - 40, pipeZ + pipeR + 10, 12).translate(700, 0, 0).color(weld));
add('branch-flange', rod(290, pipeZ + pipeR + 320, pipeZ + pipeR + 390, 12).translate(700, 0, 0).color(pipeSteel));
add('spool-tag', blk(-2200, -pipeR - 6, pipeZ - 80, -1900, -pipeR + 10, pipeZ + 80).color('#f2d23a'));

// ---- Pendant on a post and a foot pedal, with cables ----
add('pendant-post-base', blk(-2500, -1350, 0, -2200, -1050, 30).color(dark));
add('pendant-post', rod(30, 30, 1200, 8).translate(-2350, -1200, 0).color(machinedSteel));
add('pendant', blk(-2420, -1260, 1100, -2280, -1180, 1400).color('#e2b02b'));
for (const [i, c] of ['#3ea44c', '#d23a2c', dark].entries()) add(`pendant-button-${i}`, rod(18, 0, 15, 8).rotateX(90).translate(-2350, -1260, 1340 - i * 70).color(c));
add('pendant-cable', blk(-2365, -1215, 120, -2335, -1185, 1100).color(dark));
add('foot-pedal', side([[-1650, 0], [-1350, 0], [-1350, 70], [-1650, 130]], -1350, -1100).color('#e2b02b'));
add('foot-pedal-guard', side([[-1660, 0], [-1640, 0], [-1640, 200], [-1660, 200]], -1360, -1090).color('#e2b02b'));
add('pedal-cable', blk(-1800, -1520, 0, -1240, -1500, 20).color(dark));
add('control-cable', blk(-2000, -1520, 0, -1980, -300, 20).color(dark));

return p.model();
