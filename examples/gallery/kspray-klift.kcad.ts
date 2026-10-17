// K-Spray K-Lift — spray workcell on a certified boom lift (pitch concept).
// Z-up, millimetres. The lift is a generic Genie/Terex-class towable boom:
// a certified access machine the crew already uses. Komatachi builds only the
// compact workcell that mounts on its platform. Concept model, not a certified
// lifting device — load limits and OEM approval come before any field use.

const upperBoomDeg = param('upperBoomDeg', 30, {
  min: -60, max: 40,
  description: 'Upper-boom elevation (deg). -50 = platform folded low, 30 = working pose.',
});
const carriageMm = param('carriageMm', 450, {
  min: 150, max: 750,
  description: 'Gun carriage height above the platform deck (mm).',
});

const C = {
  frame: '#27343d', dark: '#18232a', orange: '#f0782f', amber: '#f6b23b',
  gunBlue: '#1769aa', gunSilver: '#c5cdd1',
  ivory: '#e8e4d9', alu: '#aeb8bd', black: '#15191c', rubber: '#202326',
  red: '#d7222b', blue: '#315c72', glass: '#315c72',
  wall: '#e9e0d4', wallLight: '#f5eee3', mask: '#cfe3ea', ground: '#d8d4cc',
};

// --- Scene constants -------------------------------------------------------
const WALL_X = 3420;
const GROUND_Z = 0;

// Boom geometry. Lower boom is fixed at the working elevation; the upper boom
// carries the platform and is the animated axis.
const P0: [number, number, number] = [-800, 0, 1100];
const L1 = 2600;
const LOWER_DEG = 70;
const L2 = 2200;
const UPPER_DEG = upperBoomDeg.value ?? 30;

const lowerRad = LOWER_DEG * Math.PI / 180;
const upperRad = UPPER_DEG * Math.PI / 180;
const P1: [number, number, number] = [
  P0[0] + L1 * Math.cos(lowerRad),
  P0[1],
  P0[2] + L1 * Math.sin(lowerRad),
];
const P2: [number, number, number] = [
  P1[0] + L2 * Math.cos(upperRad),
  P1[1],
  P1[2] + L2 * Math.sin(upperRad),
];

const deckZ = P2[2];
const carriageZ = deckZ + 60 + (carriageMm.value ?? 450);
const muzzleX = P2[0] + 990;

setCameraTarget(1100, 0, 2700);

// --- Helpers ---------------------------------------------------------------
function zCylinder(h: number, r: number, x: number, y: number, z: number, color: string) {
  return cylinder(h, r, 40).translate(x, y, z).color(color);
}
function yCylinder(h: number, r: number, x: number, y: number, z: number, color: string) {
  return cylinder(h, r, 40).alongAxis([0, 1, 0]).translate(x, y, z).color(color);
}
function xCylinder(h: number, r: number, x: number, y: number, z: number, color: string) {
  return cylinder(h, r, 40).alongAxis([1, 0, 0]).translate(x, y, z).color(color);
}
function roundedBox(x: number, y: number, z: number, r: number, cx: number, cy: number, cz: number, color: string) {
  return box(x, y, z, true).translate(cx, cy, cz).color(color);
}
function beam(
  a: [number, number, number],
  b: [number, number, number],
  widthY: number,
  heightZ: number,
  color: string,
) {
  const dx = b[0] - a[0], dz = b[2] - a[2];
  const len = Math.sqrt(dx * dx + dz * dz);
  const tilt = Math.atan2(dz, dx) * 180 / Math.PI;
  return roundedBox(len, widthY, heightZ, Math.min(widthY, heightZ) * 0.3,
    0, 0, 0, color)
    .rotate([0, 1, 0], -tilt)
    .translate((a[0] + b[0]) / 2, a[1], (a[2] + b[2]) / 2);
}

const lift = assembly('K-Spray K-Lift boom workcell concept');

// --- Ground and façade -----------------------------------------------------
lift.part('ground', roundedBox(7600, 4400, 60, 30, 900, 0, GROUND_Z - 30, C.ground));
lift.part('facade-wall', roundedBox(120, 3600, 5600, 6, WALL_X + 60, 0, 2800, C.wall)
  .union(roundedBox(10, 3600, 5600, 2, WALL_X - 3, 0, 2800, C.wallLight)));
for (const sy of [-1, 1]) {
  const wy = sy * 850;
  lift.part(`window-${sy > 0 ? 'right' : 'left'}-glass`,
    roundedBox(26, 1000, 1400, 8, WALL_X - 16, wy, 1900, C.glass));
  lift.part(`window-${sy > 0 ? 'right' : 'left'}-sprayed-mask-film`,
    roundedBox(10, 1040, 1440, 6, WALL_X - 34, wy, 1900, C.mask)
      .union(roundedBox(24, 120, 40, 6, WALL_X - 40, wy - 430, 1250, C.alu)));
}

// --- Chassis, wheels, outriggers ------------------------------------------
lift.part('boom-lift-chassis',
  roundedBox(3000, 1400, 420, 90, -100, 0, 470, C.frame)
    .union(roundedBox(2860, 1280, 60, 20, -100, 0, 690, C.alu))
    .union(roundedBox(600, 1200, 240, 40, 1050, 0, 590, C.dark)));
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  const wx = sx > 0 ? 950 : -1150;
  const wy = sy * 700;
  lift.part(`wheel-${sx > 0 ? 'front' : 'rear'}-${sy > 0 ? 'right' : 'left'}`,
    yCylinder(280, 300, wx, wy, 300, C.rubber)
      .union(yCylinder(300, 190, wx, wy, 300, C.dark))
      .union(yCylinder(310, 120, wx, wy, 300, C.alu))
      .union(yCylinder(316, 42, wx, wy, 300, C.orange)));
  const ax = sx > 0 ? 1250 : -1450;
  const anchor: [number, number, number] = [ax, sy * 560, 600];
  const foot: [number, number, number] = [sx > 0 ? 1580 : -1780, sy * 1080, 80];
  lift.part(`outrigger-${sx > 0 ? 'front' : 'rear'}-${sy > 0 ? 'right' : 'left'}`,
    beam(anchor, foot, 90, 90, C.dark)
      .union(roundedBox(260, 260, 50, 10, foot[0], foot[1], 50, C.dark))
      .union(roundedBox(300, 300, 16, 4, foot[0], foot[1], 22, C.orange)));
}

// --- Turret and booms ------------------------------------------------------
lift.part('turret-ring-and-body',
  zCylinder(120, 470, P0[0], 0, 740, C.dark)
    .union(roundedBox(720, 640, 280, 40, P0[0], 0, 960, C.frame))
    .union(roundedBox(420, 520, 280, 30, P0[0] - 470, 0, 900, C.blue)));
lift.part('lower-boom', beam(P0, P1, 250, 280, C.frame)
  .union(yCylinder(340, 110, P0[0], 0, P0[2], C.dark))
  .union(yCylinder(300, 90, P1[0], 0, P1[2], C.orange)));
lift.part('upper-boom', beam(P1, P2, 210, 230, C.frame)
  .union(yCylinder(300, 90, P1[0], 0, P1[2], C.dark)));
lift.part('boom-hydraulic-ram',
  beam([P0[0] + 300, 0, P0[2] + 120], [P1[0] - 120, 0, P1[2] - 60], 80, 80, C.gunSilver));

// --- Platform and workcell -------------------------------------------------
lift.part('platform-deck-and-rails',
  roundedBox(1200, 800, 60, 16, P2[0], 0, deckZ + 30, C.alu)
    .union(yCylinder(340, 60, P2[0], 0, deckZ, C.dark)));
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  lift.part(`platform-rail-post-${sx}_${sy}`,
    zCylinder(900, 16, P2[0] + sx * 540, sy * 340, deckZ + 510, C.alu));
}
lift.part('platform-top-rails',
  roundedBox(1140, 22, 22, 8, P2[0], -340, deckZ + 940, C.alu)
    .union(roundedBox(1140, 22, 22, 8, P2[0], 340, deckZ + 940, C.alu))
    .union(roundedBox(22, 700, 22, 8, P2[0] - 540, 0, deckZ + 940, C.alu)));

lift.part('workcell-control-box',
  roundedBox(360, 300, 300, 30, P2[0] - 360, 0, deckZ + 210, C.blue)
    .union(roundedBox(340, 280, 24, 8, P2[0] - 360, 0, deckZ + 372, C.alu))
    .union(zCylinder(24, 30, P2[0] - 520, 0, deckZ + 372, C.red)));

lift.part('workcell-vertical-rail',
  roundedBox(90, 120, 1000, 12, P2[0] + 420, 0, deckZ + 560, C.dark));
lift.part('gun-carriage',
  roundedBox(170, 240, 150, 14, P2[0] + 420, 0, carriageZ, C.orange)
    .union(yCylinder(260, 26, P2[0] + 420, 0, carriageZ, C.dark)));
lift.part('spray-gun-body-and-wrist',
  xCylinder(120, 34, P2[0] + 500, 0, carriageZ, C.gunSilver)
    .union(roundedBox(300, 150, 130, 22, P2[0] + 650, 0, carriageZ, C.gunBlue))
    .union(roundedBox(90, 100, 90, 14, P2[0] + 800, 0, carriageZ - 30, C.gunSilver))
    .union(xCylinder(200, 24, P2[0] + 900, 0, carriageZ - 40, C.dark))
    .union(xCylinder(70, 34, P2[0] + 1010, 0, carriageZ - 40, C.gunSilver)));
lift.part('edge-shield-and-brush-skirt',
  roundedBox(30, 460, 380, 10, muzzleX - 120, 0, carriageZ - 20, C.alu)
    .union(roundedBox(110, 60, 380, 12, muzzleX - 60, -210, carriageZ - 20, C.alu))
    .union(roundedBox(110, 60, 380, 12, muzzleX - 60, 210, carriageZ - 20, C.alu))
    .union(roundedBox(26, 420, 90, 6, muzzleX - 30, 0, carriageZ - 190, C.black)));
lift.part('standoff-and-depth-sensors',
  roundedBox(90, 60, 50, 8, P2[0] + 700, 0, carriageZ + 110, C.dark)
    .union(roundedBox(20, 40, 30, 4, P2[0] + 748, 0, carriageZ + 110, C.glass))
    .union(roundedBox(60, 44, 40, 6, P2[0] + 560, 90, carriageZ + 90, C.dark)));

// --- Animation: lift into pose, two spray passes, lower for travel ---------
animationView({
  name: 'lift-and-spray-cycle',
  tracks: [
    {
      param: 'upperBoomDeg',
      keys: [
        { atMs: 0, value: -50 },
        { atMs: 2400, value: 30, ease: 'easeInOut' },
        { atMs: 6200, value: 30 },
        { atMs: 8000, value: -50, ease: 'easeInOut' },
      ],
    },
    {
      param: 'carriageMm',
      keys: [
        { atMs: 0, value: 150 },
        { atMs: 2400, value: 150 },
        { atMs: 3600, value: 750, ease: 'easeInOut' },
        { atMs: 4800, value: 150, ease: 'easeInOut' },
        { atMs: 6000, value: 750, ease: 'easeInOut' },
        { atMs: 6600, value: 150, ease: 'easeInOut' },
        { atMs: 8000, value: 150 },
      ],
    },
  ],
  fps: 30,
});

return lift.model();
