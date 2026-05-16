import * as THREE from 'three';

/**
 * Build a neutral-grey ground plane the model rests on. Mirrors the table
 * in product-photography reference shots so SSIM windows that fall on the
 * "table" in the reference don't see pure black in the render.
 *
 * The plane is large (10× the scene's largest extent, clamped to ≥1000 mm)
 * so it fully fills the viewport at any reasonable camera distance. It is
 * oriented in the XY plane (Z up — kernelCAD's convention) and positioned
 * at `z = bounds.min.z` (just under the model) so the model "sits" on it.
 *
 * The mesh receives shadows but does not cast them. Material is a matte
 * Lambert-ish grey (#888) tuned to match the table tone in the eyewear
 * reference photo.
 *
 * The returned `THREE.Group` is named `__groundPlane` so callers can filter
 * it out of bbox computations and mesh-counting diagnostics (parallel to the
 * `__referenceImages` group convention).
 */
export function buildGroundPlane(
  bounds: { min: [number, number, number]; max: [number, number, number] },
): THREE.Group {
  const dx = bounds.max[0] - bounds.min[0];
  const dy = bounds.max[1] - bounds.min[1];
  const dz = bounds.max[2] - bounds.min[2];
  const maxExtent = Math.max(dx, dy, dz, 100);
  const planeSize = Math.max(maxExtent * 10, 1000);

  const geom = new THREE.PlaneGeometry(planeSize, planeSize);
  // Neutral grey matched to the table tone in the eyewear reference photo
  // (~#888). MeshStandardMaterial with high roughness keeps it matte and
  // shadow-receptive without specular highlights stealing focus from the
  // model itself.
  const mat = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  // PlaneGeometry's default normal is +Z, which matches kernelCAD Z-up
  // already; no rotation needed. Position at the bottom of the model's bbox
  // so the model rests on the plane.
  mesh.position.set(0, 0, bounds.min[2]);

  const group = new THREE.Group();
  group.name = '__groundPlane';
  group.add(mesh);
  return group;
}
