// Twisted hexagonal vase
//
// Prompt: "Hollow shell ~150 mm tall, tapers 70 mm base -> 50 mm mouth,
// hex cross-section twisting 120 degrees, 2 mm wall, closed bottom."
//
// Words -> geometry:
//   "hex cross-section"   -> hexSection(): a flat-sided hexagon, sized by its
//                            across-corners diameter (the widest dimension).
//   "tapers 70 -> 50"     -> baseDia / mouthDia, interpolated per station.
//   "twisting 120 deg"    -> twistDeg, distributed over the loft stations via
//                            planes[].rotationDeg so the faces spiral smoothly.
//   "2 mm wall"           -> wall: the inner loft is every flat moved in by
//                            `wall` (circumradius minus wall / cos 30 deg).
//   "closed bottom"       -> the inner loft starts `wall` above z = 0.
//
// Every dimension is a param() and flows symbolically (ParamRef arithmetic),
// so the Studio sliders re-lower the shape without re-running the script.

const height = param('height', 150, { min: 60, max: 300, description: 'Overall vase height (mm)' });
const baseDia = param('baseDia', 70, { min: 30, max: 160, description: 'Across-corners width of the hexagon at the base (mm)' });
const mouthDia = param('mouthDia', 50, { min: 20, max: 160, description: 'Across-corners width of the hexagon at the mouth (mm)' });
const twistDeg = param('twistDeg', 120, { min: 0, max: 360, description: 'Total twist of the hex section from base to mouth (deg)' });
const wall = param('wall', 2, { min: 1, max: 6, description: 'Wall and floor thickness (mm)' });

const STATIONS = 9; // loft sections; enough for the twist to read as a smooth spiral
const COS30 = Math.cos(Math.PI / 6);

/** Hexagon with circumradius R (ParamRef), corners at 0, 60, ... deg. */
function hexSection(R: ParamRef<number>) {
  let p = path();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const x = R.multiply(Math.cos(a));
    const y = R.multiply(Math.sin(a));
    p = i === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
  }
  return p.close();
}

function body(inset: boolean) {
  const sections = [];
  const planes = [];
  for (let i = 0; i < STATIONS; i++) {
    const s = i / (STATIONS - 1);
    // Inner body runs from z = wall (the floor) to 1 mm past the mouth (open top).
    // Its stations sit at the same height fractions as the outer ones only at
    // the ends; in between we sample the taper and twist at the actual z so
    // the wall stays even.
    const z = inset ? wall.add(height.add(1).subtract(wall).multiply(s)) : height.multiply(s);
    // Height fraction u = z / height, symbolic. Taper and twist are linear in u.
    const u = z.divide(height);
    const R = baseDia.add(mouthDia.subtract(baseDia).multiply(u)).divide(2);
    sections.push(hexSection(inset ? R.subtract(wall.divide(COS30)) : R));
    planes.push({ plane: 'XY' as const, origin: [0, 0, z] as [Editable<number>, Editable<number>, Editable<number>], rotationDeg: twistDeg.multiply(u) });
  }
  return sections[0].loft(sections.slice(1), { planes });
}

const outer = body(false);
const inner = body(true);

return outer.subtract(inner).finish('paint-gloss', { color: '#2f7f86' });
