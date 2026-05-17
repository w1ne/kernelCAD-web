// v0.8 hero — Polished Brass Tube
//
// Smallest possible scene that exercises the new v0.8 Shape.material({PBR})
// tool on a NURBS surface. A 16-sided polygonal NURBS cylinder is thickened
// to a wall, then dressed in glossy brass: a warm baseColor, metalness=1
// (fully reflective), low roughness for a mirror-bright finish, and a thin
// clearcoat to suggest a lacquered surface.
//
// The renderer (MeshPhysicalMaterial) honors every field of the material
// record; when the rotate phase sweeps the camera around the tube, the
// specular highlight glides across the surface — visible proof that the
// v0.8 PBR pipeline replaced the flat .color() pipeline.

const r = 8;
const L = 56;
const N = 24;

const ring: number[][][] = [];
for (let i = 0; i <= N; i++) {
  const theta = (i / N) * 2 * Math.PI;
  const x = r * Math.cos(theta);
  const y = r * Math.sin(theta);
  ring.push([[x, y, 0], [x, y, L]]);
}

return nurbsSurface({
  controls: ring,
  degree: { u: 1, v: 1 },
})
  .thicken(1.2)
  .material({
    baseColor: '#c9a14a',
    metalness: 1.0,
    roughness: 0.18,
    clearcoat: 0.4,
    clearcoatRoughness: 0.08,
  });
