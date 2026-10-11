// Knurled control knob
//
// Prompt: "Knurled control knob: 40 mm diameter x 22 mm, diamond-knurled
// grip, raised pointer mark on top, 6 mm D-shaft bore, M3 set-screw hole
// through the side."
//
// Words -> geometry:
//   "diamond-knurled grip" -> two twisted extrusions of the same V-tooth ring,
//                             one twisted left, one right, INTERSECTED: each
//                             set of helical grooves cuts the other's ridges,
//                             which is exactly how a diamond knurl is rolled.
//   "raised pointer mark"  -> a 1.6 mm proud white pointer insert on the top
//                             face, running from the centre out to the rim
//                             and lined up with the D flat.
//   "6 mm D-shaft bore"    -> a blind D-profile cutout from the bottom face
//                             (6 mm round with a flat 0.5 mm in, D-shaft style).
//   "M3 set-screw hole"    -> a radial M3 tap-drill hole (2.5 mm, ISO 68-1
//                             minor) through the plain skirt into the bore.
//
// Teeth count is a discrete choice param (re-runs the script); the
// dimensions are numeric params that flow symbolically.

const dia = param('diameter', 40, { min: 20, max: 80, description: 'Knob outside diameter over the knurl peaks (mm)' });
const height = param('height', 22, { min: 12, max: 40, description: 'Overall knob height (mm)' });
const skirtH = param('skirtHeight', 5, { min: 3, max: 10, description: 'Plain skirt at the base that carries the set screw (mm)' });
const knurlDepth = param('knurlDepth', 0.9, { min: 0.4, max: 2, description: 'Radial depth of the knurl grooves (mm)' });
const knurlTwist = param('knurlTwistDeg', 28, { min: 10, max: 60, description: 'Twist of each helical groove set over the grip height (deg) — sets the diamond aspect' });
const shaftDia = param('shaftDia', 6, { min: 3, max: 10, description: 'D-shaft diameter (mm)' });
const flatDepth = param('dFlatDepth', 0.5, { min: 0.2, max: 2, description: 'Depth of the D flat below the shaft diameter (mm)' });
const boreDepth = param('boreDepth', 15, { min: 6, max: 30, description: 'Blind bore depth from the bottom face (mm)' });
const teethChoice = param('knurlTeeth', '36', { choices: ['24', '30', '36', '42', '48'] });
const TEETH = Number(teethChoice.value);

const R = dia.divide(2);
const gripH = height.subtract(skirtH).subtract(2); // 2 mm crowned cap above the grip

// --- Diamond knurl ---------------------------------------------------------
/** Ring of V teeth: peaks at R, valleys at R - depth. */
function toothRing() {
  let p = path();
  for (let i = 0; i < TEETH * 2; i++) {
    const a = (Math.PI * i) / TEETH;
    const r = i % 2 === 0 ? R : R.subtract(knurlDepth);
    const x = r.multiply(Math.cos(a));
    const y = r.multiply(Math.sin(a));
    p = i === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
  }
  return p.close();
}
const rightHand = toothRing().extrude(gripH, { twistAngle: knurlTwist });
const leftHand = toothRing().extrude(gripH, { twistAngle: knurlTwist.negate() });
const grip = rightHand.intersect(leftHand).translate(0, 0, skirtH);

// --- Body: skirt + grip core + chamfered cap --------------------------------
const coreR = R.subtract(knurlDepth).add(0.05); // core fills the knurl valleys
const skirt = cylinder(skirtH.add(0.1), R.subtract(knurlDepth).subtract(0.3));
const core = cylinder(gripH, coreR).translate(0, 0, skirtH);
const cap = path()
  .moveTo(0, 0)
  .lineTo(R.subtract(knurlDepth), 0)
  .lineTo(R.subtract(knurlDepth).subtract(1.6), 2)
  .lineTo(0, 2)
  .close()
  .revolve()
  .translate(0, 0, skirtH.add(gripH).subtract(0.05));

let knob = union(skirt, core, grip, cap);

// --- D-shaft bore (blind, from the bottom) ----------------------------------
const sr = shaftDia.divide(2);
const flatY = sr.subtract(flatDepth);
// D profile = round bore minus the slab beyond the flat (all symbolic).
const dBore = cylinder(boreDepth.add(0.1), sr, 48)
  .subtract(box(shaftDia.add(2), shaftDia, boreDepth.add(1), false).translate(sr.negate().subtract(1), flatY, -0.5))
  .translate(0, 0, -0.1);
knob = knob.subtract(dBore);

// --- M3 set screw: radial tap-drill hole through the skirt into the bore ----
const setScrew = cylinder(R.add(1), 1.25, 32)
  .rotateX(-90) // axis along +Y... pointing at the D flat side
  .translate(0, 0, skirtH.divide(2));
knob = knob.subtract(setScrew);

// --- Raised pointer mark on top ----------------------------------------------
const topZ = height.subtract(0.05); // the cap's top face: the insert sits ON it
const pointer = path()
  .moveTo(-1.8, -2)
  .lineTo(1.8, -2)
  .lineTo(0.9, R.subtract(knurlDepth).subtract(3))
  .lineTo(-0.9, R.subtract(knurlDepth).subtract(3))
  .close()
  .extrude(1.6)
  .translate(0, 0, topZ)
  .finish('paint-gloss', { color: '#f4f4f4' }); // white pointer insert

// Two parts: the anodised knob body and a white pointer insert bonded to its
// top face (face contact, no shared volume).
const kit = assembly('knurled-knob');
kit.part('knob-body', knob.finish('anodized', { color: '#d23a2a' }), { material: 'aluminum-6061' });
kit.part('pointer-insert', pointer, { material: 'abs' });
return kit.model();

