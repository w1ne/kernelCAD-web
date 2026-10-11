// Real Object Brief
// Artifact: a four-door compact executive sedan with the proportions and
//   surface language of the 1998–2001 BMW E46 3 Series saloon (pre-facelift).
//   Gallery / demo piece: NO maker logos, roundels or lettering anywhere.
// Scale: millimetres. Published dimensions (sources in ./PROVENANCE.md):
//   length 4471, width 1739, height 1415, wheelbase 2725, track 1481 / 1488,
//   tyres 205/55 R16 (Ø632).
// Frame: x = s = distance back from the front bumper, y = left (+) / right (-),
//   z = up from the tyre contact patch.
// How it is built:
//   - Longitudinal tables (sill, widest line, shoulder crease, belt / bonnet /
//     deck edge, roof, ...) are monotone cubics through knots set from the
//     reference views; each station becomes a closed degree-3 nurbsSegment
//     section on a YZ plane. Three nearly coincident control points make the
//     shoulder crease crisp; everything else stays smooth.
//   - Stations are graded (fine at the bumpers, ~230 mm along the cabin);
//     the loft runs 3 spans at a time with shared end sections (meshes fast).
//   - Glass, window trim, lamps, grille surround and bumper strips are thin
//     conformal skins: (loft grown by t) ∩ mask − (loft grown by t0). On the
//     bumper faces the offset also uses the loft shifted along x (offX), since
//     a YZ-section offset is ~0 there. Recesses (kidneys, intake, plates) are
//     mask ∩ (loft − loft shifted back by the depth), so they follow the sloped
//     nose. Panel gaps are 4 mm grooves, 3.5 mm deep, made the same way.
// Validation focus: side (long bonnet, cabin set back, Hofmeister kink,
//   shoulder line through the door handles), nose (twin kidneys, four round
//   lamps under two lenses), tail (L-shaped lamps, bumper strip), wheels
//   (5 double-spoke 16" alloys, brake discs behind).

// --- Published dimensions ----------------------------------------------------
const L = 4471;
const WB = 2725;
const FO = 770; // front overhang (estimate, see PROVENANCE.md)
const AX: [number, number] = [FO, FO + WB];
const TRACK: [number, number] = [1481, 1488];
const TYRE_R = 316; // 205/55 R16: 16 x 25.4 / 2 + 0.55 x 205 = 316 mm
const PAINT = { baseColor: '#c3c7cb', metalness: 0.3, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.04 }; // Titanium Silver metallic
const BLACK_TRIM = { baseColor: '#0c0d0f', metalness: 0.05, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.2 };
const DARK_PLASTIC = { baseColor: '#2b2d31', metalness: 0.05, roughness: 0.6 };
const CHROME = { baseColor: '#e4e7ea', metalness: 1, roughness: 0.08 };

type P = [number, number];
type V3 = [number, number, number];

// Monotone cubic (Fritsch–Carlson) through [s, v] knots: smooth, never overshoots.
function curve(knots: number[][]): (s: number) => number {
  const n = knots.length;
  const xs = knots.map((k) => k[0]);
  const ys = knots.map((k) => k[1]);
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m: number[] = [d[0]];
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
    if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return (s: number) => {
    if (s <= xs[0]) return ys[0];
    if (s >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (s > xs[i + 1]) i++;
    const hh = xs[i + 1] - xs[i], t = (s - xs[i]) / hh, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * hh * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * hh * m[i + 1];
  };
}
const bell = (s: number, c: number, w: number): number => Math.exp(-(((s - c) / w) ** 2));

// --- Longitudinal tables (lower body) -----------------------------------------
// Underside / sill line
const zSill = curve([[0, 420], [10, 330], [30, 270], [70, 240], [160, 222], [400, 212], [900, 205], [1500, 200], [3000, 203], [3700, 210], [4050, 228], [4250, 250], [4350, 272], [4410, 300], [4445, 340], [4462, 390], [4471, 470]]);
// Height of the widest line
const zMax = curve([[0, 470], [40, 480], [200, 500], [800, 520], [2400, 540], [3800, 560], [4300, 580], [4471, 520]]);
// Half-width at the widest line (plan view)
const wMaxBase = curve([[0, 300], [8, 450], [20, 560], [40, 645], [70, 712], [110, 764], [160, 803], [230, 832], [320, 851], [430, 862], [560, 867], [900, 869], [3500, 869.5], [3920, 864], [4070, 853], [4190, 836], [4290, 813], [4355, 790], [4395, 766], [4425, 738], [4445, 708], [4458, 674], [4466, 636], [4471, 580]]);
const wMax = (s: number): number => wMaxBase(s) + 3 * bell(s, AX[0], 330) + 4 * bell(s, AX[1], 380) - 3 * bell(s, (AX[0] + AX[1]) / 2, 650);
// Shoulder crease (character line) height
const zShoulder = curve([[0, 560], [40, 620], [110, 680], [230, 724], [400, 748], [900, 786], [1500, 822], [2500, 858], [3500, 888], [4100, 908], [4290, 914], [4380, 912], [4420, 895], [4440, 860], [4455, 780], [4465, 700], [4471, 600]]);
// Belt / bonnet edge / deck edge height
const zBelt = curve([[0, 470], [8, 540], [20, 590], [40, 636], [70, 676], [110, 706], [160, 728], [230, 745], [320, 760], [560, 795], [880, 842], [1250, 897], [1450, 926], [1600, 944], [2000, 958], [2600, 973], [3100, 985], [3450, 997], [3600, 1010], [3800, 1030], [4000, 1043], [4200, 1050], [4300, 1052], [4360, 1048], [4395, 1036], [4420, 1010], [4438, 960], [4450, 890], [4459, 810], [4465, 740], [4469, 660], [4471, 560]]);
// Crown of the bonnet / deck above the belt at the centreline
const zCrown = curve([[0, 0], [40, 6], [110, 16], [230, 22], [560, 30], [1000, 30], [1450, 18], [1600, 8], [3600, 8], [3900, 16], [4250, 16], [4400, 10], [4471, 0]]);
// Half-width of the bonnet / deck edge
const wTopEdge = curve([[0, 220], [8, 380], [20, 490], [40, 570], [70, 632], [110, 682], [160, 720], [230, 748], [320, 766], [560, 786], [1450, 798], [2200, 806], [3000, 804], [3520, 796], [3920, 784], [4070, 770], [4190, 752], [4290, 730], [4355, 708], [4395, 686], [4425, 660], [4445, 630], [4458, 592], [4466, 545], [4471, 460]]);

// --- Greenhouse tables -----------------------------------------------------------
const GH0 = 1440, GH1 = 3640;
const zRoof = curve([[1440, 948], [1500, 1018], [1600, 1102], [1750, 1205], [1900, 1290], [2050, 1356], [2200, 1396], [2450, 1415], [2700, 1412], [2900, 1394], [3050, 1352], [3200, 1282], [3350, 1196], [3500, 1110], [3640, 1040]]);
const wRail = curve([[1440, 712], [1500, 704], [1750, 668], [2050, 628], [2300, 618], [2700, 618], [2950, 610], [3200, 592], [3450, 566], [3640, 540]]);

// --- Sections ----------------------------------------------------------------------
// Offset a right-half control polygon (bottom -> top centre) outward by g mm.
function offsetHalf(half: P[], g: number): P[] {
  if (g === 0) return half;
  const n = half.length;
  return half.map((p, i) => {
    if (i === 0) return [p[0] + g, p[1] - g] as P;
    const prev = half[i - 1];
    const next: P = i === n - 1 ? [-half[n - 2][0], half[n - 2][1]] : half[i + 1];
    let tx = next[0] - prev[0], tz = next[1] - prev[1];
    const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    return [i === n - 1 ? 0 : p[0] + g * tz, p[1] - g * tx] as P;
  });
}
function section(half: P[]): Sketch {
  const pts: P[] = half.slice();
  for (let i = half.length - 2; i >= 0; i--) pts.push([-half[i][0], half[i][1]]);
  const [w0, z0] = half[0];
  return path().moveTo(-w0, z0).lineTo(w0, z0).nurbsSegment(pts, { degree: 3 }).close();
}
function lowerHalf(s: number): P[] {
  const zs = zSill(s), wM = wMax(s), zB = zBelt(s), wB = wTopEdge(s);
  const zSh = Math.min(zShoulder(s), zB - 12);
  const zM = Math.min(zMax(s), zs + 0.6 * (zSh - zs));
  const zT = zB + zCrown(s);
  const wSh = Math.max(wM - 4, wB + 14);
  return [
    [wM - 120, zs],
    [wM - 28, zs],
    [wM - 8, zs + 14],
    [wM - 10, zs + 0.45 * (zM - zs)],
    [wM, zM],
    [wM - 1, zM + 0.55 * (zSh - zM)],
    [wSh - 7, Math.max(zSh - 34, zM + 0.8 * (zSh - zM))], // slight undercut under the crease
    [wSh, zSh - 3], // shoulder crease: three nearly coincident control points
    [wSh - 0.4, zSh],
    [wSh - 9, zSh + 3],
    [wB + 0.5 * (wSh - wB), zSh + 0.5 * (zB - zSh)],
    [wB, zB],
    [wB * 0.72, zT],
    [wB * 0.32, zT],
    [0, zT],
  ];
}
function greenhouseHalf(s: number): P[] {
  const zB = zBelt(s), zR = zRoof(s), wB = wTopEdge(s) - 24, wR = wRail(s), h = zR - zB;
  return [
    [wB - 8, zB - 80],
    [wB, zB],
    [wB - 0.42 * (wB - wR), zB + 0.5 * h],
    [wR + 30, zR - 0.1 * h - 8],
    [wR * 0.6, zR],
    [0, zR],
  ];
}
function loftAt(stations: number[], half: (s: number) => P[], grow: number): Shape {
  const sk = stations.map((s) => section(offsetHalf(half(s), grow)));
  return sk[0].loft(sk.slice(1), {
    planes: stations.map((s) => ({ plane: 'YZ' as const, origin: [s, 0, 0] as V3 })),
  });
}
// Loft in short runs that share their end sections (meshes fast), then fuse.
// Memoised: the body, skins and recesses reuse the same lofts.
const loftCache = new Map<string, Shape>();
// NOTE: transforms mutate a Shape in place — never translate a cached loft;
// use loftFresh() for a copy that will be moved.
function loftFresh(stations: number[], half: (s: number) => P[], grow = 0, span = 3): Shape {
  const parts: Shape[] = [];
  for (let i = 0; i < stations.length - 1; i += span) parts.push(loftAt(stations.slice(i, Math.min(i + span + 1, stations.length)), half, grow));
  return parts.length === 1 ? parts[0] : parts[0].union(...parts.slice(1));
}
function loftRuns(stations: number[], half: (s: number) => P[], grow = 0, span = 3): Shape {
  const key = `${half === lowerHalf ? 'L' : 'G'}|${stations.join(',')}|${grow}|${span}`;
  const hit = loftCache.get(key);
  if (hit) return hit;
  const built = loftFresh(stations, half, grow, span);
  loftCache.set(key, built);
  return built;
}

// Graded stations: fine at the bumpers, ~230 mm along the cabin.
const LOWER_ST = [0, 8, 20, 40, 70, 110, 160, 230, 320, 430, 560, 710, 880, 1060, 1250, 1450,
  1680, 1910, 2140, 2370, 2600, 2830, 3060, 3290, 3520, 3740, 3920, 4070, 4190, 4290, 4355, 4395, 4425, 4445, 4458, 4466, 4471];
const NOSE_ST = LOWER_ST.slice(0, 13); // 0 .. 880 (run boundary)
const NOSE_R = LOWER_ST.slice(0, 10); // 0 .. 430: nose face, lamps, grille
const MID_ST = LOWER_ST.slice(12, 25); // 880 .. 3520: doors
const TAIL_ST = LOWER_ST.slice(24); // 3520 .. 4471 (run boundary)
const GH_ST = [GH0, 1500, 1600, 1750, 1900, 2050, 2200, 2450, 2700, 2900, 3050, 3200, 3350, 3500, GH1];

// --- 2D helpers and mask prisms -----------------------------------------------------
// Side-view polygon (s, z) extruded through the whole width.
const prismSide = (pts: P[], halfY = 1200): Shape => extrudePolygon(pts, 2 * halfY).rotateX(90).translate(0, halfY, 0);
// Side-view polygon on one side only (y from y0 to y1 > y0).
const prismSideY = (pts: P[], y0: number, y1: number): Shape => extrudePolygon(pts, y1 - y0).rotateX(90).translate(0, y1, 0);
// Front-view polygon (y, z) extruded along x from x0 to x1.
const prismFront = (pts: P[], x0: number, x1: number): Shape => extrudePolygon(pts, x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
// Plan-view polygon (s, y) extruded along z from z0 to z1.
const prismPlan = (pts: P[], z0: number, z1: number): Shape => extrudePolygon(pts, z1 - z0).translate(0, 0, z0);
// Closed thin band of half-width hw around a polyline.
function band(line: P[], hw: number): P[] {
  const left: P[] = [], right: P[] = [];
  for (let i = 0; i < line.length; i++) {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    left.push([line[i][0] - hw * ty, line[i][1] + hw * tx]);
    right.push([line[i][0] + hw * ty, line[i][1] - hw * tx]);
  }
  return left.concat(right.reverse());
}
// Offset a closed polygon outward by d (either winding).
function offsetPoly(pts: P[], d: number): P[] {
  let area = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a[0] * b[1] - b[0] * a[1]; }
  const sgn = area > 0 ? 1 : -1;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    return [p[0] + sgn * d * ty, p[1] - sgn * d * tx] as P;
  });
}
const mirrorY = (pts: P[]): P[] => pts.map(([y, z]) => [-y, z] as P).reverse();
const arc = (cx: number, cz: number, r: number, a0: number, a1: number, n = 10): P[] =>
  Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + ((a1 - a0) * i) / n) * Math.PI / 180; return [cx + r * Math.cos(a), cz + r * Math.sin(a)] as P; });

// Conformal pieces on the lower body / greenhouse.
const lowerLoft = (st: number[], g = 0): Shape => loftRuns(st, lowerHalf, g);
const ghLoft = (g = 0): Shape => loftRuns(GH_ST, greenhouseHalf, g, 7);
// Offset that also works on the bumper faces: a YZ-plane section offset alone
// is ~0 mm on a face whose normal runs along x, so combine it with the loft
// shifted along x (dir +1 = nose, faces -x; dir -1 = tail, faces +x).
const shiftCache = new Map<string, Shape>();
// The lower loft over `st` moved by dx along x (built once per (st, dx)).
function shiftedLoft(st: number[], dx: number): Shape {
  if (dx === 0) return lowerLoft(st);
  const key = `${st[0]}-${st[st.length - 1]}|${dx}`;
  const hit = shiftCache.get(key);
  if (hit) return hit;
  const built = loftFresh(st, lowerHalf).translate(dx, 0, 0);
  shiftCache.set(key, built);
  return built;
}
const offCache = new Map<string, Shape>();
function offX(st: number[], g: number, dir: 1 | -1): Shape {
  if (g === 0) return lowerLoft(st);
  const key = `${st[0]}-${st[st.length - 1]}|${g}|${dir}`;
  const hit = offCache.get(key);
  if (hit) return hit;
  const shifted = shiftedLoft(st, -dir * g);
  const built = g > 0 ? lowerLoft(st, g).union(shifted) : lowerLoft(st, g).intersect(shifted);
  offCache.set(key, built);
  return built;
}
const endSkin = (st: number[], mask: Shape, t0: number, t1: number, dir: 1 | -1): Shape =>
  offX(st, t1, dir).intersect(mask).subtract(offX(st, t0, dir));
// Skin from t0 to t1 mm off the surface, limited to `mask`.
const lowerSkin = (st: number[], mask: Shape, t0: number, t1: number): Shape => lowerLoft(st, t1).intersect(mask).subtract(lowerLoft(st, t0));
const ghSkin = (mask: Shape, t0: number, t1: number): Shape => ghLoft(t1).intersect(mask).subtract(ghLoft(t0));

// --- Body --------------------------------------------------------------------------
const lower = lowerLoft(LOWER_ST);
const cabin = ghLoft();

// Wheel wells: a revolved tub per corner with a rolled inner lip, cut only
// through the outer flank.
const ARCH_R = TYRE_R + 42;
const archCut = (s: number, side: 1 | -1, halfTrack: number): Shape =>
  path().moveTo(0, 0).lineTo(ARCH_R, 0).lineTo(ARCH_R, 330).threePointsArc(ARCH_R - 50, 400, ARCH_R - 14, 386)
    .lineTo(0, 400).close()
    .revolve()
    .alongAxis([0, side, 0])
    .translate(s, side * (halfTrack - 230), TYRE_R);

// Front face openings (front view, y left +). Kidneys: rounded, slightly
// wider at the top, leaning back with the nose.
const KIDNEY: P[] = [[28, 612], [60, 606], [130, 606], [166, 614], [182, 640], [184, 690], [174, 724], [130, 736], [60, 736], [34, 728], [24, 700], [22, 640]];
const INTAKE: P[] = [[-430, 262], [430, 262], [404, 400], [-404, 400]];
const PLATE_F: P[] = [[-262, 412], [262, 412], [262, 520], [-262, 520]];
const PLATE_R: P[] = [[-262, 330], [262, 330], [262, 446], [-262, 446]];
// Layer of the nose (dir +1) or tail (dir -1) between a and b mm behind the
// outer surface, measured along x: loft shifted by a minus loft shifted by b.
// Robust at the bumper faces, where an offset loft would invert.
const layer = (st: number[], dir: 1 | -1, a: number, b: number): Shape =>
  shiftedLoft(st, dir * a).subtract(shiftedLoft(st, dir * b));
// Cutters only need their inner bound: subtracting from the body clips the rest.
const kidneyPockets = [prismFront(KIDNEY, -50, 500), prismFront(mirrorY(KIDNEY), -50, 500)].map((k) => k.subtract(shiftedLoft(NOSE_R, 45)));
const intakePocket = prismFront(INTAKE, -50, 300).subtract(shiftedLoft(NOSE_R, 45));
const platePockets = [prismFront(PLATE_F, -50, 300).subtract(shiftedLoft(NOSE_R, 8)), prismFront(PLATE_R, 4100, 4560).subtract(shiftedLoft(TAIL_ST, -8))];

// Panel-gap grooves: 4 mm wide, 3.5 mm deep under the outer surface.
const G = 2;
const doorBottom = 300; // door lower edge over the sill
const sideLines: P[][] = [
  [[1520, zBelt(1520) + 2], [1514, 760], [1500, 520], [1494, doorBottom]], // front door leading edge
  [[2575, zBelt(2575) + 2], [2572, doorBottom]], // B-pillar shut line
  [[3410, zBelt(3410) + 2], [3402, 820], ...arc(AX[1], TYRE_R, ARCH_R + 64, 108, 172, 8)], // rear door trailing edge around the arch
  [[1494, doorBottom], [AX[1] - ARCH_R - 62, doorBottom]], // door bottoms
  [[-30, 610], [150, 612], [340, 612], [AX[0] - ARCH_R - 4, 596]], // front bumper top
  [[AX[1] + ARCH_R + 4, 690], [4200, 718], [4380, 734], [4520, 736]], // rear bumper top
];
const topLines: P[][] = [
  [[GH0 + 6, wTopEdge(GH0) - 28], [1000, wTopEdge(1000) - 28], [560, wTopEdge(560) - 30], [300, wTopEdge(300) - 34], [200, 690], [176, 520], [172, 0], [176, -520], [200, -690], [300, -(wTopEdge(300) - 34)], [560, -(wTopEdge(560) - 30)], [1000, -(wTopEdge(1000) - 28)], [GH0 + 6, -(wTopEdge(GH0) - 28)]], // bonnet
  [[GH1 + 20, wTopEdge(GH1) - 40], [4100, wTopEdge(4100) - 42], [4300, wTopEdge(4300) - 50], [4400, 545], [4430, 545]], // boot lid, left
  [[GH1 + 20, -(wTopEdge(GH1) - 40)], [4100, -(wTopEdge(4100) - 42)], [4300, -(wTopEdge(4300) - 50)], [4400, -545], [4430, -545]], // boot lid, right
];
const rearLines: P[][] = [[[575, 1070], [575, 772], [550, 752], [-550, 752], [-575, 772], [-575, 1070]], [[-800, 742], [-600, 744], [600, 744], [800, 742]]];
const inner = lowerLoft(LOWER_ST, -3.5);
const grooves: Shape[] = [
  ...sideLines.map((l) => prismSide(band(l, G)).subtract(inner)),
  prismSideY(arc(3900, 860, 72 + G, 0, 354, 30), -1200, 0).subtract(prismSideY(arc(3900, 860, 72 - G, 0, 354, 30), -1200, 0), inner),
  ...topLines.map((l) => prismPlan(band(l, G), 640, 1200).subtract(prismPlan(band(l, G + 2), 0, 1200).intersect(inner))),
  ...rearLines.map((l) => prismFront(band(l, G), 4250, 4560).subtract(offX(TAIL_ST, -3.5, -1))),
];

const body = lower
  .union(cabin)
  .subtract(
    archCut(AX[0], 1, TRACK[0] / 2), archCut(AX[0], -1, TRACK[0] / 2),
    archCut(AX[1], 1, TRACK[1] / 2), archCut(AX[1], -1, TRACK[1] / 2),
    ...kidneyPockets, intakePocket, ...platePockets, ...grooves,
  )
  .material(PAINT);

// --- Glass and black window surround ------------------------------------------------
// Daylight opening in side view: door glass + fixed quarter light with the
// Hofmeister kink (the rear lower corner turns forward).
const DLO: P[] = [
  [1700, zBelt(1700) + 10], [1640, 1010], [1880, 1188], [2100, 1300], [2330, 1350], [2600, 1362], [2860, 1346], [3040, 1300],
  [3200, 1222], [3320, 1150], [3420, 1092], [3462, 1068], [3448, 1046], [3380, zBelt(3380) + 10],
  [3000, zBelt(3000) + 10], [2400, zBelt(2400) + 10],
];
const B_PILLAR: P[] = [[2540, 900], [2640, 900], [2640, 1500], [2540, 1500]];
const Q_DIVIDER: P[] = [[3248, 900], [3270, 900], [3330, 1400], [3308, 1400]];
const MIRROR_SAIL: P[] = [[1560, zBelt(1560) + 4], [1700, zBelt(1700) + 10], [1640, 1010], [1585, 1000]];
const sideGlassMask = prismSide(DLO).subtract(prismSide(B_PILLAR), prismSide(Q_DIVIDER));
const SCREEN: P[] = [[-680, 900], [680, 900], [640, 1200], [600, 1500], [-600, 1500], [-640, 1200]];
const REAR_SCREEN: P[] = [[-600, 990], [600, 990], [575, 1200], [540, 1500], [-540, 1500], [-575, 1200]];
const screenMask = prismFront(SCREEN, 1420, 2090);
const rearScreenMask = prismFront(REAR_SCREEN, 3070, 3700);
const glass = ghSkin(union(sideGlassMask, screenMask, rearScreenMask), 0, 5)
  .material({ baseColor: '#1a2128', metalness: 0.2, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.02 });
const trimMask = prismSide(offsetPoly(DLO, 24)).subtract(prismSide(DLO))
  .union(prismSide(B_PILLAR).intersect(prismSide(DLO)), prismSide(Q_DIVIDER).intersect(prismSide(DLO)), prismSide(MIRROR_SAIL))
  .subtract(screenMask, rearScreenMask);
const windowTrim = ghSkin(trimMask, 0, 3).union(lowerSkin(MID_ST, prismSide(offsetPoly(DLO, 24)).intersect(prismSide([[1500, 880], [3500, 880], [3500, 1060], [1500, 1060]])), 0, 3))
  .material(BLACK_TRIM);

// --- Front: headlamps, kidney grille, bumper ------------------------------------------
// One lens per side over two round lamps; the lens wraps into the wing.
const HEAD: P[] = [[212, 618], [420, 608], [620, 610], [730, 626], [804, 660], [826, 700], [800, 726], [620, 740], [420, 748], [224, 748], [204, 708]];
const EYES: [number, number][] = [[318, 70], [530, 70]];
const eyeAt = (y: number, r: number): Shape => cylinder(500, r).alongAxis([1, 0, 0]).translate(-60, y, 676);
const headlamp = (side: 1 | -1): Shape[] => {
  const pts = side === 1 ? HEAD : mirrorY(HEAD);
  const mask = prismFront(pts, -50, 400);
  // Dark reflector bowl behind the clear lens; one lens outline per side
  // (bright rim), the two round lamps as chrome rings with white cores.
  const housing = endSkin(NOSE_R, mask, -1.5, 1.5, 1).material({ baseColor: '#9aa3ab', metalness: 0.9, roughness: 0.18 });
  const lens = endSkin(NOSE_R, prismFront(offsetPoly(pts, 7), -50, 400).subtract(mask), -1.5, 3, 1).material({ baseColor: '#d7dde3', metalness: 0.6, roughness: 0.1, clearcoat: 1 });
  const rings = endSkin(NOSE_R, union(...EYES.map(([y, r]) => eyeAt(side * y, r).subtract(eyeAt(side * y, r - 10))), ...EYES.map(([y]) => eyeAt(side * y, 44).subtract(eyeAt(side * y, 37)))), 1.5, 5, 1).material(CHROME);
  const cores = endSkin(NOSE_R, union(...EYES.map(([y]) => eyeAt(side * y, 22))), 1.5, 3, 1).material({ baseColor: '#f6f8fa', metalness: 0.1, roughness: 0.1 });
  const IND: P[] = [[680, 618], [748, 632], [800, 660], [776, 668], [680, 644]];
  const indicator = endSkin(NOSE_R, prismFront(side === 1 ? IND : mirrorY(IND), -50, 400), 1.5, 3, 1)
    .material({ baseColor: '#e9c79a', metalness: 0.4, roughness: 0.05, clearcoat: 1 });
  return [housing, lens, rings, cores, indicator];
};
const grow2 = (pts: P[], d: number): P[] => offsetPoly(pts, d);
const kidneySurround = (side: 1 | -1): Shape => {
  const pts = side === 1 ? KIDNEY : mirrorY(KIDNEY);
  const ring = prismFront(grow2(pts, 14), -50, 400).subtract(prismFront(pts, -50, 400));
  return shiftedLoft(NOSE_R, -6).intersect(ring).subtract(shiftedLoft(NOSE_R, 6)).material(CHROME);
};
const kidneyInsert = (side: 1 | -1): Shape => {
  const pts = side === 1 ? KIDNEY : mirrorY(KIDNEY);
  const slats: Shape[] = [];
  for (let y = 44; y <= 200; y += 20) slats.push(box(400, 7, 170).translate(-50, side * y - 3.5, 578));
  const mask = prismFront(pts, -50, 500);
  const backing = layer(NOSE_R, 1, 40, 45).intersect(mask);
  const slatBand = layer(NOSE_R, 1, 8, 40).intersect(mask, union(...slats));
  return backing.union(slatBand).material({ baseColor: '#141518', metalness: 0.3, roughness: 0.35 });
};
const intakeGrille = layer(NOSE_R, 1, 40, 45).intersect(prismFront(INTAKE, -50, 300)).material(DARK_PLASTIC);
const fog = (side: 1 | -1): Shape => endSkin(NOSE_R, cylinder(400, 48).alongAxis([1, 0, 0]).translate(-60, side * 610, 350), -1.5, 3, 1)
  .material({ baseColor: '#e6ecef', metalness: 0.4, roughness: 0.04, clearcoat: 1 });

// Bumper strips: dark protective inserts front, sides (doors) and rear at one height.
const STRIP_Z: [number, number] = [458, 482];
// One continuous strip per side (bumper corner -> doors -> bumper corner),
// interrupted only by the wheel arches; front and rear bumper centres join the sides.
const stripSide = (side: 1 | -1, s0: number, s1: number, st: number[], dz0: number, dz1: number): Shape =>
  lowerSkin(st, prismSideY([[s0, STRIP_Z[0] + dz0], [s1, STRIP_Z[0] + dz1], [s1, STRIP_Z[1] + dz1], [s0, STRIP_Z[1] + dz0]], side === 1 ? 0 : -1200, side === 1 ? 1200 : 0), -1.5, 5)
    .material(DARK_PLASTIC);
const frontStrip = endSkin(NOSE_R, prismSide([[-50, STRIP_Z[0]], [AX[0] - ARCH_R - 20, STRIP_Z[0] + 4], [AX[0] - ARCH_R - 20, STRIP_Z[1] + 4], [-50, STRIP_Z[1]]]), -1.5, 5, 1).material(DARK_PLASTIC);
const rearStrip = endSkin(TAIL_ST, prismSide([[AX[1] + ARCH_R + 20, STRIP_Z[0] + 14], [4520, STRIP_Z[0] + 16], [4520, STRIP_Z[1] + 16], [AX[1] + ARCH_R + 20, STRIP_Z[1] + 14]]), -1.5, 5, -1).material(DARK_PLASTIC);

// --- Rear: L-shaped wrap-around tail lamps ----------------------------------------------
// Outer part (quarter panel) is the tall leg of the L; the inner arm runs into the boot lid.
const TAIL: P[] = [[310, 946], [572, 940], [580, 800], [786, 790], [842, 812], [860, 880], [856, 964], [818, 994], [560, 1004], [316, 1006], [298, 980]];
const tailMask = (side: 1 | -1, pts: P[]): Shape => prismFront(side === 1 ? pts : mirrorY(pts), 4150, 4520);
const tailLamp = (side: 1 | -1): Shape[] => {
  const red = endSkin(TAIL_ST, tailMask(side, TAIL), -1.5, 3, -1).material({ baseColor: '#a3121b', metalness: 0.2, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02 });
  const amber = endSkin(TAIL_ST, tailMask(side, [[600, 900], [846, 896], [852, 920], [600, 924]]), 1.5, 5, -1).material({ baseColor: '#c96a2a', metalness: 0.2, roughness: 0.05, clearcoat: 1 });
  const white = endSkin(TAIL_ST, tailMask(side, [[330, 956], [560, 952], [560, 978], [330, 982]]), 1.5, 5, -1).material({ baseColor: '#e3e5e8', metalness: 0.4, roughness: 0.06, clearcoat: 1 });
  return [red, amber, white];
};
const rearDiffuser = endSkin(TAIL_ST, prismFront([[-780, 250], [780, 250], [790, 310], [-790, 310]], 4150, 4520), -1.5, 3, -1).material(DARK_PLASTIC);

// --- Door handles, mirrors, exhaust -----------------------------------------------------------
const handle = (s: number, side: 1 | -1): Shape => {
  const z = zShoulder(s) - 46;
  return extrudeRoundedRect(150, 24, 11, 20).rotateX(90).translate(s, side === 1 ? wMax(s) + 6 : -(wMax(s) - 14), z)
    .intersect(lowerLoft(MID_ST, 12)).subtract(lowerLoft(MID_ST, -1.5));
};
// Mirror: a rounded wedge housing (wide, low, rounded outboard end) on a
// short stalk from the sail panel in front of the door glass.
const mirrorShell = (side: 1 | -1): Shape => sphere(1).scale([110, 128, 70]).translate(1715, side * 872, 1040);
const mirror = (side: 1 | -1): Shape => {
  const housing = mirrorShell(side).intersect(box(140, 300, 200, true).translate(1675, side * 872, 1040)); // x 1605 .. 1745
  const stalk = box(110, 150, 40, true).translate(1660, side * 775, 1012);
  return housing.union(stalk);
};
const mirrorGlass = (side: 1 | -1): Shape => box(4, 300, 200, true).translate(1747, side * 872, 1040)
  .intersect(sphere(1).scale([300, 110, 56]).translate(1747, side * 878, 1040));
const exhaust = cylinder(170, 36).alongAxis([1, 0, 0]).translate(4320, 520, 250)
  .subtract(cylinder(180, 30).alongAxis([1, 0, 0]).translate(4320, 520, 250))
  .material({ baseColor: '#c8ccd0', metalness: 1, roughness: 0.2 });

// --- Wheels: 205/55 R16 tyres on 16" five double-spoke alloys ---------------------------------
// Built around +Z (outboard face at +z), then turned outward.
const tyreSolid = (): Shape =>
  path().moveTo(203, -96).lineTo(203, 96)
    .threePointsArc(276, 102, 245, 106)
    .threePointsArc(316, 52, 306, 86)
    .lineTo(316, -52)
    .threePointsArc(276, -102, 306, -86)
    .threePointsArc(203, -96, 245, -106)
    .close()
    .revolve();
const rimSolid = (): Shape => {
  const barrel = path().moveTo(180, -92).lineTo(203, -96).lineTo(203, 56).lineTo(212, 64).lineTo(208, 74).lineTo(192, 72).lineTo(184, 46).close().revolve();
  const hub = path().moveTo(0, 28).lineTo(84, 28).lineTo(90, 46).lineTo(74, 60).lineTo(0, 62).close().revolve();
  // Spokes: tapered, dished towards the hub.
  const spoke = (ang: number): Shape =>
    extrudePolygon([[70, -12], [192, -15], [192, 15], [70, 12]], 22).translate(0, 0, 36).rotate([0, 1, 0], -6, [70, 0, 58]).rotateZ(ang);
  const sp: Shape[] = [];
  for (let k = 0; k < 5; k++) { const a = k * 72; sp.push(spoke(a - 8), spoke(a + 8)); }
  const spokes = union(...sp).intersect(cylinder(160, 196).translate(0, 0, -60));
  const bolts: Shape[] = [];
  for (let k = 0; k < 5; k++) { const a = (k * 72 + 36) * Math.PI / 180; bolts.push(cylinder(10, 9).translate(50 * Math.cos(a), 50 * Math.sin(a), 58)); }
  const cap = cylinder(8, 30).translate(0, 0, 60);
  return barrel.union(hub, spokes, cap, ...bolts);
};
const discSolid = (): Shape => cylinder(26, 150).translate(0, 0, -64).subtract(cylinder(40, 72).translate(0, 0, -70));
const caliperSolid = (): Shape => box(110, 64, 56, true).translate(0, 132, -48).rotateZ(-35);
const placeWheel = (shape: Shape, s: number, side: 1 | -1, halfTrack: number): Shape =>
  shape.rotateX(side === 1 ? -90 : 90).translate(s, side * halfTrack, TYRE_R);

// Wheel-well liners: dark shell just inside each arch cut, clipped to the body envelope.
const liner = (s: number, side: 1 | -1, halfTrack: number): Shape => {
  const tub = (r: number): Shape => path().moveTo(0, 0).lineTo(r, 0).lineTo(r, 400).lineTo(0, 400).close().revolve()
    .alongAxis([0, side, 0]).translate(s, side * (halfTrack - 230), TYRE_R);
  return tub(ARCH_R).subtract(tub(ARCH_R - 8)).intersect(lowerLoft(LOWER_ST, -3.5), prismPlan([[s - 600, side * 380], [s + 600, side * 380], [s + 600, side * 1000], [s - 600, side * 1000]], 150, 700))
    .material({ baseColor: '#141516', metalness: 0, roughness: 0.9 });
};

// --- Assembly -------------------------------------------------------------------------------
const car = assembly('sedan study, E46 proportions');
car.part('body', body);
car.part('glass', glass);
car.part('window-trim', windowTrim);
car.part('bumper-strip-front', frontStrip);
car.part('bumper-strip-rear', rearStrip);
car.part('intake-grille', intakeGrille);
car.part('rear-diffuser', rearDiffuser);
car.part('exhaust', exhaust);
for (const [tag, side] of [['left', 1], ['right', -1]] as [string, 1 | -1][]) {
  const [housing, lens, rings, cores, indicator] = headlamp(side);
  car.part(`headlamp-housing-${tag}`, housing);
  car.part(`headlamp-lens-${tag}`, lens);
  car.part(`headlamp-rings-${tag}`, rings);
  car.part(`headlamp-cores-${tag}`, cores);
  car.part(`indicator-${tag}`, indicator);
  car.part(`kidney-surround-${tag}`, kidneySurround(side));
  car.part(`kidney-grille-${tag}`, kidneyInsert(side));
  car.part(`fog-lamp-${tag}`, fog(side));
  const [red, amber, white] = tailLamp(side);
  car.part(`tail-lamp-${tag}`, red);
  car.part(`tail-indicator-${tag}`, amber);
  car.part(`reverse-lamp-${tag}`, white);
  car.part(`side-strip-${tag}`, stripSide(side, AX[0] + ARCH_R + 70, AX[1] - ARCH_R - 70, MID_ST, 8, 12));
  car.part(`mirror-${tag}`, mirror(side).material(PAINT));
  car.part(`mirror-glass-${tag}`, mirrorGlass(side).material({ baseColor: '#59616a', metalness: 1, roughness: 0.04 }));
  car.part(`door-handle-front-${tag}`, handle(2330, side).material(PAINT));
  car.part(`door-handle-rear-${tag}`, handle(3150, side).material(PAINT));
}
const corners: [string, number, 1 | -1, number][] = [
  ['front-left', AX[0], 1, TRACK[0] / 2], ['front-right', AX[0], -1, TRACK[0] / 2],
  ['rear-left', AX[1], 1, TRACK[1] / 2], ['rear-right', AX[1], -1, TRACK[1] / 2],
];
for (const [name, s, side, ht] of corners) {
  car.part(`liner-${name}`, liner(s, side, ht));
  car.part(`tyre-${name}`, placeWheel(tyreSolid(), s, side, ht).material({ baseColor: '#1b1c1e', metalness: 0, roughness: 0.85 }));
  car.part(`rim-${name}`, placeWheel(rimSolid(), s, side, ht).material({ baseColor: '#cfd3d7', metalness: 0.9, roughness: 0.2 }));
  car.part(`brake-disc-${name}`, placeWheel(discSolid(), s, side, ht).material({ baseColor: '#80858b', metalness: 0.85, roughness: 0.4 }));
  car.part(`caliper-${name}`, placeWheel(caliperSolid(), s, side, ht).material({ baseColor: '#3a3d42', metalness: 0.5, roughness: 0.5 }));
}
return car.model();
