// MUSE 'handless_comb' — single-piece resin comb: curved ergonomic grip
// ridge, continuous spine, 20 evenly spaced inner teeth, and reinforced
// (longer, wider) start/end teeth. One monolithic fused solid.
//
// Authored in a build frame with the comb length along X and the tooth
// direction along -Y, extruded 3 mm, then rotated so the final envelope is
// ~3 x 35 x 65 mm (thickness on X) as the spec's coordinate convention asks.

const THICK = 3;        // comb_width — overall thickness
const LEN = 65;         // comb length (teeth_count * gap + reinforced ends)
const TEETH_LEN = 20;   // teeth_length — functional tooth length
const SPINE_D = 6;      // teeth_length_2 — spine depth
const TEETH_N = 20;     // teeth_count
const PITCH = 3;        // teeth_gap_distance
const TOOTH_W = 1.5;    // tooth width (half the pitch)
const TIP_OFF = 1;      // teeth_height — inner-tooth tip offset
const END_EXTRA = 4;    // start_and_end_teeth_height — reinforced end teeth
const BEND = 8;         // hand_part_bending_level — grip ridge bulge

// Spine band: y in [TEETH_LEN, TEETH_LEN + SPINE_D].
const spine = box(LEN, SPINE_D, THICK).translate(0, TEETH_LEN, 0);

// Curved grip ridge: circular-arc bump on the spine's back edge, bulging by
// BEND. Lens-shaped region between the chord and the arc.
const grip = path()
  .moveTo(2, TEETH_LEN + SPINE_D)
  .sagittaArc(LEN - 2, TEETH_LEN + SPINE_D, BEND)
  .close()
  .extrude(THICK);

// Inner teeth: 20 thin bars, tips at y = TIP_OFF, overlapping the spine by
// 0.5 mm. Patterned along X at the tooth pitch.
const innerSpan = (TEETH_N - 1) * PITCH; // 57
const firstCenter = (LEN - innerSpan) / 2; // 4
const innerTooth = box(TOOTH_W, TEETH_LEN - TIP_OFF + 0.5, THICK)
  .translate(firstCenter - TOOTH_W / 2, TIP_OFF, 0);
const innerTeeth = innerTooth.patternLinear({ count: TEETH_N, direction: [1, 0, 0], spacing: PITCH });

// Reinforced boundary teeth: wider and END_EXTRA longer (tips below y = 0
// by END_EXTRA - TIP_OFF) to guard the inner teeth and guide hair.
const endToothLen = TEETH_LEN + END_EXTRA - TIP_OFF + 0.5;
const endToothW = 2.5;
const startTooth = box(endToothW, endToothLen, THICK).translate(0, TIP_OFF - END_EXTRA, 0);
const endTooth = box(endToothW, endToothLen, THICK).translate(LEN - endToothW, TIP_OFF - END_EXTRA, 0);

const combFlat = spine.union(grip, innerTeeth, startTooth, endTooth);

// Reorient: thickness onto X, length onto Z (final envelope ~3 x 35 x 65).
return combFlat
  .rotate([0, 1, 0], 90)
  .translate(0, 0, LEN)
  .color('plate');
