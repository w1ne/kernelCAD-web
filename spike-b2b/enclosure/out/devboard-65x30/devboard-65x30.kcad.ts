// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Spike (b2b wedge A): ECAD board description -> two-part moulded enclosure.
//
// Everything below the BOARD block is derived from BOARD plus the knobs. To
// enclose a different PCB, replace ONLY the BOARD block (generate.ts does this
// from boards/*.json). Board frame: X/Y in board coordinates (mm), PCB bottom
// at z = boardZ. Enclosure frame: floor underside at z = 0.
//
// Construction (one screw stack per PCB mounting hole):
//   base  - floor + straight walls around (outline + clearance), a standoff
//           boss under every mounting hole with a blind self-tap pilot, and a
//           cut-out + raised collar (lip) for every edge connector (port: true).
//   lid   - plate over the outer outline, locating skirt inside the base wall,
//           and a boss over every mounting hole that clamps the PCB onto the
//           standoff; counterbored clearance hole from the top. The screw runs
//           lid -> PCB hole -> base standoff pilot.
//   pcb   - placeholder PCB + component envelopes from BOARD (not vendor STEP),
//           used for the interference / clearance evidence only.
//
// Walls are straight (0 deg draft, pull direction +Z) and wall thickness is
// declared through dfmSpec({ minWall }). Draft is NOT applied: see FINDINGS.md.

// @board-begin
const BOARD = {
  "name": "devboard-65x30",
  "thickness": 1.6,
  "outline": [
    [
      2,
      0
    ],
    [
      63,
      0
    ],
    [
      65,
      2
    ],
    [
      65,
      28
    ],
    [
      63,
      30
    ],
    [
      2,
      30
    ],
    [
      0,
      28
    ],
    [
      0,
      2
    ]
  ],
  "holes": [
    {
      "x": 3.5,
      "y": 3.5,
      "d": 2.7
    },
    {
      "x": 61.5,
      "y": 3.5,
      "d": 2.7
    },
    {
      "x": 3.5,
      "y": 26.5,
      "d": 2.7
    },
    {
      "x": 61.5,
      "y": 26.5,
      "d": 2.7
    }
  ],
  "components": [
    {
      "ref": "J1",
      "kind": "usb-c",
      "x": 2.675,
      "y": 15,
      "w": 7.35,
      "d": 8.94,
      "h": 3.26,
      "side": "top",
      "port": true
    },
    {
      "ref": "U1",
      "kind": "esp32-s3-module",
      "x": 36,
      "y": 15,
      "w": 18,
      "d": 18,
      "h": 3.1,
      "side": "top"
    },
    {
      "ref": "SW1",
      "kind": "tact-6x6",
      "x": 14,
      "y": 6.5,
      "w": 6,
      "d": 6,
      "h": 5,
      "side": "top"
    },
    {
      "ref": "U2",
      "kind": "ldo-sot223",
      "x": 14,
      "y": 23,
      "w": 6.5,
      "d": 7,
      "h": 1.8,
      "side": "top"
    },
    {
      "ref": "U3",
      "kind": "charger-qfn",
      "x": 50,
      "y": 15,
      "w": 4,
      "d": 4,
      "h": 1,
      "side": "bottom"
    }
  ]
};
// @board-end

// What the script returns: the assembly, or one part for probing in tests.
const VIEW = 'assembly';

// ---- Knobs (choice params: these sizes drive JS geometry derivation) -------
const wall = Number(param('wall', '2.0', { choices: ['1.5', '2.0', '2.5', '3.0'], label: 'Wall thickness (mm)' }).value);
const clearance = Number(param('clearance', '0.5', { choices: ['0.3', '0.5', '0.8', '1.0'], label: 'Board / port clearance per side (mm)' }).value);
const headroom = Number(param('headroom', '3.0', { choices: ['2.0', '3.0', '5.0'], label: 'Air above tallest top component (mm)' }).value);
const bossODKnob = param('bossOD', 'auto', { choices: ['auto', '7.0', '8.0'], label: 'Standoff / lid boss OD (mm)' }).value;
const screw = param('screw', 'auto', { choices: ['auto', 'M2.5', 'M3'], label: 'Closure screw' }).value;

const lipWidth = wall;     // collar width around each port cut-out (>= minWall)
const lipDepth = 1.0;      // collar protrusion from the outer wall face
const fit = 0.2;           // lid skirt to base wall slip fit, per side
const skirtW = wall;       // lid locating skirt width (>= minWall)
const skirtH = 2.0;        // lid locating skirt depth
const minStandoff = 4.0;   // floor to PCB bottom, minimum

// ---- Derived board facts ---------------------------------------------------
type Pt = [number, number];
const outline = BOARD.outline as Pt[];
const t = BOARD.thickness;
const xs = outline.map(p => p[0]);
const ys = outline.map(p => p[1]);
const bb = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
const topComps = BOARD.components.filter(c => c.side === 'top');
const bottomComps = BOARD.components.filter(c => c.side === 'bottom');
const maxTopH = Math.max(0, ...topComps.map(c => c.h));
const maxBottomH = Math.max(0, ...bottomComps.map(c => c.h));

// Screw from the smallest mounting hole: holes >= 3.1 mm take M3, else M2.5.
const minHoleD = Math.min(...BOARD.holes.map(h => h.d));
const screwSize = screw === 'auto' ? (minHoleD >= 3.1 ? 'M3' : 'M2.5') : screw;
const SCREW = screwSize === 'M3'
  ? { clear: 3.4, pilot: 2.5, cbD: 6.5, cbDepth: 1.0 }
  : { clear: 2.9, pilot: 2.1, cbD: 5.5, cbDepth: 1.0 };

// Boss wall around the screw hole is held at the nominal wall (conservative:
// moulding practice allows ~0.6 x wall, but dfmSpec has one global minWall).
const bossOD = bossODKnob === 'auto' ? Math.ceil((SCREW.clear + 2 * wall) * 10) / 10 : Number(bossODKnob);

const standoffH = Math.max(minStandoff, maxBottomH + clearance + 1);
const floorTop = wall;
const boardZ = floorTop + standoffH;          // PCB bottom
const boardTop = boardZ + t;                  // PCB top
const wallTop = boardTop + maxTopH + headroom; // base / lid split plane
const lidTop = wallTop + wall;

// ---- Polygon helpers (plain numbers) --------------------------------------
function signedArea(poly: Pt[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}
const ccw: Pt[] = signedArea(outline) > 0 ? outline : [...outline].reverse();

// Miter offset of a simple CCW polygon; d > 0 grows it.
function offsetPoly(poly: Pt[], d: number): Pt[] {
  const n = poly.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = poly[(i - 1 + n) % n], p1 = poly[i], p2 = poly[(i + 1) % n];
    const e1 = [p1[0] - p0[0], p1[1] - p0[1]], e2 = [p2[0] - p1[0], p2[1] - p1[1]];
    const l1 = Math.hypot(e1[0], e1[1]), l2 = Math.hypot(e2[0], e2[1]);
    const n1 = [e1[1] / l1, -e1[0] / l1], n2 = [e2[1] / l2, -e2[0] / l2];
    const k = d / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
    out.push([p1[0] + (n1[0] + n2[0]) * k, p1[1] + (n1[1] + n2[1]) * k]);
  }
  return out;
}

function prism(poly: Pt[], z0: number, h: number) {
  let p = path().moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) p = p.lineTo(poly[i][0], poly[i][1]);
  return p.close().extrude(h).translate(0, 0, z0);
}

// Which board edge a port sits on: the bbox side its footprint is closest to.
type Edge = '-X' | '+X' | '-Y' | '+Y';
function portEdge(c: { x: number; y: number; w: number; d: number }): Edge {
  const dist: Array<[Edge, number]> = [
    ['-X', (c.x - c.w / 2) - bb.minX],
    ['+X', bb.maxX - (c.x + c.w / 2)],
    ['-Y', (c.y - c.d / 2) - bb.minY],
    ['+Y', bb.maxY - (c.y + c.d / 2)],
  ];
  dist.sort((a, b) => a[1] - b[1]);
  return dist[0][0];
}

// Axis-aligned box from min/max corners.
function boxMM(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
  return box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
}

// Port opening (through the wall) and collar (outside the wall), world mm.
function portGeometry(c: { x: number; y: number; w: number; d: number; h: number; side: string }) {
  const edge = portEdge(c);
  const z0 = c.side === 'top' ? boardTop - clearance : boardZ - c.h - clearance;
  const z1 = c.side === 'top' ? boardTop + c.h + clearance : boardZ + clearance;
  const along = edge === '-X' || edge === '+X'
    ? [c.y - c.d / 2 - clearance, c.y + c.d / 2 + clearance]
    : [c.x - c.w / 2 - clearance, c.x + c.w / 2 + clearance];
  const inner = { '-X': bb.minX - clearance, '+X': bb.maxX + clearance, '-Y': bb.minY - clearance, '+Y': bb.maxY + clearance }[edge];
  const sign = edge === '-X' || edge === '-Y' ? -1 : 1;
  const outer = inner + sign * wall;
  const runIn = inner - sign * 0.5;
  const runOut = outer + sign * (lipDepth + 1);
  const collarIn = outer - sign * 0.1;
  const collarOut = outer + sign * lipDepth;
  const cz0 = Math.max(0, z0 - lipWidth), cz1 = Math.min(wallTop, z1 + lipWidth);
  const a0 = along[0] - lipWidth, a1 = along[1] + lipWidth;
  const lo = (u: number, v: number) => Math.min(u, v), hi = (u: number, v: number) => Math.max(u, v);
  if (edge === '-X' || edge === '+X') {
    return {
      edge,
      cut: boxMM(lo(runIn, runOut), along[0], z0, hi(runIn, runOut), along[1], z1),
      collar: boxMM(lo(collarIn, collarOut), a0, cz0, hi(collarIn, collarOut), a1, cz1),
    };
  }
  return {
    edge,
    cut: boxMM(along[0], lo(runIn, runOut), z0, along[1], hi(runIn, runOut), z1),
    collar: boxMM(a0, lo(collarIn, collarOut), cz0, a1, hi(collarIn, collarOut), cz1),
  };
}

// ---- Base -------------------------------------------------------------------
const outerPoly = offsetPoly(ccw, clearance + wall);
const cavityPoly = offsetPoly(ccw, clearance);

let base = prism(outerPoly, 0, wallTop)
  .subtract(prism(cavityPoly, floorTop, wallTop - floorTop + 1));

for (const h of BOARD.holes) {
  const standoff = cylinder(standoffH + 0.1, bossOD / 2).translate(h.x, h.y, floorTop - 0.1);
  base = base.union(standoff);
}
BOARD.holes.forEach((h, i) => {
  base = base.hole({ byNormal: 'Z', atZ: boardZ }, {
    at: [h.x, h.y, boardZ],
    diameter: SCREW.pilot,
    depth: standoffH - 0.5,
    name: `pilot${i + 1}`,
  });
});

const ports = BOARD.components.filter(c => c.port);
for (const c of ports) base = base.union(portGeometry(c).collar);
for (const c of ports) base = base.subtract(portGeometry(c).cut);

// ---- Lid --------------------------------------------------------------------
let lid = prism(outerPoly, wallTop, wall);
const skirt = prism(offsetPoly(ccw, clearance - fit), wallTop - skirtH, skirtH + 0.1)
  .subtract(prism(offsetPoly(ccw, clearance - fit - skirtW), wallTop - skirtH - 1, skirtH + 2));
lid = lid.union(skirt);
for (const h of BOARD.holes) {
  lid = lid.union(cylinder(wallTop - boardTop + 0.1, bossOD / 2).translate(h.x, h.y, boardTop));
}
BOARD.holes.forEach((h, i) => {
  lid = lid.hole({ byNormal: 'Z', atZ: lidTop }, {
    at: [h.x, h.y, lidTop],
    diameter: SCREW.clear,
    depth: lidTop - boardTop + 0.5,
    counterbore: { diameter: SCREW.cbD, depth: SCREW.cbDepth },
    name: `clear${i + 1}`,
  });
});

// ---- PCB placeholder (board + component envelopes) --------------------------
let pcb = prism(ccw, boardZ, t);
for (const c of BOARD.components) {
  const z0 = c.side === 'top' ? boardTop - 0.1 : boardZ - c.h;
  pcb = pcb.union(boxMM(c.x - c.w / 2, c.y - c.d / 2, z0, c.x + c.w / 2, c.y + c.d / 2, z0 + c.h + 0.1));
}
for (const h of BOARD.holes) {
  pcb = pcb.subtract(cylinder(t + 0.2, h.d / 2).translate(h.x, h.y, boardZ - 0.1));
}

// Single-part views (tests probe these) carry no assembly dfmSpec.
if (VIEW === 'base') return base;
if (VIEW === 'lid') return lid;
if (VIEW === 'pcb') return pcb;

// ---- DFM declaration ----------------------------------------------------------
// minWall is the nominal wall less 0.01 mm: the min-wall gate compares
// strictly (t < minWall) on ray samples offset by 1e-4 mm, so a wall at
// exactly the declared value always fails. See spike-b2b/FINDINGS.md.
dfmSpec({
  minWall: wall - 0.01,
  minClearance: Math.min(fit, clearance) * 0.9,
  exclude: ['pcb'],
  ignore: [['lid', 'pcb']], // lid bosses clamp the PCB: designed contact
});

const asm = assembly(BOARD.name + '-enclosure');
const b = asm.part('base', base, { material: 'abs' });
const l = asm.part('lid', lid, { material: 'abs' });
const p = asm.part('pcb', pcb, { density: 1850 });
const h0 = BOARD.holes[0];
b.connector('pcb-seat', { type: 'frame', origin: { kind: 'vec3', value: [h0.x, h0.y, boardZ] } });
p.connector('pcb-seat', { type: 'frame', origin: { kind: 'vec3', value: [h0.x, h0.y, boardZ] } });
b.connector('lid-seat', { type: 'frame', origin: { kind: 'vec3', value: [h0.x, h0.y, wallTop] } });
l.connector('lid-seat', { type: 'frame', origin: { kind: 'vec3', value: [h0.x, h0.y, wallTop] } });
asm.mate('pcb-screws', 'base.pcb-seat', 'pcb.pcb-seat', 'fastened');
asm.mate('lid-screws', 'base.lid-seat', 'lid.lid-seat', 'fastened');
return asm.solvedModel({});
