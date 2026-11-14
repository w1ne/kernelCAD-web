// SPDX-License-Identifier: CC0-1.0
// External circlip with a true opening and pierced plier ears; the selectable
// gap changes both the slot and the spacing between its installation holes.
meta({
  name: 'retaining-ring',
  license: 'CC0-1.0',
  title: 'Retaining ring',
  description: 'Open external retaining ring with two pierced plier ears. Model size scales the ring, while the installation-gap choice moves the ears and changes the opening; spring steel and ear finish have separate color controls.',
  tags: ['retaining ring', 'circlip', 'snap ring', 'shaft retainer', 'hardware'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 420,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const gap = param('gap', 'standard', { choices: ['compact', 'standard', 'wide'], label: 'Installation gap' });
const springSteel = param('springSteel', '#4f6874', { label: 'Spring steel band' });
const stainless = param('stainless', '#cbd3d7', { label: 'Stainless ear finish' });

presets({
  dark: { springSteel: '#4c585e', stainless: '#7d8a91' },
  brass: { springSteel: '#75838a', stainless: '#b38b52' },
  weathered: { springSteel: '#5b5550', stainless: '#8b8275' },
  bluePhosphate: { springSteel: '#3f5965', stainless: '#a8b5ba' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const opening = (gap.value === 'compact' ? 4 : gap.value === 'wide' ? 8 : 6) * s;
const earWidth = 6.5 * s;
const earY = 16.5 * s;
const earDepth = 7 * s;
const earHeight = 3 * s;
const earCenterY = earY + earDepth / 2;
const earOffset = opening / 2 + earWidth / 2;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) =>
  box(w, d, h).translate(x, y, z);

// A radial slot separates the band ends so the ring can expand over a shaft.
let ring = cylinder(earHeight, 20 * s, 24)
  .subtract(cylinder(earHeight + 2 * s, 16 * s, 24).translate(0, 0, -s));
ring = ring.subtract(block(-opening / 2, 14 * s, -s, opening, 10 * s, 5 * s));

const ear = (centerX: number) =>
  block(centerX - earWidth / 2, earY, 0, earWidth, earDepth, earHeight)
    .subtract(cylinder(earHeight + 2 * s, 1.55 * s, 16).translate(centerX, earCenterY, -s));

const clip = assembly('retaining-ring');
clip.part('spring-band', ring.color(springSteel));
clip.part('left-plier-ear', ear(-earOffset).color(stainless));
clip.part('right-plier-ear', ear(earOffset).color(stainless));

return clip.model();
