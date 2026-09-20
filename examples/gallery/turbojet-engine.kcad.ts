// kernelCAD v0.17 hero — single-spool turbojet display model.
//
// A J85-class single-spool turbojet laid out stage by stage: inlet guide
// vanes, 8 compressor rotor rows with matching stator rings, can-annular
// combustor, 2 turbine stages with NGVs, and a convergent nozzle. All
// dimensions are display approximations of a J85-class spool, documented in
// the Task 15 README — this is a hero display build, not a build drawing.
//
// The shipped file carries all the stage geometry: compressor rotor discs +
// rows, stator vane rings, the outer casing halves, shaft, bearings, nose cone
// and mounts, the can-annular combustor, 2 turbine stages with NGVs, the
// exhaust cone/convergent nozzle and the fuel manifold, wired into the 42-part
// assembly with one revolute spool joint. It returns
// `engine.solvedModel({ spool: spoolDeg })`.
//
// Units: mm and degrees. Z-up; engine axis along +Z (inlet at -z, exhaust at +z).
//
// Run:
//   node dist/cli/index.js evaluate examples/gallery/turbojet-engine.kcad.ts
//   node dist/cli/index.js render   examples/gallery/turbojet-engine.kcad.ts -o /tmp/opencode/turbojet.png
//   node dist/cli/index.js parts    examples/gallery/turbojet-engine.kcad.ts --json
//   node dist/cli/index.js validate examples/gallery/turbojet-engine.kcad.ts
//   node dist/cli/index.js export step examples/gallery/turbojet-engine.kcad.ts -o /tmp/opencode/turbojet.step
//
// Task 7 display locks (measured; see the plan's Task 8 stage table):
//   - all bladed rows use 10 blades (12 max, at most 2 hero rows, never 14+)
//   - every blade root embeds 2 mm into its mount, never tangent contact:
//     rotor rows rootR = rimR - 2 (disc rim); casing/band-rooted rows
//     (stators, IGV, NGV) rootR = mountSurfaceR + 2
//   - sections use the cambered n=10 two-spline `bladeSection` below
//     (9.8x fewer export triangles than a single closed spline)

// --- Editable parameters -----------------------------------------------------
const engineLength = param('engineLength', 1200, {
  min: 900,
  max: 1500,
  description: 'Declared envelope length, inlet lip to nozzle exit (mm); the shipped bbox is verified against it in the Task 13 gate.',
});
const maxDiameter = param('maxDiameter', 460, {
  min: 300,
  max: 600,
  description: 'Declared envelope diameter, casing flange faces (mm); the shipped bbox is verified against it in the Task 13 gate.',
});
const spoolDeg = param('spoolDeg', 0, {
  min: -180,
  max: 180,
  description: 'Spool rotation (deg); 0 is the shipped static pose.',
});
const compTwistDeg = param('compTwistDeg', 0, {
  min: -20,
  max: 20,
  description: 'Uniform extra compressor blade twist (deg); 0 = locked Task 7 stagger.',
});

// --- Display palette (hex; every leaf primitive is colored before a boolean) --
const COLOR_STEEL = '#9aa2ac';       // rotor discs, shaft
const COLOR_STEEL_DARK = '#666e78';  // bearing housings, mounts, fasteners
const COLOR_ALLOY = '#c9d0da';       // compressor blades and vanes, spinner/nose cone
const COLOR_CASING = '#7b838d';      // outer casings, inlet ring, nozzle
const COLOR_COMBUSTOR = '#3f454e';   // combustor liner and cans
const COLOR_HOT = '#b5764a';         // turbine NGVs and turbine blades
const COLOR_FUEL = '#ad8a52';        // fuel manifold and injector lines

// --- Airfoil section ---------------------------------------------------------
function nacaHalfThickness(t: number, x: number): number {
  return 5 * t * (0.2969 * Math.sqrt(x) - 0.1260 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
}
function nacaCamber(m: number, p: number, x: number): number {
  return x < p
    ? (m / (p * p)) * (2 * p * x - x * x)
    : (m / ((1 - p) ** 2)) * (1 - 2 * p + 2 * p * x - x * x);
}
function nacaSlope(m: number, p: number, x: number): number {
  return x < p ? (2 * m / (p * p)) * (p - x) : (2 * m / ((1 - p) ** 2)) * (p - x);
}

/** Closed cambered section (thin-airfoil-projected). u = thickness offset,
 *  v = chordwise (-c/2..+c/2). */
function bladeSection(chord: number, thicknessRatio: number, camber = 0.05, camberPos = 0.4) {
  const n = 10;
  const upper: [number, number][] = [];
  const lower: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const x = 0.5 * (1 - Math.cos((Math.PI * i) / n));
    const yt = nacaHalfThickness(thicknessRatio, x) * chord;
    const yc = nacaCamber(camber, camberPos, x) * chord;
    const th = Math.atan(nacaSlope(camber, camberPos, x));
    upper.push([yc + yt * Math.cos(th), (x - 0.5) * chord]);
    lower.push([yc - yt * Math.cos(th), (x - 0.5) * chord]);
  }
  const back = [...lower].reverse();
  return path().moveTo(upper[0][0], upper[0][1]).spline(upper).spline(back).close();
}

// --- Blade / row / disc ------------------------------------------------------
// `rootR` is the embedded radius callers pass, so roots fuse with their mount
// instead of relying on exact tangency: rotor rows embed inward from the disc
// rim (rootR = rimR - 2); casing/band-rooted rows (stators, IGV, NGV) embed
// outward from the mount surface (rootR = mountSurfaceR + 2).
function blade(opts: {
  rootR: number; tipR: number; z: number; stations?: number;
  rootChord: number; tipChord: number; rootT: number; tipT: number;
  staggerRoot: number; staggerTip: number;
  /** Uniform extra stagger (deg) on every section, e.g. `compTwistDeg`. */
  extraTwistDeg?: Editable<number>;
}) {
  const n = opts.stations ?? 5;
  const sketches = [];
  const planes = [];
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    const r = opts.rootR + (opts.tipR - opts.rootR) * f;
    const chord = opts.rootChord + (opts.tipChord - opts.rootChord) * f;
    const t = opts.rootT + (opts.tipT - opts.rootT) * f;
    sketches.push(bladeSection(chord, t));
    const stagger = opts.staggerRoot + (opts.staggerTip - opts.staggerRoot) * f;
    const extra = opts.extraTwistDeg;
    planes.push({
      plane: 'YZ' as const,
      origin: [r, 0, opts.z] as [number, number, number],
      // ParamRef.add(n) builds a derived Param, so tasks 9-12 can pass
      // `compTwistDeg` without JS arithmetic on the ref (which throws).
      rotationDeg: extra === undefined
        ? stagger
        : typeof extra === 'number' ? extra + stagger : extra.add(stagger),
    });
  }
  return sketches[0].loft(sketches.slice(1), { planes });
}

function bladeRow(count: number, opts: Parameters<typeof blade>[0]) {
  return blade(opts).patternCircular({ count, axis: [0, 0, 1] });
}

// Compressor rows below thread `extraTwistDeg: compTwistDeg`; stator and
// turbine rows omit it and keep the locked Task 7 stagger.

function disc(hubR: number, rimR: number, webT: number, z: number, rimT = 10) {
  return path()
    .moveTo(hubR, z - webT / 2).lineTo(rimR, z - rimT / 2)
    .lineTo(rimR, z + rimT / 2).lineTo(hubR, z + webT / 2)
    .close().revolve();
}

// --- Task 9: compressor rotor discs/rows + stator vane rings ----------------
// Task 7 locked stage table: all rows 10 blades; rotor roots embed 2 mm into
// the disc rim (rootR = rimR - 2) and tips stop at BLADE_TIP_R, clear of the
// 211 casing bore. Stator vanes root 2 mm into a thin ring band at the
// casing bore and point inward; rings interleave at the midpoints of
// consecutive rotor z, plus the IGV at the inlet casing bore.

const BLADE_COUNT = 10;          // Task 7 lock: 10/row (12 max for hero rows, never 14+)
const ROOT_EMBED_MM = 2;         // Task 7 lock: blade roots bury this deep in their mount
const BLADE_TIP_R = 205;         // rotor tip radius; casing bore starts at 211
const DISC_WEB_T_MM = 18;        // rotor disc axial thickness at the hub
const STATOR_BAND_BORE_R = 205;  // stator ring band bore = vane mount surface
const STATOR_BAND_RIM_R = 218;   // band outer radius, into the casing bore region
const STATOR_BAND_WEB_T_MM = 8;  // band axial thickness at the bore
const STATOR_TIP_R = 150;        // stator vane tips, inward toward the drum
const STATOR_STAGGER_DEG = 26;   // constant vane stagger; IGV 38 / NGV 30 bracket it
const VANE_THICKNESS = 0.10;     // vane thickness ratio, locked-table vane value

// R1..R8, ascending z. hubR/rimR/chords/thickness/stagger from the Task 7 table.
const rotorStages = [
  { z: -470, hubR: 65, rimR: 150, rootChord: 52, tipChord: 46, thickness: 0.11, staggerRoot: 34, staggerTip: 42 }, // R1
  { z: -400, hubR: 70, rimR: 152, rootChord: 50, tipChord: 44, thickness: 0.10, staggerRoot: 30, staggerTip: 40 }, // R2
  { z: -330, hubR: 75, rimR: 155, rootChord: 48, tipChord: 42, thickness: 0.10, staggerRoot: 28, staggerTip: 38 }, // R3
  { z: -260, hubR: 80, rimR: 158, rootChord: 46, tipChord: 40, thickness: 0.10, staggerRoot: 26, staggerTip: 36 }, // R4
  { z: -190, hubR: 85, rimR: 160, rootChord: 44, tipChord: 38, thickness: 0.10, staggerRoot: 24, staggerTip: 34 }, // R5
  { z: -120, hubR: 90, rimR: 162, rootChord: 42, tipChord: 36, thickness: 0.10, staggerRoot: 22, staggerTip: 32 }, // R6
  { z: -50, hubR: 95, rimR: 164, rootChord: 40, tipChord: 34, thickness: 0.10, staggerRoot: 20, staggerTip: 30 }, // R7
  { z: 20, hubR: 100, rimR: 166, rootChord: 38, tipChord: 32, thickness: 0.10, staggerRoot: 18, staggerTip: 28 }, // R8
];

const rotorDiscs = [];
const rotorRows = [];
for (const stage of rotorStages) {
  rotorDiscs.push(disc(stage.hubR, stage.rimR, DISC_WEB_T_MM, stage.z).color(COLOR_STEEL));
  rotorRows.push(bladeRow(BLADE_COUNT, {
    rootR: stage.rimR - ROOT_EMBED_MM,
    tipR: BLADE_TIP_R,
    z: stage.z,
    rootChord: stage.rootChord,
    tipChord: stage.tipChord,
    rootT: stage.thickness,
    tipT: stage.thickness,
    staggerRoot: stage.staggerRoot,
    staggerTip: stage.staggerTip,
    extraTwistDeg: compTwistDeg,
  }).color(COLOR_ALLOY));
}

// Stator chord pairs [root(outer, at r=207), tip(inner, at r=150)]. Rotor rows
// leave only the 35 mm stage pitch; with the 26 deg vane stagger the axial
// half-extent is ~0.47*chord, and the rotor half-extent peaks near 23 mm at
// the R1 root, so these chords keep the rotor+stator overlap under the pitch
// with >= ~3 mm of axial gap (e.g. S1: 22.9 + 8.9 = 31.8 < 35).
const statorChords: Array<[number, number]> = [
  [30, 19], [29, 19], [29, 19], [28, 19], [28, 18], [27, 18], [27, 17],
];

function statorRing(z: number, chords: [number, number], staggerDeg: number) {
  const band = disc(STATOR_BAND_BORE_R, STATOR_BAND_RIM_R, STATOR_BAND_WEB_T_MM, z).color(COLOR_STEEL_DARK);
  const row = bladeRow(BLADE_COUNT, {
    rootR: STATOR_BAND_BORE_R + ROOT_EMBED_MM,
    tipR: STATOR_TIP_R,
    z,
    rootChord: chords[0],
    tipChord: chords[1],
    rootT: VANE_THICKNESS,
    tipT: VANE_THICKNESS,
    staggerRoot: staggerDeg,
    staggerTip: staggerDeg,
  }).color(COLOR_ALLOY);
  return { band, row };
}

const statorBands = [];
const statorRings = [];

// IGV: locked table row (42/42, 38 deg), mounted on the inlet casing bore.
const igvRow = { z: -520, chords: [42, 42] as [number, number], staggerDeg: 38 };
const igv = statorRing(igvRow.z, igvRow.chords, igvRow.staggerDeg);
statorBands.push(igv.band);
statorRings.push(igv.row);

const statorZ = rotorStages.slice(0, -1).map((stage, i) => (stage.z + rotorStages[i + 1].z) / 2);
statorZ.forEach((z, i) => {
  const ring = statorRing(z, statorChords[i], STATOR_STAGGER_DEG);
  statorBands.push(ring.band);
  statorRings.push(ring.row);
});

// --- Task 10: casing, shaft, bearings, nose cone, mounts ---------------------
// Outer casing: one revolved r-z profile from the inlet lip (zIn) to the
// turbine-exit end (zOut). The 211 mm barrel bore clears the 205 mm blade tips
// by 6 mm; the 222 mm barrel outer fully buries the 218 mm stator band rims,
// so the rings embed in the bore instead of poking through the barrel. The
// r230 flange lips set the engine's 460 mm max diameter. Subtracting a
// half-space box (y >= 0 / y <= 0) splits the shell into the two cutaway
// halves; their volumes are equal by symmetry (Task 10 gate: 8,120,162 mm³ each).
const CASING_Z_IN = -560;      // inlet lip plane
const CASING_Z_OUT = 480;      // turbine-exit end of the shell
const CASING_BORE_R = BLADE_TIP_R + 6;          // barrel bore: 6 mm over the 205 blade tips
const CASING_BARREL_R = STATOR_BAND_RIM_R + 4;  // barrel outer: 4 mm over the 218 band rims
const CASING_LIP_R = 213;      // inlet lip face, inner edge (bore tapers 211→213)
const CASING_LIP_OUT_R = 228;  // inlet lip outer face
const CASING_FLANGE_R = 230;   // front/rear flange faces (max diameter 460)
const CASING_FLANGE_T = 30;    // flange band length
const CASING_FLANGE_TAPER_T = 4; // front flange back taper, axial
const CASING_REAR_RAMP_T = 60;   // barrel outer -> rear flange ramp start
const CASING_REAR_FLANGE_T = 50; // rear flange ramp end
const CASING_AFT_LIP_R = 7;    // aft end face, radial step over the bore
const CASING_LIP_T = 8;        // inlet lip axial taper

const casingProfile = path()
  .moveTo(CASING_LIP_R, CASING_Z_IN)                        // inlet lip, inner
  .lineTo(CASING_LIP_OUT_R, CASING_Z_IN)                    // inlet lip, outer
  .lineTo(CASING_FLANGE_R, CASING_Z_IN + CASING_FLANGE_T)   // front flange face
  .lineTo(CASING_BARREL_R, CASING_Z_IN + CASING_FLANGE_T + CASING_FLANGE_TAPER_T)
  .lineTo(CASING_BARREL_R, CASING_Z_OUT - CASING_REAR_RAMP_T)  // main barrel outer
  .lineTo(CASING_FLANGE_R, CASING_Z_OUT - CASING_REAR_FLANGE_T) // rear flange
  .lineTo(CASING_FLANGE_R, CASING_Z_OUT - CASING_FLANGE_T)  // rear flange face
  .lineTo(CASING_BORE_R + CASING_AFT_LIP_R, CASING_Z_OUT)   // aft end face
  .lineTo(CASING_BORE_R, CASING_Z_OUT)                      // aft bore lip
  .lineTo(CASING_BORE_R, CASING_Z_IN + CASING_LIP_T)        // barrel bore
  .lineTo(CASING_LIP_R, CASING_Z_IN)                        // inlet lip taper
  .close();

const casingShell = casingProfile.revolve().color(COLOR_CASING);
// Half-space cutters shared by the casing shell and (Task 12) the convergent
// nozzle: subtracting the y>=0 box keeps y<0, the y<=0 box keeps y>0.
const casingCutLower = box(800, 400, 1400).translate(-400, 0, -700);      // removes y >= 0
const casingCutUpper = box(800, 400, 1400).translate(-400, -400, -700);  // removes y <= 0
const lowerHalf = casingShell.subtract(casingCutLower);   // keeps y < 0
const upperHalf = casingShell.subtract(casingCutUpper);   // keeps y > 0
const casingHalves = [lowerHalf, upperHalf];

// Stepped spool drum: Ø44 main journal + Ø60 lands at the two bearing
// stations, with a collar under every rotor disc. Each collar is sized
// line-to-line with its disc bore (compressor r65..r100 from the Task 9
// table, turbine r110 from Task 11) and spans the 18 mm web with 2 mm of
// margin each side, so each disc rides on shaft material instead of the
// journal passing it in open air. A literal 2 mm radial shrink fit would
// share ≈15,000-25,000 mm³ with each disc (ten pairs over the 20 mm³ clash
// cap); the display fit is line-to-line — zero clearance and zero shared
// volume — which still registers as material contact in the joint-mesh
// probe. The collars stay well inside the r150 stator vane tips and leave
// the nose-cone/exhaust-cone interfaces unchanged.
const SHAFT_MAIN_R = 22;         // Ø44 main journal
const SHAFT_LAND_R = 30;         // Ø60 bearing lands
const SHAFT_FRONT_Z = -545;      // nose end, buried in the spinner
const SHAFT_REAR_Z = 470;        // rear end, inside the casing aft bore
const SHAFT_FRONT_LAND_Z = -482; // front land ends at the R1 disc front face
const SHAFT_REAR_LAND_Z = 426;   // rear land starts at the T2 collar aft shoulder
const DRUM_COLLAR_T = 22;        // collar axial length: 18 mm web + 2 mm margin each side
const drumCollars: Array<{ z: number; r: number }> = [
  ...rotorStages.map((stage) => ({ z: stage.z, r: stage.hubR })),
  { z: 303, r: 110 },            // T1 disc bore (Task 11 table)
  { z: 415, r: 110 },            // T2 disc bore (Task 11 table)
];
let shaftPen = path()
  .moveTo(0, SHAFT_FRONT_Z)
  .lineTo(SHAFT_LAND_R, SHAFT_FRONT_Z)
  .lineTo(SHAFT_LAND_R, SHAFT_FRONT_LAND_Z)
  .lineTo(SHAFT_MAIN_R, SHAFT_FRONT_LAND_Z);
for (const collar of drumCollars) {
  const z0 = collar.z - DRUM_COLLAR_T / 2;
  const z1 = collar.z + DRUM_COLLAR_T / 2;
  shaftPen = shaftPen
    .lineTo(SHAFT_MAIN_R, z0)
    .lineTo(collar.r, z0)
    .lineTo(collar.r, z1)
    .lineTo(SHAFT_MAIN_R, z1);
}
const shaftShape = shaftPen
  .lineTo(SHAFT_LAND_R, SHAFT_REAR_LAND_Z)
  .lineTo(SHAFT_LAND_R, SHAFT_REAR_Z)
  .lineTo(0, SHAFT_REAR_Z)
  .close().revolve().color(COLOR_STEEL);

// Bearing housings: annular support diaphragms with 1 mm radial play on the
// lands and their r214 rims buried 3 mm into the 211 casing bore. Front
// housing in the IGV..R1 window: axial half-extents follow (chord/2)*cos(stagger)
// (rotationDeg is CCW in the YZ plane), so the IGV row spans z -536.55..-503.45
// at r150..207 and R1's leading edge reaches z -491.55 at r148. With
// BEARING_WEB_SLOPE = 2 the front web's leading face runs -500 (hub) to
// -501.90 (r207) -> 1.55 mm clear of the IGV TE; its trailing face runs -498
// (r214) to -492 (hub) -> 3.66 mm clear of R1 at r148. A slope of 4 penetrated
// the IGV TE by 0.36 mm; a constant-thickness web would leave only 0.45 mm to
// R1. The rear housing now sits at z 448 (moved aft 24 mm when T2's axial
// separation was fixed): its leading face at r170 is z 446.62, so 2.4 mm clear
// of T2's TE (z 444.2 at r170); the rim still embeds in the casing bore
// (z 448..456 < casing end 480) and the hub bore rides the rear land
// (404..470). Re-measure when the Task 12 assembly lands.
const BEARING_BORE_R = 31;                  // 1 mm over the Ø60 land
const BEARING_HUB_R = 72;
const BEARING_RIM_R = CASING_BORE_R + 3;    // 3 mm into the casing bore
const BEARING_FRONT_Z = -500;    // front hub, leading face
const BEARING_REAR_Z = 448;      // rear hub, leading face (2.4 mm aft of T2's TE at r170)
const BEARING_WEB_SLOPE = 2;     // rim face offset toward the casing
const BEARING_HUB_T = 8;         // hub axial length
function bearingHousing(z: number) {
  return path()
    .moveTo(BEARING_BORE_R, z)
    .lineTo(BEARING_HUB_R, z)
    .lineTo(BEARING_RIM_R, z - BEARING_WEB_SLOPE)
    .lineTo(BEARING_RIM_R, z + BEARING_WEB_SLOPE)
    .lineTo(BEARING_HUB_R, z + BEARING_HUB_T)
    .lineTo(BEARING_BORE_R, z + BEARING_HUB_T)
    .close().revolve().color(COLOR_STEEL_DARK);
}
const bearingHousingFront = bearingHousing(BEARING_FRONT_Z);
const bearingHousingRear = bearingHousing(BEARING_REAR_Z);
const bearingHousings = [bearingHousingFront, bearingHousingRear];

// Nose cone: ellipsoidal spinner on the shaft nose (tip z=-612, base r60 at
// z=-503, 3 mm ahead of the front bearing housing). At the IGV plane it is
// only r59, far inside the r150 IGV tips, so it cannot swallow the IGV row.
const NOSE_TIP_Z = -612;
const NOSE_BASE_Z = -503;
const NOSE_BASE_R = 60;
const NOSE_STATIONS = 8;
const nosePoints: [number, number][] = [[0, NOSE_TIP_Z]];
for (let i = 1; i <= NOSE_STATIONS; i++) {
  const t = i / NOSE_STATIONS;
  nosePoints.push([
    NOSE_BASE_R * Math.sqrt(t * (2 - t)),
    NOSE_TIP_Z + (NOSE_BASE_Z - NOSE_TIP_Z) * t,
  ]);
}
const noseCone = path()
  .moveTo(0, NOSE_TIP_Z)
  .spline(nosePoints)
  .lineTo(0, NOSE_BASE_Z)
  .close().revolve().color(COLOR_ALLOY);

// Engine mounts: a plate saddling the casing crown plus a transverse trunnion
// pin (the suspension attachment). The front mount rides the +y crown at
// z=-478 and the rear mount the -y crown at z=420. The front plate is shortened
// to 70 mm so it sits in the 75 mm axial window between the IGV band
// (z -525..-515) and the S1 band (z -440..-430): plate -513..-443 -> 2 mm to
// the IGV band and 3 mm to S1 (a 90 mm plate would dip into the IGV band where
// the flat inner face at r217 passes inside the r218 band rim). Both plates
// embed 5 mm into the casing barrel (face r217, bore r211, outer r222), which
// is intended contact.
const MOUNT_FRONT_Z = -478;
const MOUNT_REAR_Z = 420;
const MOUNT_PLATE_R0 = 217;      // plate inner face, inside the barrel crown
const MOUNT_PLATE_T = 60;        // plate radial thickness
const MOUNT_PLATE_W = 80;        // plate width, both sides of x=0
const MOUNT_PLATE_L = 70;        // plate fore-aft length (front window fit)
const MOUNT_TRUNNION_R = 14;
const MOUNT_TRUNNION_L = 150;
const mountTrunnionY = MOUNT_PLATE_R0 + MOUNT_PLATE_T / 2;
function mount(z: number, side: 1 | -1) {
  const y0 = side === 1 ? MOUNT_PLATE_R0 : -MOUNT_PLATE_R0 - MOUNT_PLATE_T;
  return box(MOUNT_PLATE_W, MOUNT_PLATE_T, MOUNT_PLATE_L).color(COLOR_STEEL_DARK)
    .translate(-MOUNT_PLATE_W / 2, y0, z - MOUNT_PLATE_L / 2)
    .union(cylinder(MOUNT_TRUNNION_L, MOUNT_TRUNNION_R).color(COLOR_STEEL_DARK)
      .rotateY(90).translate(-MOUNT_TRUNNION_L / 2, side * mountTrunnionY, z));
}
const mountFront = mount(MOUNT_FRONT_Z, 1);
const mountRear = mount(MOUNT_REAR_Z, -1);
const mounts = [mountFront, mountRear];

// --- Task 11: combustor, turbine, exhaust, fuel manifold ---------------------
//
// Hot-section z stations. The spool rotates (Task 12 revolute, spoolDeg ±180),
// so rotor blade envelopes must not overlap NGV vane envelopes at ANY phase —
// a circumferential phase sweep at the Task 8 table stations (250/300/340/380)
// measured real interferences (ngv1-t1 1.148 mm at 26 deg, ngv2-t2 0.000 mm
// interfering at 28-32 deg: rotating a blade between two vanes closes the
// tangential gap). The fix is axial separation at every static/rotating
// interface: z_B - z_A >= halfA + halfB + 1.5 mm, with half = (chord/2)*cos(stagger).
// Chosen stations: NGV1 250 (half 23.8) / T1 303 (half 27.0) / NGV2 358
// (half 25.6) / T2 415 (half 29.2); consecutive axial gaps 2.2 / 2.4 / 2.2 mm.
// The rear bearing housing moved 424 -> 448 for the same reason, leaving
// 2.4 mm to T2's trailing edge at r170 (see its comment below).
const NGV_VANE_THICKNESS = 0.11;   // table vane value, locked for both rings
const hotNgvStages = [
  { z: 250, tipR: 170, chord: 55, staggerDeg: 30 }, // NGV1
  { z: 358, tipR: 172, chord: 58, staggerDeg: 28 }, // NGV2
];
const TURBINE_HUB_R = 110;         // disc bore; 80 mm clear of the r30 shaft land
const TURBINE_BLADE_T = 0.12;      // table rotor value, locked for both stages
const hotTurbineStages = [
  { z: 303, rimR: 168, rootChord: 60, tipChord: 52, staggerRoot: 26, staggerTip: 44 }, // T1
  { z: 415, rimR: 170, rootChord: 64, tipChord: 56, staggerRoot: 24, staggerTip: 42 }, // T2
];

function ngvRing(stage: { z: number; tipR: number; chord: number; staggerDeg: number }) {
  // Same mount as the compressor stators: a band at the casing bore with the
  // vane roots buried 2 mm into it, pointing inward toward the drum.
  const band = disc(STATOR_BAND_BORE_R, STATOR_BAND_RIM_R, STATOR_BAND_WEB_T_MM, stage.z)
    .color(COLOR_STEEL_DARK);
  const row = bladeRow(BLADE_COUNT, {
    rootR: STATOR_BAND_BORE_R + ROOT_EMBED_MM,
    tipR: stage.tipR,
    z: stage.z,
    rootChord: stage.chord,
    tipChord: stage.chord,
    rootT: NGV_VANE_THICKNESS,
    tipT: NGV_VANE_THICKNESS,
    staggerRoot: stage.staggerDeg,
    staggerTip: stage.staggerDeg,
  }).color(COLOR_HOT);
  return { band, row };
}

const ngvBands = [];
const ngvRows = [];
for (const stage of hotNgvStages) {
  const ring = ngvRing(stage);
  ngvBands.push(ring.band);
  ngvRows.push(ring.row);
}

const turbineDiscs = [];
const turbineRows = [];
for (const stage of hotTurbineStages) {
  turbineDiscs.push(disc(TURBINE_HUB_R, stage.rimR, DISC_WEB_T_MM, stage.z).color(COLOR_STEEL));
  turbineRows.push(bladeRow(BLADE_COUNT, {
    rootR: stage.rimR - ROOT_EMBED_MM,
    tipR: BLADE_TIP_R,
    z: stage.z,
    rootChord: stage.rootChord,
    tipChord: stage.tipChord,
    rootT: TURBINE_BLADE_T,
    tipT: TURBINE_BLADE_T,
    staggerRoot: stage.staggerRoot,
    staggerTip: stage.staggerTip,
  }).color(COLOR_HOT));
}

// Can-annular combustor, all inside the 211 barrel bore: outer casing shell,
// liner shell, then 8 cans on a 136 mm circle inside the liner. The shells
// form a line-to-line touching chain — outer casing outer = the 211 barrel
// bore, liner outer = the 196 outer casing bore, can outer edge
// (136 + 28 = 164) = the liner bore — so every combustor mate partner is
// material-connected. (A 1 mm radial embed would share 100,000+ mm³ with the
// barrel; the display fit is zero-clearance, zero shared volume.) The cans
// still sit forward of the NGV1 vane leading edge (226.2) and aft of the R8
// blade trailing edge (~38 at these radii).
const CAN_COUNT = 8;
const CANS_R = 136;                // can centreline radius
const CAN_BODY_R = 28;             // Ø56 body: 108..164 radial
const CAN_BODY_FRONT_Z = 118;
const CAN_BODY_AFT_Z = 188;
const CAN_SNOUT_R = 10;
const CAN_SNOUT_FRONT_Z = 75;
const CAN_SNOUT_AFT_Z = 95;        // 5 mm buried in the dome

const COMBUSTOR_CASING_BORE_R = 196;   // outer casing bore = liner outer (line-to-line)
const COMBUSTOR_CASING_R = CASING_BORE_R; // 211: outer touches the barrel bore
const COMBUSTOR_CASING_FRONT_Z = 58;
const COMBUSTOR_CASING_AFT_Z = 190;    // 36.2 mm forward of the NGV1 vane LE
const COMBUSTOR_LINER_BORE_R = CANS_R + CAN_BODY_R; // 164 = can outer edge
const COMBUSTOR_LINER_R = COMBUSTOR_CASING_BORE_R;  // 196: liner outer touches the casing bore
const COMBUSTOR_LINER_FRONT_Z = 75;
const COMBUSTOR_LINER_AFT_Z = 186;
function shell(boreR: number, outR: number, zFront: number, zAft: number) {
  return path()
    .moveTo(boreR, zFront).lineTo(outR, zFront)
    .lineTo(outR, zAft).lineTo(boreR, zAft)
    .close().revolve();
}
const combustorOuterCasing = shell(
  COMBUSTOR_CASING_BORE_R, COMBUSTOR_CASING_R,
  COMBUSTOR_CASING_FRONT_Z, COMBUSTOR_CASING_AFT_Z,
).color(COLOR_CASING);
const combustorLiner = shell(
  COMBUSTOR_LINER_BORE_R, COMBUSTOR_LINER_R,
  COMBUSTOR_LINER_FRONT_Z, COMBUSTOR_LINER_AFT_Z,
).color(COLOR_COMBUSTOR);
const canBody = cylinder(CAN_BODY_AFT_Z - CAN_BODY_FRONT_Z, CAN_BODY_R)
  .translate(CANS_R, 0, CAN_BODY_FRONT_Z).color(COLOR_COMBUSTOR);
const canDome = sphere(CAN_BODY_R)
  .translate(CANS_R, 0, CAN_BODY_FRONT_Z).color(COLOR_COMBUSTOR);
const canSnout = cylinder(CAN_SNOUT_AFT_Z - CAN_SNOUT_FRONT_Z, CAN_SNOUT_R)
  .translate(CANS_R, 0, CAN_SNOUT_FRONT_Z).color(COLOR_COMBUSTOR);
const combustorCans = canSnout.union(canDome, canBody)
  .patternCircular({ count: CAN_COUNT, axis: [0, 0, 1] });

// Fuel manifold: a torus on the can circle plus 8 injector lines, each buried
// 5 mm into its can snout (intended contact, documented in the Task 13 ignore
// table). The ring clears the R8 blade TE by ~13 mm and the casing bore by
// 62 mm; it is inside the barrel at the casing mouth.
const FUEL_TORUS_TUBE_R = 8;
const FUEL_MANIFOLD_Z = 60;
const FUEL_LINE_R = 4;
const FUEL_LINE_FRONT_Z = 50;      // ~13.6 mm aft of the R8 TE at this radius
const FUEL_LINE_AFT_Z = 80;        // 5 mm into the can snout
const fuelTorus = torus(CANS_R, FUEL_TORUS_TUBE_R, 96)
  .translate(0, 0, FUEL_MANIFOLD_Z).color(COLOR_FUEL);
const fuelLine = cylinder(FUEL_LINE_AFT_Z - FUEL_LINE_FRONT_Z, FUEL_LINE_R)
  .translate(CANS_R, 0, FUEL_LINE_FRONT_Z).color(COLOR_FUEL);
const fuelManifold = fuelTorus.union(
  fuelLine.patternCircular({ count: CAN_COUNT, axis: [0, 0, 1] }),
);

// Exhaust cone (tail plug): a hollow cone whose base annulus is buried 2 mm
// into the rear bearing hub aft face (z 432) so it reads as mounted. Its r33
// bore clears the Ø60 rear land (r30) by 3 mm and swallows the shaft end
// (z 470); the tip at z 585 sits inside the nozzle.
const EXHAUST_CONE_BASE_Z = 454;   // 2 mm into the bearing hub (aft face 456)
const EXHAUST_CONE_BASE_R = 72;
const EXHAUST_CONE_BORE_R = 33;
const EXHAUST_CONE_BORE_Z = 470;   // shaft rear land ends here
const EXHAUST_CONE_TIP_Z = 585;
const exhaustCone = path()
  .moveTo(EXHAUST_CONE_BORE_R, EXHAUST_CONE_BASE_Z)
  .lineTo(EXHAUST_CONE_BASE_R, EXHAUST_CONE_BASE_Z)
  .lineTo(0, EXHAUST_CONE_TIP_Z)
  .lineTo(EXHAUST_CONE_BORE_R, EXHAUST_CONE_BORE_Z)
  .close().revolve().color(COLOR_STEEL_DARK);

// Convergent nozzle: a shell butted on the casing aft face (z 480, r 211..218)
// converging to the exit plane z 640 (r 142..150, 8 mm wall). The exit plane
// puts the inlet lip -> exit length at the declared engineLength 1200
// (-560..640); the nose cone tip reaches 52 mm further forward (-612).
const NOZZLE_EXIT_Z = 640;
const NOZZLE_EXIT_R = 150;
const NOZZLE_WALL_T = 8;
const nozzleConvergent = path()
  .moveTo(CASING_BORE_R, CASING_Z_OUT)
  .lineTo(CASING_BORE_R + CASING_AFT_LIP_R, CASING_Z_OUT)
  .lineTo(NOZZLE_EXIT_R, NOZZLE_EXIT_Z)
  .lineTo(NOZZLE_EXIT_R - NOZZLE_WALL_T, NOZZLE_EXIT_Z)
  .close().revolve().color(COLOR_CASING);

// Declared envelopes (the Task 13 gate verifies the shipped bbox against
// them); spoolDeg is consumed by the solvedModel pose map below.
void [engineLength, maxDiameter];

// =============================================================================
// Task 12: assembly wiring — every sub-shape is a named part.
// =============================================================================
// Budget: (1 + 3*limitedMates + 3*revoluteMates) x parts <= 300. One revolute
// with limitsDeg => (1 + 3 + 3) x 42 = 294. Landing on 42 required three
// merges beyond "every blob its own part":
//   1. convergent nozzle -> split by the same half-space cutters as the
//      casing and unioned into the two casing halves (both COLOR_CASING);
//   2. exhaust cone -> unioned into the rear bearing housing (both
//      COLOR_STEEL_DARK);
//   3. each band + vane row stator unit is ONE part (IGV + 7 stators + 2
//      NGVs) — the unit's boolean color lineage follows the row, so the vane
//      color (alloy / hot) is the part color; bands sit inside the casing
//      bore and only add structure.
// There is no separate `inletRing` part: the casing inlet lip serves as the
// inlet ring (Task 8/10 profile), so no ring shape is invented.
const nozzleLower = nozzleConvergent.subtract(casingCutLower);
const nozzleUpper = nozzleConvergent.subtract(casingCutUpper);

const engine = assembly('kernelCAD v0.17 turbojet');

// G0 migration shim (same pattern as examples/portfolio/pocket-watch-v2,
// lines 254-279): the v0.5 `fixed(label, parent, child, {origin})` shortcut
// was removed in favor of the mate vocabulary. Every shape here is authored
// in WORLD coordinates and the part placement is identity, so both frame
// connectors sit at the shared world origin — the fastened zero pose is the
// authored pose.
function frameConnector(origin: [number, number, number]) {
  return { type: 'frame' as const, origin: { kind: 'vec3' as const, value: origin } };
}
let fastenSeq = 0;
type PartRef = ReturnType<typeof engine.part>;
type PartShape = Parameters<typeof engine.part>[1];
function fixedMate(parent: PartRef, child: PartRef) {
  const slot = ++fastenSeq;
  parent.connector(`fastener-${slot}-parent`, frameConnector([0, 0, 0]));
  child.connector(`fastener-${slot}-child`, frameConnector([0, 0, 0]));
  engine.mate(`fixed-${slot}`, `${parent.name}.fastener-${slot}-parent`, `${child.name}.fastener-${slot}-child`, 'fastened');
}
function fixed(parent: PartRef, name: string, shape: PartShape): PartRef {
  const child = engine.part(name, shape);
  fixedMate(parent, child);
  return child;
}

// Task 10 staging arrays consumed by position: casingHalves = [lower, upper],
// bearingHousings = [front, rear].
const [casingLower, casingUpper] = casingHalves;
const [bearingFront, bearingRear] = bearingHousings;

// Ground: lower casing half + its half of the convergent nozzle.
const ground = engine.part('casing-lower-half', casingLower.union(nozzleLower));
const casingUpperPart = fixed(ground, 'casing-upper-half', casingUpper.union(nozzleUpper));

// Merged static vane units: `row.union(band)` keeps the row as the boolean
// base, so lookupSourceColor resolves the part to the row's color — alloy for
// the IGV and compressor stators, hot for the NGVs. Discs and blade rows stay
// separate parts so steel vs alloy/hot both survive.
const statorUnitNames = ['stator-ring-igv'];
fixed(ground, 'stator-ring-igv', statorRings[0].union(statorBands[0]));
for (let i = 1; i < statorRings.length; i++) {
  const name = `stator-ring-${i}`;
  statorUnitNames.push(name);
  fixed(ground, name, statorRings[i].union(statorBands[i]));
}
fixed(ground, 'ngv-1', ngvRows[0].union(ngvBands[0]));
fixed(ground, 'ngv-2', ngvRows[1].union(ngvBands[1]));

// Remaining static parts, fastened to the half/neighbour they actually
// touch. Task 10 staging array mounts = [front crown (+y), rear crown (-y)]:
// the front mount embeds in the upper half's barrel, so it hangs off
// casing-upper-half, not the ground lower half.
fixed(ground, 'bearing-front', bearingFront);
fixed(ground, 'bearing-rear', bearingRear.union(exhaustCone)); // Task 12 merge 2
fixed(casingUpperPart, 'mount-front', mounts[0]);
fixed(ground, 'mount-rear', mounts[1]);
// Combustor chain: outer casing rides the barrel bore, liner rides the outer
// casing bore, cans ride the liner bore, manifold is buried in the can
// snouts — each mate partner is material-connected (line-to-line contacts).
const combustorOuterPart = fixed(ground, 'combustor-outer', combustorOuterCasing);
const combustorLinerPart = fixed(combustorOuterPart, 'combustor-liner', combustorLiner);
const combustorCansPart = fixed(combustorLinerPart, 'combustor-cans', combustorCans);
fixed(combustorCansPart, 'fuel-manifold', fuelManifold);

// The single revolute: casing lower half <-> shaft on the engine axis (world
// origin, +Z). `concealed` because the spool bearing lives inside the
// assembled casing; +/-180 keeps the display pose a full turn.
const shaft = engine.part('shaft', shaftShape);
ground.connector('spool-axis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 0, 1],
});
shaft.connector('spool-axis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 0, 1],
});
engine.mate('spool', 'casing-lower-half.spool-axis', 'shaft.spool-axis', 'revolute', {
  limitsDeg: [-180, 180],
  exposure: 'concealed',
});

// Rotor stack. Discs are fastened to the shaft (each rides its drum collar);
// blade rows are fastened to the disc they root into, not to the shaft —
// the root embed is the real joint, and the shaft never reaches blade radii.
fixed(shaft, 'nose-cone', noseCone);
for (let i = 0; i < rotorDiscs.length; i++) {
  const discPart = fixed(shaft, `compressor-disc-${i + 1}`, rotorDiscs[i]);
  fixed(discPart, `compressor-blades-${i + 1}`, rotorRows[i]);
}
const turbineDisc1 = fixed(shaft, 'turbine-disc-1', turbineDiscs[0]);
const turbineDisc2 = fixed(shaft, 'turbine-disc-2', turbineDiscs[1]);
fixed(turbineDisc1, 'turbine-blade-1', turbineRows[0]);
fixed(turbineDisc2, 'turbine-blade-2', turbineRows[1]);

// Intended contacts (the Task 13 table): design-intent embeds whose shared
// volume exceeds the 20 mm^3 clash cap. `ignore` silences only the validator
// diagnostic stream — the raw detector still measures every pair. Reasons:
//   - stator/NGV band rims embed 7 mm into the 211 mm casing bore (both halves);
//   - bearing rims embed 3 mm into the casing bore (both halves);
//   - mount plates embed 5 mm into the casing barrel (front -> upper half,
//     rear -> lower half);
//   - rotor blade roots embed 2 mm into their disc rims;
//   - the spinner base swallows the shaft nose;
//   - injector lines bury 5 mm into the can snouts.
// The stepped-drum/disc and combustor-chain contacts are line-to-line (zero
// shared volume), so they need no ignore entry and stay visible to the raw
// detector.
const casingBoreParts = [...statorUnitNames, 'ngv-1', 'ngv-2', 'bearing-front', 'bearing-rear'];
const intendedContacts: Array<readonly [string, string]> = [
  ...casingBoreParts.flatMap((name): Array<readonly [string, string]> => [
    ['casing-lower-half', name],
    ['casing-upper-half', name],
  ]),
  ['casing-upper-half', 'mount-front'],
  ['casing-lower-half', 'mount-rear'],
  ['shaft', 'nose-cone'],
  ['combustor-cans', 'fuel-manifold'],
  ...rotorDiscs.map((_, i): readonly [string, string] => [
    `compressor-disc-${i + 1}`,
    `compressor-blades-${i + 1}`,
  ]),
  ['turbine-disc-1', 'turbine-blade-1'],
  ['turbine-disc-2', 'turbine-blade-2'],
];

return engine.solvedModel({ spool: spoolDeg }, { ignore: intendedContacts });
