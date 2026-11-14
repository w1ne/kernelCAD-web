// SPDX-License-Identifier: CC0-1.0
// Cricket wicket pitched in the crease: what makes it one is three round,
// domed stumps standing 28 in (711 mm) out of the ground, 9 in (229 mm) across
// overall, with two turned bails — barrel in the middle, spigots at the ends —
// lying in grooves across the stump tops. A painted sponsor band wraps the
// stumps and the white bowling crease runs through their feet on a patch of
// rolled pitch. Generic visualization geometry at real size, millimetres,
// Z up, the pitch patch on z = 0.
meta({
  name: 'cricket-wicket',
  license: 'CC0-1.0',
  title: 'Cricket wicket',
  description: "Cricket wicket at real size pitched in the crease: three domed stumps 711 mm tall and 229 mm across, grooved tops carrying two turned bails with barrels and spigots, a painted band round the stumps, and a patch of rolled pitch with the white bowling crease. The bails choice switches wooden bails for lit LED bails. Material controls: stump timber, stump paint band, bails, pitch, crease paint; matchPainted, ledBails and weathered presets.",
  tags: ['cricket wicket', 'stumps', 'bails', 'cricket', 'field sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const bails = param('bails', 'wood', { choices: ['wood', 'led'], label: 'Bails' });
const wicketTimber = param('wicketTimber', '#d9b98a', { label: 'Stump timber' });
const stumpPaint = param('stumpPaint', '#1f5aa6', { label: 'Stump paint band' });
const bailPaint = param('bailPaint', '#c9a06c', { label: 'Bails' });
const groundRubber = param('groundRubber', '#b8a27a', { label: 'Rolled pitch' });
const creasePaint = param('creasePaint', '#f4f2ea', { label: 'Crease paint' });
presets({
  clubColors: { wicketTimber: '#8f744f', stumpPaint: '#2f6b3a' },
  matchPainted: { wicketTimber: '#f2efe6', stumpPaint: '#c0392b', bailPaint: '#f2efe6' },
  ledBails: { bails: 'led', bailPaint: '#e53b2f', wicketTimber: '#1f2224', stumpPaint: '#e53b2f' },
  weathered: { wicketTimber: '#a99272', stumpPaint: '#5b6f86', bailPaint: '#9c8566', groundRubber: '#8f8a6a', creasePaint: '#d6d2c2' },
});

const p = assembly('cricket-wicket');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Turned profile [[r, z], ...] revolved about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const G = 12;                    // pitch patch thickness; the ground is its top
const H = 711;                   // stump height above the ground
const SR = 17.5;                 // stump radius
const PITCH = 96.5;              // stump centre spacing (229 mm overall)
const GROOVE = 6;                // bail groove depth

// Stumps: round, domed tops with a groove across for the bails, painted band.
for (const [i, x] of [-PITCH, 0, PITCH].entries()) {
  const name = ['left', 'middle', 'right'][i];
  add(`stump-${name}`, turned([[0, 0], [SR, 0], [SR, H - 12], [SR - 3, H - 5], [SR - 8, H - 1], [0, H]])
    .subtract(box(3 * SR, 9, GROOVE * 2, true).translate(0, 0, H))
    .translate(x, 0, G).color(wicketTimber));
  add(`stump-band-${name}`, turned([[SR - 1, 380], [SR + 0.8, 380], [SR + 0.8, 560], [SR - 1, 560]]).translate(x, 0, G).color(stumpPaint));
  add(`stump-band-trim-${name}`, turned([[SR - 1, 360], [SR + 0.8, 360], [SR + 0.8, 368], [SR - 1, 368]]).translate(x, 0, G).color(stumpPaint));
}

// Bails: turned barrel with collars and spigots, lying across adjacent stump tops.
const BAIL = 109.5;
const bailProfile = bails.value === 'led'
  ? [[0, 0], [5, 0], [5, 12], [9, 15], [9, BAIL - 15], [5, BAIL - 12], [5, BAIL], [0, BAIL]]
  : [[0, 0], [4, 0], [4, 13], [6.5, 16], [6.5, 30], [8, 34], [8, 75], [6.5, 79], [6.5, 93], [4, 96], [4, BAIL], [0, BAIL]];
for (const [i, cx] of [-PITCH / 2, PITCH / 2].entries()) {
  add(`bail-${i === 0 ? 'left' : 'right'}`, turned(bailProfile).rotateY(90)
    .translate(cx - BAIL / 2, 0, G + H - GROOVE + 8).color(bailPaint));
}

// Patch of rolled pitch with the white bowling crease through the stump feet.
add('pitch', box(900, 560, G, true).translate(0, 0, G / 2).color(groundRubber));
add('bowling-crease', box(900, 50, 1.5, true).translate(0, 0, G + 0.6).color(creasePaint));

return p.model();
