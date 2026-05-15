// Real Object Brief
// Artifact: Ray-Ban Meta Wayfarer smart glasses (dual-camera smart glasses).
//   Reference image: /tmp/ray-ban-stories.jpg — black Wayfarer-silhouette
//   smart glasses with dual camera bumps at upper-outer corners of the front face.
// Scale: millimetres. Overall frame ~136 mm wide × 46 mm tall × 7 mm deep;
//   lens aperture per side: top ~56 mm wide, bottom ~36 mm (Wayfarer taper);
//   bridge gap ~14 mm top / 20 mm bottom; temples ~130 mm long extending in +Y.
// Visible facts (from reference photo):
//   1. Matte-black Wayfarer silhouette: trapezoidal lens openings (top wider).
//   2. Solid frame border: top bar, bottom bar, outer angled rims, bridge.
//   3. Nose bridge: wider gap at bottom (nose-notch shape = Wayfarer key detail).
//   4. Camera bumps at outer-upper corners of front face (Meta signature).
//   5. LED indicator near bridge on right side of front face.
//   6. Temples extending backward (+Y): chunky housing, then thin arm.
// Hidden-side inference: hinge as housing step; nose pads, speakers omitted.
// Validation focus: front view shows two dark trapezoidal openings + frame + bumps;
//   side/iso show temples in +Y; camera bumps on frame outer face (not floating).
//
// Coordinate convention: Z-up, right-handed. Front view from -Y → +Y.
// Front face at Y=0. Frame body extends in +Y. Width = X. Height = Z.

// ─── Dimensions ────────────────────────────────────────────────────────────
const FRAME_DEPTH  = 7;
const BRIDGE_TOP   = 14;    // bridge width at lens top (Z=36)
const BRIDGE_BOT   = 20;    // bridge width at lens bottom (Z=0) = nose notch wider
const LENS_TOP_W   = 56;    // lens opening width at top
const LENS_BOT_W   = 36;    // lens opening width at bottom
const LENS_Z_TOP   = 36;    // Z of top edge of lens openings
const LENS_Z_BOT   = 0;     // Z of bottom edge of lens openings
const FRAME_BORDER = 5;     // minimum frame border thickness
const FRAME_W = BRIDGE_TOP + LENS_TOP_W * 2 + FRAME_BORDER * 2; // 136
const FRAME_H = LENS_Z_TOP - LENS_Z_BOT + FRAME_BORDER * 2;     // 46
const FRAME_Z_BOT = LENS_Z_BOT - FRAME_BORDER;                  // -5
const FRAME_Z_TOP = LENS_Z_TOP + FRAME_BORDER;                   // 41
const FRAME_X = -FRAME_W / 2;  // = -68 (left edge of frame)

// Camera bumps: protrude from front face (Y=0) toward camera (in -Y)
const CAMERA_R = 2.8;
const CAMERA_H = 2.5;
// Position on frame material: inner top of outer rim (just inside the lens top-outer corner)
// Outer rim inner edge at top = LENS outer edge top = ±(BRIDGE_TOP/2 + LENS_TOP_W) = ±63
// Camera bump center X = ±65 (on the outer rim material, 3mm from outer edge at Z=LENS_Z_TOP)
const BUMP_X  = 65;
const BUMP_Z  = LENS_Z_TOP - 2;  // Z=34: near top of frame

// LED indicator
const LED_Z = LENS_Z_TOP - 4;  // Z=32

// Temples
// Hinge block sits at the top outer corners, spanning Z=LENS_Z_TOP..FRAME_Z_TOP
// so that from the front view the hinge is occluded by the top bar material (Y=0..7).
const TEMPLE_LEN   = 130;
const TEMPLE_W     = 6;
const TEMPLE_H_ARM = 9;
const HINGE_LEN    = 22;
const HINGE_H      = FRAME_BORDER;  // 5mm — matches top-bar height for occlusion
const HINGE_W      = 11;
const TEMPLE_Z_BOT = LENS_Z_TOP;    // hinge bottom at Z=36, sits in top-bar band
const TEMPLE_Z_CTR = LENS_Z_TOP + FRAME_BORDER / 2;  // 38.5 — midpoint of top bar

// ─── Path helper: build XZ polygon extruded in Y direction ──────────────────
// extrudePolygon/path XY coords → extrude +Z → rotate([1,0,0],-90°) → Y extrusion
// rotate([1,0,0], -90°): (x,y_path,z) → (x, z, -y_path)
// So: y_path → z_world = -y_path → use Y_path = -Z_world in path() calls.
// z_extrude (0..depth) → y_world (0..depth). No extra translation needed. ✓

// ─── TOP BAR: full width, Z from LENS_Z_TOP to FRAME_Z_TOP (5mm tall) ───────
const topBar = path()
  .moveTo(-68, -FRAME_Z_TOP)   // left outer at Z=41
  .lineTo( 68, -FRAME_Z_TOP)   // right outer at Z=41
  .lineTo( 68, -LENS_Z_TOP)    // right inner at Z=36
  .lineTo(-68, -LENS_Z_TOP)    // left inner at Z=36
  .close()
  .extrude(FRAME_DEPTH)
  .rotate([1, 0, 0], -90);

// ─── BOTTOM BAR: full width, Z from FRAME_Z_BOT to LENS_Z_BOT (5mm tall) ────
const bottomBar = path()
  .moveTo(-68, -LENS_Z_BOT)    // left inner at Z=0
  .lineTo( 68, -LENS_Z_BOT)    // right inner at Z=0
  .lineTo( 68, -FRAME_Z_BOT)   // right outer at Z=-5
  .lineTo(-68, -FRAME_Z_BOT)   // left outer at Z=-5
  .close()
  .extrude(FRAME_DEPTH)
  .rotate([1, 0, 0], -90);

// ─── LEFT OUTER RIM: the Wayfarer taper piece on the left side ──────────────
// At Z=41 (FRAME_Z_TOP): spans X from -68 to -63 (5mm wide: outer border)
// At Z=36 (LENS_Z_TOP): spans X from -68 to -63 (same 5mm, since that's where lens top is)
// At Z=0  (LENS_Z_BOT): spans X from -68 to -46 (22mm wide: Wayfarer bottom wider)
// At Z=-5 (FRAME_Z_BOT): spans X from -68 to -46 (same as lens bottom)
// But wait: the top bar covers Z=36..41 for the full width. So the left outer rim
// can just be the lens-height region Z=0..36.
// Combined outer left piece (including the angled Wayfarer portion):
const leftOuterRim = path()
  .moveTo(-68, -LENS_Z_TOP)    // outer-top-left  x=-68, Z=36
  .lineTo(-63, -LENS_Z_TOP)    // inner-top-right x=-63, Z=36 (5mm border at top)
  .lineTo(-46, -LENS_Z_BOT)    // inner-bot-right x=-46, Z=0  (22mm border at bot)
  .lineTo(-68, -LENS_Z_BOT)    // outer-bot-left  x=-68, Z=0
  .close()
  .extrude(FRAME_DEPTH)
  .rotate([1, 0, 0], -90);

// ─── RIGHT OUTER RIM (mirror of left) ────────────────────────────────────────
const rightOuterRim = path()
  .moveTo(63, -LENS_Z_TOP)     // inner-top-left  x=63, Z=36
  .lineTo(68, -LENS_Z_TOP)     // outer-top-right x=68, Z=36
  .lineTo(68, -LENS_Z_BOT)     // outer-bot-right x=68, Z=0
  .lineTo(46, -LENS_Z_BOT)     // inner-bot-left  x=46, Z=0
  .close()
  .extrude(FRAME_DEPTH)
  .rotate([1, 0, 0], -90);

// ─── BRIDGE: nose piece between lenses, tapers wider at bottom ─────────────
// At Z=36: X from -(BRIDGE_TOP/2) to +(BRIDGE_TOP/2) = -7 to +7 (14mm)
// At Z=0:  X from -(BRIDGE_BOT/2) to +(BRIDGE_BOT/2) = -10 to +10 (20mm)
// Spans full FRAME_DEPTH in Y.
const bridge = path()
  .moveTo(-(BRIDGE_TOP / 2), -LENS_Z_TOP)   // left at Z=36
  .lineTo( (BRIDGE_TOP / 2), -LENS_Z_TOP)   // right at Z=36
  .lineTo( (BRIDGE_BOT / 2), -LENS_Z_BOT)   // right at Z=0
  .lineTo(-(BRIDGE_BOT / 2), -LENS_Z_BOT)   // left at Z=0
  .close()
  .extrude(FRAME_DEPTH)
  .rotate([1, 0, 0], -90);

// ─── Assemble frame ──────────────────────────────────────────────────────────
let glasses = topBar
  .union(bottomBar)
  .union(leftOuterRim)
  .union(rightOuterRim)
  .union(bridge);

// ─── CAMERA BUMPS on front face (outer upper corners) ────────────────────────
// Camera bumps are on the FRAME MATERIAL near the outer upper corner of each lens.
// The outer rim inner edge at Z=LENS_Z_TOP is at X=±63.
// Camera bump center at X=±65 (3mm from outer edge, ON the outer rim material).
// Bump protrudes in -Y from front face (Y=0 to Y=-CAMERA_H).
function makeCameraBump(xSign: -1 | 1) {
  return cylinder(CAMERA_H, CAMERA_R, 32)
    .alongAxis([0, 1, 0])
    .translate(xSign * BUMP_X, -CAMERA_H, BUMP_Z);
}

glasses = glasses
  .union(makeCameraBump(-1))
  .union(makeCameraBump(1));

// ─── LED INDICATOR (right side, near bridge) ─────────────────────────────────
glasses = glasses.union(
  cylinder(0.7, 1.0, 16)
    .alongAxis([0, 1, 0])
    .translate(BRIDGE_TOP / 2 + 8, -0.7, LED_Z)
);

// ─── TEMPLES ─────────────────────────────────────────────────────────────────
// Hinge block sits in the top bar area (Z=36..41) at the outer X corners.
// From the front view (Y=0), the top bar material (Y=0..7) occludes the hinge.
// Temple arm = narrower stick starting at hinge end, extending in +Y.
function makeTemple(xSign: -1 | 1) {
  // Hinge housing: small block at top corner, within top-bar Z band
  const hingeX = xSign > 0 ? FRAME_W / 2 - HINGE_W : -(FRAME_W / 2);
  const housing = box(HINGE_W, HINGE_LEN, HINGE_H)
    .translate(hingeX, FRAME_DEPTH, LENS_Z_TOP);  // Z=36..41

  // Main arm: thinner, taller stick continuing in +Y from end of hinge
  const stickX = xSign > 0 ? FRAME_W / 2 - TEMPLE_W : -(FRAME_W / 2);
  const stick  = box(TEMPLE_W, TEMPLE_LEN - HINGE_LEN, TEMPLE_H_ARM)
    .translate(stickX, FRAME_DEPTH + HINGE_LEN, TEMPLE_Z_CTR - TEMPLE_H_ARM / 2);

  return housing.union(stick);
}

glasses = glasses
  .union(makeTemple(-1))
  .union(makeTemple(1));

// ─── CENTER the model in Y so perspective front-view camera fits cleanly ──────
// Model spans Y = -CAMERA_H (-2.5) to Y = FRAME_DEPTH + TEMPLE_LEN (137).
// Without centering, the renderer places the perspective camera at -84mm from
// the origin but the front face is at Y=-67 (post-renderer-centering), only
// 17mm from the camera — causing extreme wide-angle crop in the front render.
// Shifting by -67.25 in Y puts the front face at Y=-67.25, centroid at Y=0.
const Y_CENTER = ((-CAMERA_H) + (FRAME_DEPTH + TEMPLE_LEN)) / 2;  // ≈ 67.25
return glasses.translate(0, -Y_CENTER, 0);
