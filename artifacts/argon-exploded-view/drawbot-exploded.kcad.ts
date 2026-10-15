// Local exploded-view macro demo, based on tests/fixtures/argon/handoff-drawbot.json.
// The boxes are schematic proxies sized from estimated handoff bboxes; they are
// not vendor geometry and this is not a hardware fit or acceptance check.
const explodeA1 = param('explode_A1', 0, { min: 0, max: 1 });
const explodeA2 = param('explode_A2', 1, { min: 0, max: 1 });
const explodeA3 = param('explode_A3', 1, { min: 0, max: 1 });
const explodeM3 = param('explode_M3', 1, { min: 0, max: 1 });

animationView({
  name: 'Drawbot handoff exploded view',
  fps: 12,
  tracks: [
    { param: 'explode_A1', keys: [{ atMs: 0, value: 1 }, { atMs: 600, value: 0, ease: 'easeInOut' }] },
    { param: 'explode_A2', keys: [{ atMs: 0, value: 1 }, { atMs: 600, value: 1, ease: 'step' }, { atMs: 1200, value: 0, ease: 'easeInOut' }] },
    { param: 'explode_A3', keys: [{ atMs: 0, value: 1 }, { atMs: 1200, value: 1, ease: 'step' }, { atMs: 1800, value: 0, ease: 'easeInOut' }] },
    { param: 'explode_M3', keys: [{ atMs: 0, value: 1 }, { atMs: 1800, value: 1, ease: 'step' }, { atMs: 2400, value: 0, ease: 'easeInOut' }] },
  ],
});

const a1 = box(54.4, 27.9, 10, true).translate(26.63, 53.92, explodeA1.multiply(0).add(5)).color('#397a9b');
const a2 = box(15.2, 20.3, 13, true).translate(3.97, 35.27, explodeA2.multiply(16.25).add(6.5)).color('#d39242');
const a3 = box(15.2, 20.3, 13, true).translate(21.98, 12.47, explodeA3.multiply(32.5).add(6.5)).color('#60a878');
const m3 = box(32.2, 12.2, 29, true).translate(59.22, 21.42, explodeM3.multiply(68.75).add(14.5)).color('#a56882');

const drawbot = assembly('drawbot-handoff-exploded');
drawbot.part('A1-ESP32-proxy', a1);
drawbot.part('A2-driver-proxy', a2);
drawbot.part('A3-driver-proxy', a3);
drawbot.part('M3-servo-proxy', m3);
return drawbot.model();
