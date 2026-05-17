// v0.8 hero — Polished Brass Cuff
//
// Smallest possible scene that exercises the new v0.8 Shape.material({PBR})
// tool on a NURBS surface, sized to read instantly in a 1920×1080 frame.
// A 32-sided polygonal NURBS cylinder is thickened to a chunky wall, then
// dressed in warm brass. Proportions are deliberately squat (Ø36 × 20 mm)
// so the camera's default iso framing shows the band's height, wall, and
// rim curvature all at once — not a dark vertical sliver.
//
// PBR field choices: high metalness reads as polished metal even without
// an environment map; moderate roughness keeps the highlight a streak (not
// a knife-edge mirror) so the brass tone is visible from every angle; a
// thin clearcoat suggests a lacquered finish.

const rOuter = 18;
const L = 20;
const N = 32;

const ring: number[][][] = [];
for (let i = 0; i <= N; i++) {
  const theta = (i / N) * 2 * Math.PI;
  const x = rOuter * Math.cos(theta);
  const y = rOuter * Math.sin(theta);
  ring.push([[x, y, 0], [x, y, L]]);
}

return nurbsSurface({
  controls: ring,
  degree: { u: 1, v: 1 },
})
  .thicken(2.4)
  .material({
    baseColor: '#e6b85d',
    metalness: 0.95,
    roughness: 0.22,
    clearcoat: 0.45,
    clearcoatRoughness: 0.08,
  });
