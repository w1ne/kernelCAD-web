// U11 - M8x30 hex bolt with a real ISO metric (60deg V, ISO 68-1) helical
// thread + a matching M8 hex nut with a modeled internal thread groove.
// Adapted from the kernelCAD cookbook recipe "iso-metric-bolt-and-nut".
const ISO_M8 = { d: 8, pitch: 1.25, af: 13.0, head: 5.3, nut: 6.8 };
const spec = ISO_M8;
const P = spec.pitch; // 1.25mm coarse pitch, per ISO 262
const boltLength = 30; // M8x30 -- shank length under the head
const turns = boltLength / P; // 24
const threadClearance = 0.15; // print tolerance; max allowed is pitch/8 = 0.15625mm

function hexPrism(af, height) {
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

const H = (Math.sqrt(3) / 2) * P;
const rMinor = spec.d / 2 - (5 / 8) * H;
const halfWidth = (r) => (3 / 8) * P - (r - rMinor) * Math.tan(Math.PI / 6);

const kink = -0.05 * P;
const crest = spec.d / 2 - rMinor;
const vProfile = path()
  .moveTo(-0.15 * P, -halfWidth(rMinor + kink))
  .lineTo(kink, -halfWidth(rMinor + kink))
  .lineTo(crest, -halfWidth(rMinor + crest))
  .lineTo(crest, halfWidth(rMinor + crest))
  .lineTo(kink, halfWidth(rMinor + kink))
  .lineTo(-0.15 * P, halfWidth(rMinor + kink))
  .close();

const thread = vProfile.sweep(helix({ radius: rMinor, pitch: P, turns }), { spine: 'helix' });
const shank = cylinder((turns + 1) * P, rMinor).union(thread);
const bolt = hexPrism(spec.af, spec.head).union(shank.translate(0, 0, spec.head));

const nut = hexPrism(spec.af, spec.nut).hole({ atZ: spec.nut, byNormal: 'Z' }, {
  u: 0,
  v: 0,
  diameter: spec.d,
  depth: 'through',
  thread: { pitch: P, modeled: true, clearance: threadClearance },
});

const nutTop = spec.head + 10 * P;
const arm = assembly('iso-m8-bolt-nut');
arm.part('hex-bolt', bolt, { material: 'mild-steel' });
arm.part('hex-nut', nut, { material: 'mild-steel', at: [0, 0, nutTop - spec.nut] });
return arm.model();
