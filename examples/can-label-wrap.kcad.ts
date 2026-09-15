// Wraps a bitmap label around a cylindrical can body using a cylinder
// texture projection. UVs are derived from the FINAL world-space vertex
// positions at export/mesh time, so the wrap survives the fillet + the
// .translate() applied after wrapTexture() — try commenting either out and
// re-rendering; the label stays put.
//
// Run: npx tsx src/agent/cli/index.ts export glb examples/can-label-wrap.kcad.ts /tmp/can.glb
//      npx tsx src/agent/cli/index.ts render examples/can-label-wrap.kcad.ts /tmp/can-render.png

const radius = 20;
const height = 60;

const body = cylinder(radius, height)
  .wrapTexture(
    { path: 'assets/can-label.png' },
    { type: 'cylinder', axis: [0, 0, 1] },
  )
  .fillet(1)
  .translate(0, 0, 0);

return body;
