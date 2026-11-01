// The fluid volume run_cfd meshed for manifold.kcad.ts, for the demo render
// only. fluid-volume.stl is written by record.ts from the solver case
// (constant/triSurface/geometry.stl, scaled from m back to mm).
const fluid = await lib.fromSTL('fluid-volume.stl', { tolerance: 1e-4 });
return fluid.color('#35c2d6');
