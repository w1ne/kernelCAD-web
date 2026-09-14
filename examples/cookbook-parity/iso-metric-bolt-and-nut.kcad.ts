// ISO metric hex bolt and nut (M3–M12 table). Example is M6: pitch 1.0, AF 10, head 4.0.
// Bolt thread is a 60° V-profile swept along helix(); the nut uses a clearance bore
// (no internal-thread primitive).
//
// Run with:
//   npx tsx src/agent/cli/index.ts evaluate examples/cookbook-parity/iso-metric-bolt-and-nut.kcad.ts
//
// Expected console output:
//   Features: 14
//   OK

// ISO 262 coarse / ISO 4017 hex head / ISO 4032 hex nut (mm).
const ISO = {
  M3:  { d: 3,  pitch: 0.5,  af: 5.5,  head: 2.0,  nut: 2.4 },
  M4:  { d: 4,  pitch: 0.7,  af: 7.0,  head: 2.8,  nut: 3.2 },
  M5:  { d: 5,  pitch: 0.8,  af: 8.0,  head: 3.5,  nut: 4.7 },
  M6:  { d: 6,  pitch: 1.0,  af: 10.0, head: 4.0,  nut: 5.2 },
  M8:  { d: 8,  pitch: 1.25, af: 13.0, head: 5.3,  nut: 6.8 },
  M10: { d: 10, pitch: 1.5,  af: 16.0, head: 6.4,  nut: 8.4 },
  M12: { d: 12, pitch: 1.75, af: 18.0, head: 7.5,  nut: 10.8 },
};
const spec = ISO.M6;
const turns = 8; // threaded length = turns * pitch

function hexPrism(af, height) {
  // Flat-to-flat = af. Vertex radius R = af / √3 for a flat-top hex.
  const r = af / Math.sqrt(3);
  let sk = path();
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI / 180) * (30 + 60 * i);
    const x = r * Math.cos(a);
    const y = r * Math.sin(a);
    sk = i === 0 ? sk.moveTo(x, y) : sk.lineTo(x, y);
  }
  return sk.close().extrude(height);
}

const head = hexPrism(spec.af, spec.head);

// Helical thread: centered square wire swept along helix() with a
// smooth spine, unioned with a minor-diameter core. (A 60° V-profile
// at this radius self-intersects in OCCT; square thread is the
// helix()-composable form.)
const w = spec.pitch * 0.2;
const threadProfile = path()
  .moveTo(-w, -w)
  .lineTo(w, -w)
  .lineTo(w, w)
  .lineTo(-w, w)
  .close();
const minorR = spec.d / 2 - 0.54 * spec.pitch;
const rail = helix({
  radius: spec.d / 2 - 0.1,
  pitch: spec.pitch,
  turns,
  pointsPerTurn: 24,
});
const core = cylinder(turns * spec.pitch, minorR);
const thread = threadProfile.sweep(rail, { spine: 'smooth' });
const shank = core.union(thread);

// Nut: hex prism minus a clearance bore (no internal-thread primitive).
const clearanceR = spec.d / 2 + 0.05;
const nut = hexPrism(spec.af, spec.nut)
  .subtract(cylinder(spec.nut + 2, clearanceR).translate(0, 0, -1));

const arm = assembly('iso-metric-bolt-and-nut');
arm.part('hex-head', head);
arm.part('threaded-shank', shank, { at: [0, 0, spec.head] });
arm.part('hex-nut', nut, { at: [spec.af + 12, 0, 0] });
return arm.model();
