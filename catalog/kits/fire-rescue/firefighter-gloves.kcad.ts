// SPDX-License-Identifier: CC0-1.0
// Pair of structural firefighting gloves laid palm-down: a padded leather hand
// with four tapered, slightly curled fingers and an angled thumb, knuckle pads,
// a grip-leather palm and a long flared gauntlet cuff with a reflective band and
// wrist strap. The flared gauntlet is what separates it from a work glove.
// Generic visualization geometry, millimetres, Z up, resting on z = 0, fingers point +X.
meta({
  name: "firefighter-gloves",
  license: 'CC0-1.0',
  title: "Firefighter gloves",
  description: "Pair of gauntlet firefighting gloves with tapered curled fingers, angled thumbs, knuckle pads, grip palms, flared cuffs, reflective bands and wrist straps. Material controls: gauntlet cuff fabric, glove leather, palm grip and reflective trim; cuff style choice; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'gloves', 'ppe', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const cuffStyle = param('cuffStyle', 'gauntlet', { choices: ['wristlet', 'gauntlet'], label: 'Cuff style' });
const cuffFabricColor = param('cuffFabricColor', '#c87a32', { label: 'Gauntlet cuff fabric' });
const gloveLeatherColor = param('gloveLeatherColor', '#5a4330', { label: 'Glove leather' });
const palmGripColor = param('palmGripColor', '#2d2a28', { label: 'Palm grip leather' });
const reflectiveTrimColor = param('reflectiveTrimColor', '#d9dc8a', { label: 'Reflective trim' });
presets({
  weathered: { cuffFabricColor: '#94653a', gloveLeatherColor: '#4a3e33', palmGripColor: '#3a3532', reflectiveTrimColor: '#a7a77c' },
  highVisibility: { cuffFabricColor: '#e1bd45', gloveLeatherColor: '#7a5a34', palmGripColor: '#2a2a2a', reflectiveTrimColor: '#f2f06a' },
});

const gauntlet = cuffStyle.value === 'gauntlet';
const p = assembly("firefighter-gloves");
const add = (name, shape, finish = gloveLeatherColor) => p.part(name, shape.scale(scale).color(finish));

// Elliptical ring of n points: rv is the half-height (vertical), rw the half-width.
const ring = (rv, rw, n = 10) => {
  let pb = path().moveTo(rv, 0);
  for (let i = 1; i < n; i += 1) {
    const t = (i / n) * Math.PI * 2;
    pb = pb.lineTo(rv * Math.cos(t), rw * Math.sin(t));
  }
  return pb.close();
};
// Loft rings along the segment p0 -> p1; stations are [fraction, rv, rw].
const limb = (p0, p1, st, n = 10) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return ring(st[0][1], st[0][2], n)
    .loft(st.slice(1).map(([, rv, rw]) => ring(rv, rw, n)), {
      planes: st.map(([f]) => ({ plane: 'XY', origin: [0, 0, f * len] })),
      ruled: true,
    })
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

for (const [side, y0, thumbSign] of [['left', -150, 1], ['right', 150, -1]]) {
  const z = 48;
  // Padded back of hand, slightly domed, narrowing at the wrist.
  add(`hand-${side}`, limb([-40, y0, z], [120, y0, z], [[0, 40, 62], [0.45, 48, 74], [1, 42, 76]]), gloveLeatherColor);
  add(`palm-grip-${side}`, box(130, 112, 12, true).translate(50, y0, 10), palmGripColor);
  add(`knuckle-pad-${side}`, limb([95, y0, z + 30], [130, y0, z + 26], [[0, 14, 62], [1, 12, 58]], 8), palmGripColor);
  // Four fingers fanning slightly, each a two-segment taper that curls down at the tip.
  const fingers = [[-50, 150], [-17, 172], [17, 168], [50, 140]];
  fingers.forEach(([dy, length], i) => {
    const yRoot = y0 + dy * thumbSign * -1;
    const spread = dy * 0.18 * thumbSign * -1;
    const mid = [120 + length * 0.6, yRoot + spread, z - 4];
    const tip = [120 + length, yRoot + spread * 1.6, 22];
    add(`finger-${side}-${i + 1}`, limb([116, yRoot, z], mid, [[0, 24, 18], [1, 21, 16]], 8), gloveLeatherColor);
    add(`fingertip-${side}-${i + 1}`, limb(mid, tip, [[0, 21, 16], [0.8, 18, 14], [1, 10, 9]], 8), gloveLeatherColor);
  });
  // Thumb leaves the side of the hand and angles forward.
  const thumbRoot = [20, y0 + 70 * thumbSign, z - 6];
  const thumbMid = [80, y0 + 112 * thumbSign, 34];
  add(`thumb-${side}`, limb(thumbRoot, thumbMid, [[0, 30, 26], [1, 24, 21]], 8), gloveLeatherColor);
  add(`thumb-tip-${side}`, limb(thumbMid, [128, y0 + 128 * thumbSign, 22], [[0, 24, 21], [0.8, 20, 18], [1, 11, 10]], 8), gloveLeatherColor);
  // Wrist strap and cuff: a short knit wristlet or a long flared gauntlet.
  add(`wrist-strap-${side}`, limb([-60, y0, z], [-30, y0, z], [[0, 44, 66], [1, 44, 66]]), palmGripColor);
  add(`strap-tab-${side}`, box(26, 36, 14, true).translate(-45, y0 - 58 * thumbSign, z + 34), reflectiveTrimColor);
  if (gauntlet) {
    add(`gauntlet-cuff-${side}`, limb([-50, y0, z], [-230, y0, z + 12], [[0, 40, 64], [0.6, 52, 84], [1, 58, 96]]), cuffFabricColor);
    add(`cuff-reflective-band-${side}`, limb([-150, y0, z + 7], [-180, y0, z + 9], [[0, 54, 91], [1, 56, 94]]), reflectiveTrimColor);
    add(`cuff-opening-${side}`, limb([-229, y0, z + 12], [-233, y0, z + 12], [[0, 48, 82], [1, 48, 82]]), palmGripColor);
  } else {
    add(`knit-wristlet-${side}`, limb([-50, y0, z], [-140, y0, z + 4], [[0, 38, 60], [1, 36, 56]]), cuffFabricColor);
    add(`cuff-opening-${side}`, limb([-139, y0, z + 4], [-143, y0, z + 4], [[0, 30, 48], [1, 30, 48]]), palmGripColor);
  }
}

return p.model();
