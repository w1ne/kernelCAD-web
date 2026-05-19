// Visual smoke for HDRI / IBL rendering (W2).
//
// A reflective sphere + matte cube on a flat ground tile. The matte cube
// acts as the "control" — its appearance should change minimally across
// presets. The chrome sphere is the "treatment" — its specular highlights
// should sweep continuously with the env map. The cube/sphere pair makes a
// clean visual diff between presets.
//
// Run with each preset to baseline:
//   kernelcad render eval/visual/env-smoke.kcad.ts --environment studio  -o /tmp/env-smoke.studio.png
//   kernelcad render eval/visual/env-smoke.kcad.ts --environment softbox -o /tmp/env-smoke.softbox.png
//   kernelcad render eval/visual/env-smoke.kcad.ts --environment neutral -o /tmp/env-smoke.neutral.png
//   kernelcad render eval/visual/env-smoke.kcad.ts --environment outdoor -o /tmp/env-smoke.outdoor.png
//   kernelcad render eval/visual/env-smoke.kcad.ts --environment warehouse -o /tmp/env-smoke.warehouse.png
//
// The script itself sets 'studio' as a sensible default; CLI flag overrides.

setRenderEnvironment({ preset: 'studio' });

const chromeBall = sphere(20)
  .translate(-30, 0, 20)
  .material({ baseColor: '#cfcfcf', metalness: 1.0, roughness: 0.05 });

const matteCube = box(40, 40, 40, true)
  .translate(30, 0, 20)
  .material({ baseColor: '#909090', metalness: 0.0, roughness: 0.9 });

return chromeBall.union(matteCube);
