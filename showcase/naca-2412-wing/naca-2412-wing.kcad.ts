// NACA 2412 tapered wing
//
// Prompt: "NACA 2412 wing: true airfoil from the NACA equations, tapered loft."
//
// Words -> geometry:
//   "NACA 2412"          -> nacaSection(): the NACA 4-digit equations with
//                           m = 2 % max camber at p = 40 % chord and t = 12 %
//                           thickness; thickness is applied perpendicular to
//                           the mean camber line (the textbook construction,
//                           not a symmetric section scaled by eye).
//   "tapered loft"       -> sections at STATIONS spanwise stations, chord
//                           interpolated rootChord -> tipChord, lofted
//                           through all of them.
//   (wing realism)       -> leading-edge sweep, dihedral and washout are
//                           params; washout twists each section nose-down
//                           about its quarter-chord point. One panel is shown
//                           with a contrasting root rib that displays the
//                           airfoil section itself.
//
// Every dimension flows symbolically: section points are chord.multiply(k)
// and plane origins / rotations are ParamRef expressions.

const semiSpan = param('semiSpan', 450, { min: 150, max: 1500, description: 'Root-to-tip span of one wing half (mm)' });
const rootChord = param('rootChord', 200, { min: 50, max: 600, description: 'Chord at the root (mm)' });
const tipChord = param('tipChord', 100, { min: 20, max: 600, description: 'Chord at the tip (mm)' });
const sweep = param('leSweep', 40, { min: -100, max: 300, description: 'Leading-edge set-back of the tip relative to the root (mm)' });
const dihedral = param('dihedralRise', 30, { min: 0, max: 200, description: 'Tip height above the root plane (mm) — dihedral' });
const washout = param('washoutDeg', 2, { min: 0, max: 6, description: 'Tip twisted nose-down relative to the root (deg)' });

// NACA 2412 digits.
const M = 0.02; // max camber
const P = 0.4;  // camber position
const T = 0.12; // thickness

// Original (open trailing edge) NACA thickness coefficients.
const yt = (x: number) => 5 * T * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4);
const yc = (x: number) => (x < P ? (M / (P * P)) * (2 * P * x - x * x) : (M / ((1 - P) ** 2)) * (1 - 2 * P + 2 * P * x - x * x));
const dyc = (x: number) => (x < P ? ((2 * M) / (P * P)) * (P - x) : ((2 * M) / ((1 - P) ** 2)) * (P - x));

/** Unit-chord NACA 2412 outline: upper surface TE -> LE, then lower LE -> TE.
 *  Coordinates are relative to the quarter-chord point. */
function unitOutline(): [number, number][] {
  const n = 24;
  const upper: [number, number][] = [];
  const lower: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const x = 0.5 * (1 - Math.cos((Math.PI * i) / n)); // cosine spacing: dense at LE and TE
    const th = Math.atan(dyc(x));
    upper.push([x - yt(x) * Math.sin(th) - 0.25, yc(x) + yt(x) * Math.cos(th)]);
    lower.push([x + yt(x) * Math.sin(th) - 0.25, yc(x) - yt(x) * Math.cos(th)]);
  }
  return [...upper.reverse(), ...lower.slice(1)];
}
const UNIT = unitOutline();

function nacaSection(chord: ParamRef<number>) {
  const pts = UNIT.map(([x, y]) => [chord.multiply(x), chord.multiply(y)] as [Editable<number>, Editable<number>]);
  return path().moveTo(pts[0][0], pts[0][1]).spline(pts).close();
}

const STATIONS = 6;
function wingHalf() {
  const sections = [];
  const planes = [];
  for (let i = 0; i < STATIONS; i++) {
    const f = i / (STATIONS - 1);
    const chord = rootChord.add(tipChord.subtract(rootChord).multiply(f));
    sections.push(nacaSection(chord));
    // Quarter-chord point of this station: LE set-back + 1/4 chord.
    const xQc = sweep.multiply(f).add(chord.multiply(0.25));
    planes.push({
      plane: 'XZ' as const,
      origin: [xQc, semiSpan.multiply(f), dihedral.multiply(f)] as [Editable<number>, Editable<number>, Editable<number>],
      rotationDeg: washout.multiply(f),
    });
  }
  return sections[0].loft(sections.slice(1), { planes });
}

// One wing panel (root at y = 0) plus a root rib: the rib is the root NACA
// section extruded 4 mm inboard in a contrasting finish, so the true airfoil
// shape reads in every view where the root faces the camera.
const wing = assembly('naca-2412-wing');
wing.part('wing-panel', wingHalf().finish('paint-matte', { color: '#2f6db5' }));
const rootXq = rootChord.multiply(0.25); // quarter-chord of the root section
wing.part(
  'root-rib',
  nacaSection(rootChord).extrude(4).rotateX(90).translate(rootXq, 0, 0).finish('paint-matte', { color: '#f2c14e' }),
);
return wing.model();
