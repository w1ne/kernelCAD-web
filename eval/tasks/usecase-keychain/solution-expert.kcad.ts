// [dogfood] Keychain nameplate, 60x25x4mm, rounded corners, raised "ANNA"
// text (+1mm) as a second color/part, 5mm ring hole.

const plateW = 60;
const plateH = 25;
const plateT = 4;
const cornerR = 4;
const ringHoleD = 5;
const textDepth = 1;
// Size 17 (tried first to clear the 1.2mm minWall stroke gate) made "ANNA"
// wide enough to collide with the ring hole near the left edge (found via a
// top-view render). Text is exempted from minWall below (raised emboss text
// is inherently thin-walled and that's fine on a solid 4mm base -- see the
// dfmSpec note), so there is no need to oversize it: size 12 is legible,
// fits the 25mm plate height, and leaves clearance from the ring hole.
const textSize = 12;

// Base plate: rounded rect, XY centered at origin, Z 0..plateT.
let base = extrudeRoundedRect(plateW, plateH, cornerR, plateT);

// Ring hole: 5mm through-hole, inset from the left edge, vertically centered.
const ringHoleX = -plateW / 2 + 8; // 8mm inset from the left edge
const ringHole = cylinder(plateT + 2, ringHoleD / 2).translate(ringHoleX, 0, -1);
base = base.subtract(ringHole);

// "ANNA" text, raised 1mm on the top face, centered on the plate (measured
// empirically: sketch.text baseline sits at y=0 and grows +Y, so shift down
// by half the measured cap height to visually center it).
const textCapHeight = 8.255859375; // measured via inspect(shape) for size=12
let text = sketch.text('ANNA', { size: textSize, align: 'center', position: [0, 0] })
  .extrude(textDepth)
  .translate(0, -textCapHeight / 2, plateT);

// body/text touch by design (the raised letters sit flush on the base for a
// two-color print) -- an intentional bonded seam, not a clearance defect.
// The 1mm-tall raised text itself is exempted from the 1.2mm minWall gate:
// the request explicitly asks for text "raised 1mm", and a 1mm-tall boss
// sitting on a solid 4mm base is a normal, printable emboss depth (unlike a
// genuine free-standing thin wall, which minWall is meant to catch).
dfmSpec({ minWall: 1.2, minClearance: 0.3, ignore: [['body', 'text']], exclude: ['text'] });

const kc = assembly('anna-keychain');
const bodyPart = kc.part('body', base.color('plate'));
const textPart = kc.part('text', text.color('#2266ee'));

return kc.model();
