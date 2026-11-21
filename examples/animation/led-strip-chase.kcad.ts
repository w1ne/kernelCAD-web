// LED strip chase: a light pulse runs along a strip of LED segments laid on an
// L-shaped path from a source block to a load block. Every segment is its own
// assembly part, and an animationView appearance track keys its emissive
// colour. Each track is the same pulse shifted by one step, so the light
// appears to travel along the path. Nothing moves; only colours change.
//
// Run:
//   npx tsx src/agent/cli/index.ts evaluate examples/animation/led-strip-chase.kcad.ts
//     → OK, no error diagnostics
//   npx tsx src/agent/cli/index.ts animate examples/animation/led-strip-chase.kcad.ts led-strip-chase.mp4 --pose 35,40 --backdrop white
//     → 16 appearance tracks, no param tracks (0 poses verified, one mesh
//       load), a green pulse travelling from the source block to the load block

const segments = 16;
const pitch = 12; // mm between segment centres
const stepMs = 120; // time for the pulse to advance one segment
const riseMs = 90;
const tailMs = 420;
const lit = '#2bff88';
const off = '#000000';

const strip = assembly('led-strip-chase');
strip.part('source', box(18, 18, 16).translate(-24, -9, 0).finish('paint-matte', { color: '#3b4a5a' }));
strip.part('load', box(18, 18, 16).translate(7 * pitch - 9, 8 * pitch + 6, 0).finish('paint-matte', { color: '#5a4a3b' }));

// Segment centres: first leg along +X, second leg along +Y.
function segmentCentre(i: number): [number, number] {
  return i < 8 ? [i * pitch, 0] : [7 * pitch, (i - 7) * pitch];
}

// The tape under the LEDs, one flat bar per leg.
strip.part('tape-x', box(8 * pitch, 8, 1).translate(-pitch / 2, -4, 0).finish('abs', { color: '#2b2f36' }));
strip.part('tape-y', box(8, 8 * pitch, 1).translate(7 * pitch - 4, pitch / 2, 0).finish('abs', { color: '#2b2f36' }));

const tracks = [];
for (let i = 0; i < segments; i += 1) {
  const [x, y] = segmentCentre(i);
  const name = `led-${String(i).padStart(2, '0')}`;
  strip.part(name, box(5, 5, 1.6).translate(x - 2.5, y - 2.5, 1).finish('plastic-glossy', { color: '#1a1a1a' }));
  const start = i * stepMs;
  const keys = [
    { atMs: start, value: off },
    { atMs: start + riseMs, value: lit, ease: 'easeOut' as const },
    { atMs: start + riseMs + tailMs, value: off, ease: 'easeIn' as const },
  ];
  // Hold the segment dark from t = 0 until its turn.
  if (start > 0) keys.unshift({ atMs: 0, value: off });
  tracks.push({ target: name, channel: 'emissive' as const, keys });
}

setCameraTarget(40, 45, 0);
setCameraDistance(190);
animationView({ name: 'energy chase', tracks, fps: 24 });

return strip.solvedModel({});
