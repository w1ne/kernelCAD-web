// MUSE 'table' — four-legged CNC timber table, mortise-and-tenon joinery.
// 5 independent components: tabletop panel + 4 legs. Legs carry a square
// top tenon; the tabletop carries matching bottom sockets with clearance
// (socket 5.2 half vs tenon 5.0 half; socket 5.4 deep vs tenon 5.0) so the
// assembled model is interference-free with flush leg shoulders.

// Spec defaults (mm). Half-spans raised within their documented ranges so
// the assembled envelope matches the stated 1280 x 880 x 820 overall.
const LH = 800;        // leg_height
const HW = 640;        // table_half_width  (1280 wide)
const HD = 440;        // table_half_depth  (880 deep)
const TT = 20;         // top_thickness
const TOP_R = 10;      // top_corner_radius
const LHS = 20;        // leg_half_size
const LEG_R = 3;       // leg_corner_radius
const TEN_H = 5;       // tenon half-size
const SOC_H = 5.2;     // socket half-size (clearance fit)
const TEN_Z = 5;       // tenon height
const SOC_Z = 5.4;     // socket depth (deeper than tenon)

const table = assembly('table');

// Leg centers: inset from the top edge by one leg half-size + 40 mm margin.
const inset = LHS + 40;
const cx = HW - inset; // 580
const cy = HD - inset; // 380

const legCenters = [
  ['front_left_leg', -cx, -cy],
  ['front_right_leg', cx, -cy],
  ['rear_left_leg', -cx, cy],
  ['rear_right_leg', cx, cy],
] as const;

// --- Tabletop: rounded-rect plate with four bottom sockets ---------------
// extrudeRoundedRect is center-anchored in XY with its base at z = 0.
let topShape = extrudeRoundedRect(2 * HW, 2 * HD, TOP_R, TT).translate(0, 0, LH);
for (const [, lx, ly] of legCenters) {
  const socket = box(2 * SOC_H, 2 * SOC_H, SOC_Z, true).translate(lx, ly, LH + SOC_Z / 2 - 0.01);
  topShape = topShape.subtract(socket);
}
const top = table.part('tabletop_panel', topShape.color('plate'));

// --- Legs: rounded-square column + top tenon ------------------------------
for (const [name, lx, ly] of legCenters) {
  const column = extrudeRoundedRect(2 * LHS, 2 * LHS, LEG_R, LH); // center-anchored
  const tenon = box(2 * TEN_H, 2 * TEN_H, TEN_Z, true).translate(0, 0, LH + TEN_Z / 2);
  const leg = table.part(name, column.union(tenon).translate(lx, ly, 0).color('beam'));
  leg.connector('tenon-top', { type: 'frame', origin: { kind: 'vec3', value: [lx, ly, LH] }, axis: [0, 0, 1] });
  top.connector(`socket-${name}`, { type: 'frame', origin: { kind: 'vec3', value: [lx, ly, LH] }, axis: [0, 0, 1] });
  table.mate(`${name}-to-top`, `tabletop_panel.socket-${name}`, `${name}.tenon-top`, 'fastened');
}

return table.solvedModel({});
