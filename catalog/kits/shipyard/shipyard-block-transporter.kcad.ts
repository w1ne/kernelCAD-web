// Self-propelled modular transporter (SPMT), the low many-wheeled platform
// that carries finished hull blocks from the assembly hall to the dock. What
// makes it one: a long flat deck only about 1.5 m high riding on rows of
// short pendulum axles - each axle line has two steered suspension units,
// each a hydraulic king-pin cylinder over a yoke carrying two pairs of small
// twin tyres - with a diesel power pack unit hung on one end, timber cribbing
// stacks on the deck to take the block, corner beacons and hazard stripes.
// Millimetres, Z up, ground origin, deck along X, power pack at -X.
meta({
  name: "shipyard-block-transporter",
  license: 'CC0-1.0',
  title: "Shipyard block transporter (SPMT)",
  description: "Six-axle-line self-propelled modular transporter at about real size: a long low deck with chamfered ends, side skirts and hazard-striped end beams, twelve steered suspension units each with a hydraulic king-pin cylinder, yoke and two pairs of twin tyres, a hung diesel power pack unit with radiator grille, exhaust stack, ladder and handrail, timber cribbing stacks on deck, tie-down lugs, a module coupling plate, a hand-held remote on its holster and amber corner beacons. Material controls: deck paint, chassis steel, tyres, timber cribbing; fresh-coat, weathered-yard and orange-fleet presets.",
  tags: ["shipyard", "shipbuilding", "SPMT", "self-propelled modular transporter", "block transporter", "heavy haul", "multi-wheel", "CC0"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 9500,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const deckPaint = param('deckPaint', '#e3a62a', { label: 'Deck and power pack paint' });
const chassis = param('chassis', '#3c4247', { label: 'Chassis and suspension steel' });
const tyre = param('tyre', '#1d2124', { label: 'Tyres' });
const timber = param('timber', '#9a6b3e', { label: 'Timber cribbing' });

presets({
  'fresh-coat': { deckPaint: '#f0b83a', chassis: '#4a5257', tyre: '#232729', timber: '#b58250' },
  'weathered-yard': { deckPaint: '#b98a35', chassis: '#3a3b3b', tyre: '#2a2b2b', timber: '#6f5a45' },
  'orange-fleet': { deckPaint: '#d9622b', chassis: '#2f3b45' },
});

const p = assembly("shipyard-block-transporter");
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
// Closed (x, z) front profile extruded along Y from y0 to y1.
const front = (pts, y0, y1) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [u, v] of pts.slice(1)) o = o.lineTo(u, v);
  return o.close().extrude(y1 - y0).rotateX(90).translate(0, y1, 0);
};
// Lathe along Y: [[radius, y], ...] with y rising, centred on (x, z).
const latheY = (pts, x, z, n = 12) => lathe(pts, n).rotateX(-90).translate(x, 0, z);

const dark = '#24282b', amber = '#f39a1e', hubGrey = '#8c949a';
const halfW = 1215;
const deckTop = 1500, deckBot = 1150;
const lines = [-3500, -2100, -700, 700, 2100, 3500];
const wheelR = 340, wheelZ = 340;

// ---- Deck: chamfered side profile, skirts and striped end beams ----
add('deck', front([[-4300, deckBot + 120], [-4180, deckBot], [4180, deckBot], [4300, deckBot + 120], [4300, deckTop], [-4300, deckTop]], -halfW, halfW).color(deckPaint));
add('deck-plate', blk(-4250, -halfW + 30, deckTop, 4250, halfW - 30, deckTop + 12).color(chassis));
for (const s of [-1, 1]) {
  add(`side-skirt-${s}`, blk(-4300, s * halfW - 15, deckBot - 120, 4300, s * halfW + 15, deckTop).color(deckPaint));
  for (const x of [-3500, -1750, 0, 1750, 3500]) add(`tie-down-lug-${s}-${x}`, blk(x - 60, s * (halfW - 90) - 25, deckTop + 12, x + 60, s * (halfW - 90) + 25, deckTop + 110).color(chassis));
}
for (const e of [-1, 1]) {
  for (let i = 0; i < 6; i++) {
    const y0 = -halfW + (i * 2 * halfW) / 6;
    add(`hazard-stripe-${e}-${i}`, blk(e * 4300 - 8, y0, deckBot + 140, e * 4300 + 8, y0 + (2 * halfW) / 6, deckTop - 30).color(i % 2 ? deckPaint : dark));
  }
}
add('coupling-plate', blk(4300, -700, deckBot + 40, 4360, 700, deckTop - 40).color(chassis));
for (const y of [-500, -170, 170, 500]) add(`coupling-bolt-${y}`, rod(30, 0, 40, 6).rotateY(90).translate(4360, y, (deckBot + deckTop) / 2).color(hubGrey));

// ---- Suspension units: king-pin cylinder, yoke, pendulum axle, twin tyres ----
lines.forEach((x, li) => {
  for (const s of [-1, 1]) {
    const y = s * 620;
    const n = `unit-${li}-${s}`;
    add(`${n}-turntable`, rod(300, deckBot - 60, deckBot, 12).translate(x, y, 0).color(chassis));
    add(`${n}-cylinder`, rod(150, 820, deckBot - 60, 10).translate(x, y, 0).color(chassis));
    add(`${n}-piston`, rod(90, 700, 820, 10).translate(x, y, 0).color(hubGrey));
    add(`${n}-yoke`, blk(x - 230, y - 160, wheelZ + 120, x + 230, y + 160, 720).color(chassis));
    add(`${n}-axle`, latheY([[85, y - 540], [85, y + 540]], x, wheelZ, 8).color(chassis));
    for (const [k, c] of [y - 400, y + 400].entries()) {
      for (const [j, d] of [-1, 1].entries()) {
        const y0 = c + d * 105;
        add(`${n}-tyre-${k}-${j}`, latheY([[wheelR - 30, y0 - 95], [wheelR, y0 - 75], [wheelR, y0 + 75], [wheelR - 30, y0 + 95]], x, wheelZ, 12).color(tyre));
      }
      add(`${n}-hub-${k}`, latheY([[150, c - 220], [150, c + 220]], x, wheelZ, 8).color(hubGrey));
    }
  }
  add(`axle-line-crossmember-${li}`, blk(x - 120, -halfW + 60, deckBot - 120, x + 120, halfW - 60, deckBot).color(chassis));
});

// ---- Power pack unit hung on the -X end ----
const ppx0 = -5900, ppx1 = -4300;
add('ppu-hanger', blk(-4420, -900, deckBot - 200, -4300, 900, deckTop).color(chassis));
add('ppu-body', front([[ppx0, 700], [ppx1, 700], [ppx1, 2600], [ppx0 + 250, 2600], [ppx0, 2350]], -1000, 1000).color(deckPaint));
add('ppu-grille', blk(ppx0 - 12, -800, 900, ppx0, 800, 2200).color(dark));
for (let z = 980; z < 2200; z += 110) add(`ppu-grille-bar-${z}`, blk(ppx0 - 30, -790, z, ppx0 - 10, 790, z + 30).color(deckPaint));
for (const s of [-1, 1]) {
  add(`ppu-door-${s}`, blk(ppx0 + 200, s * 1000 - 8, 850, ppx1 - 200, s * 1000 + 8, 2400).color(deckPaint));
  add(`ppu-door-handle-${s}`, blk(ppx1 - 380, s * 1015 - 10, 1500, ppx1 - 300, s * 1015 + 10, 1540).color(dark));
  add(`ppu-vent-${s}`, blk(ppx0 + 400, s * 1010 - 6, 2000, ppx0 + 900, s * 1010 + 6, 2250).color(dark));
}
add('exhaust-stack', rod(70, 2600, 3300, 10).translate(-4700, 650, 0).color(hubGrey));
add('exhaust-cap', rod(90, 3300, 3360, 10).translate(-4700, 650, 0).color(dark));
add('air-intake', rod(110, 2600, 2950, 10).translate(-4700, -600, 0).color(dark));
add('ppu-ladder-l', blk(-4380, -1080, 700, -4340, -1040, 2600).color(chassis));
add('ppu-ladder-r', blk(-4380, -720, 700, -4340, -680, 2600).color(chassis));
for (let z = 850; z < 2600; z += 280) add(`ppu-ladder-rung-${z}`, rod(15, -1060, -700, 6).rotateX(-90).translate(-4360, 0, z).color(chassis));
for (const y of [-900, 0, 900]) add(`ppu-rail-post-${y}`, blk(-5000, y - 20, 2600, -4960, y + 20, 3500).color(deckPaint));
add('ppu-rail', blk(-5010, -920, 3460, -4950, 920, 3500).color(deckPaint));

// ---- Timber cribbing stacks: crossed layers that take the hull block ----
for (const x of [-2800, 0, 2800]) {
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const z = deckTop + 12 + k * 160;
      for (const d of [-220, 220]) {
        const shape = k % 2
          ? blk(x - 420, s * 600 + d - 90, z, x + 420, s * 600 + d + 90, z + 160)
          : blk(x + d - 90, s * 600 - 420, z, x + d + 90, s * 600 + 420, z + 160);
        add(`crib-${x}-${s}-${k}-${d}`, shape.color(timber));
      }
    }
  }
}

// ---- Beacons and the remote control ----
for (const x of [-4200, 4200]) for (const s of [-1, 1]) {
  add(`beacon-base-${x}-${s}`, rod(55, deckTop, deckTop + 40, 8).translate(x, s * (halfW - 80), 0).color(dark));
  add(`beacon-${x}-${s}`, lathe([[50, deckTop + 40], [45, deckTop + 150], [25, deckTop + 180]], 8).translate(x, s * (halfW - 80), 0).color(amber));
}
add('remote-holster', blk(-4100, halfW + 15, deckBot + 60, -3800, halfW + 45, deckBot + 280).color(dark));
add('remote-control', blk(-4060, halfW + 45, deckBot + 120, -3840, halfW + 145, deckBot + 330).color(deckPaint));
add('remote-joystick', rod(18, 0, 90, 6).translate(-3950, halfW + 95, deckBot + 330).color(dark));

return p.model();
