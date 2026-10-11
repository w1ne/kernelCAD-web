// Centrifugal impeller
//
// Prompt: "Centrifugal impeller: 7 swept backward-curved blades."
//
// Words -> geometry:
//   "centrifugal"           -> open (unshrouded) impeller: a backplate disc,
//                              a revolved hub nose with a keyed bore, and a
//                              meridional envelope that is tall at the eye
//                              (inlet) and short at the tip (outlet).
//   "7 blades"              -> bladeCount, a discrete choice param.
//   "swept backward-curved" -> each blade follows a logarithmic spiral from
//                              the eye radius to the tip, wrapping
//                              `wrapDeg` AGAINST the direction of rotation
//                              (rotation is +Z / counter-clockwise seen from
//                              the inlet; the blade tips trail behind).
//   blade height taper      -> the extruded blade is intersected with the
//                              revolved meridional envelope.
//
// Counts and the spiral are discrete choices (they re-run the script);
// the plate / hub / bore dimensions are numeric params that flow symbolically.

const bladeCountChoice = param('bladeCount', '7', { choices: ['5', '6', '7', '8', '9', '11'] });
const wrapChoice = param('wrapDeg', '70', { choices: ['40', '55', '70', '85'] });
const BLADES = Number(bladeCountChoice.value);
const WRAP = Number(wrapChoice.value);

const plateT = param('backplateThickness', 4, { min: 2, max: 10, description: 'Backplate (hub disc) thickness (mm)' });
const boreDia = param('boreDia', 10, { min: 5, max: 20, description: 'Shaft bore diameter (mm)' });
const keyW = param('keyWidth', 3, { min: 2, max: 6, description: 'Keyway width (mm)' });

const R2 = 60;      // tip (outlet) radius
const R1 = 17;      // eye (inlet) radius where the blades start
const H_IN = 24;    // blade height at the eye, above the backplate
const H_OUT = 8;    // blade height at the tip
const T_BLADE = 2.4; // blade thickness

// --- Blade plan shape: log spiral centreline, offset +-t/2 -------------------
const N = 14;
const k = Math.log(R2 / R1);
function centre(i: number): [number, number] {
  const r = R1 + ((R2 - R1) * i) / (N - 1);
  // theta decreases with r: blade sweeps back against +Z rotation.
  const th = (-WRAP * Math.PI / 180) * (Math.log(r / R1) / k);
  return [r, th];
}
const side = (sgn: number) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const [r, th] = centre(i);
    const dth = (sgn * T_BLADE) / (2 * r);
    pts.push([r * Math.cos(th + dth), r * Math.sin(th + dth)]);
  }
  return pts;
};
const a = side(+1);
const b = side(-1).reverse();
const bladePlan = path()
  .moveTo(a[0][0], a[0][1])
  .spline(a)
  .lineTo(b[0][0], b[0][1])
  .spline(b)
  .close();

// --- Meridional envelope (r, z): tall at the eye, short at the tip ---------
// Built by a function: transforms mutate a Shape in place, so every blade
// copy needs its own fresh solid before it is rotated into position.
function makeBlade() {
  const envelope = path()
    .moveTo(0, -1)
    .lineTo(R2 - 0.5, -1)
    .lineTo(R2 - 0.5, H_OUT)
    .spline([[R2 - 0.5, H_OUT], [R2 - 15, H_OUT + 2.5], [R1 + 14, H_IN - 6], [R1 + 4, H_IN - 0.8], [R1, H_IN]])
    .lineTo(0, H_IN)
    .close()
    .revolve();
  return bladePlan.extrude(H_IN + 2).intersect(envelope);
}

const bladeSet = [];
for (let i = 0; i < BLADES; i++) bladeSet.push(makeBlade().rotateZ((360 / BLADES) * i));
const blades = union(...bladeSet).translate(0, 0, plateT.subtract(0.3));

// --- Backplate + hub nose ----------------------------------------------------
const backplate = path()
  .moveTo(0, 0)
  .lineTo(R2, 0)
  .lineTo(R2, plateT.subtract(1))
  .lineTo(R2 - 6, plateT)
  .lineTo(0, plateT)
  .close()
  .revolve();
const hub = path()
  .moveTo(0, plateT.subtract(0.5))
  .lineTo(R1 + 2, plateT.subtract(0.5))
  .spline([[R1 + 2, plateT.subtract(0.5)], [R1 - 3, plateT.add(6)], [10, plateT.add(16)], [7, plateT.add(H_IN + 2)]])
  .lineTo(0, plateT.add(H_IN + 2))
  .close()
  .revolve();

let impeller = union(backplate, hub, blades);

// --- Keyed bore ----------------------------------------------------------
const bore = cylinder(plateT.add(H_IN + 10), boreDia.divide(2), 48).translate(0, 0, -1);
const key = box(keyW, boreDia.divide(2).add(1.5), plateT.add(H_IN + 10), false)
  .translate(keyW.divide(2).negate(), 0, -1);
impeller = impeller.subtract(bore, key);

return impeller.finish('paint-gloss', { color: '#4d7ea8' });
