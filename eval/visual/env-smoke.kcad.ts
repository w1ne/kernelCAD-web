// Visual smoke for HDRI / IBL rendering (W2).
//
// A reflective sphere + matte cube; the matte cube is the "control" that
// should look near-identical across presets; the chrome sphere is the
// "treatment" — its specular highlights should sweep with the env map.
//
// Run with each preset to baseline:
//   kernelcad render eval/visual/env-smoke.kcad.ts --environment studio -o /tmp/env-smoke.studio.png
//   ... for each of studio | softbox | neutral | outdoor | warehouse

setRenderEnvironment({ preset: 'studio' });

// Reflective sphere (chrome)
const chrome = sphere(20)
  .translate(-30, 0, 20)
  .material({ baseColor: '#cfcfcf', metalness: 1.0, roughness: 0.05 });

// Matte cube (control)
const matte = box(40, 40, 40)
  .translate(30, 0, 20)
  .material({ baseColor: '#909090', metalness: 0.0, roughness: 0.9 });

return chrome.union(matte);
