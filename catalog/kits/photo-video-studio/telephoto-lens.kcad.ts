// Telephoto zoom lens: a long, heavy lens for sport and wildlife that is carried
// by its own tripod collar rather than by the camera mount. What makes it this
// thing rather than a tube: a barrel that flares toward a large front element,
// a rotating tripod collar with a foot and lock knob, wide ribbed zoom and focus
// rings, an AF/IS switch panel, a bayonet mount at the rear and a deep hood that
// can be fitted, reversed over the barrel for transport, or removed.
// Generic visualization geometry at real size, millimetres, Z up, resting on its
// tripod foot at z = 0, optical axis along +X (mount at x = 0, front at +X).
meta({
  name: "telephoto-lens",
  license: 'CC0-1.0',
  title: "Telephoto lens",
  description: "Long telephoto zoom lens resting on its tripod collar foot: flared enamel barrel, ribbed zoom and focus rings, rotating collar with lock knob, AF/IS switch panel, bayonet mount, recessed front element and a deep hood. Material controls: barrel enamel, collar and mount metal, ring rubber, optical glass. Hood fitted, reversed or removed; studioBlack and fieldRental presets.",
  tags: ["telephoto lens", "zoom lens", "photography", "video", "studio", "wildlife", "sport", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const hood = param('hood', 'fitted', { choices: ['fitted', 'reversed', 'none'], label: 'Lens hood' });
const enamel = param('enamel', '#e4e1d8', { label: 'Barrel enamel' });
const metal = param('metal', '#a9b5ba', { label: 'Collar and mount metal' });
const rubber = param('rubber', '#1b2024', { label: 'Ring, hood and switch rubber' });
const glass = param('glass', '#45a6c0', { label: 'Optical glass' });

presets({
  studioBlack: { enamel: '#2e3337', metal: '#a9b5ba', rubber: '#1b2024', glass: '#45a6c0' },
  fieldRental: { enamel: '#c9c4a8', metal: '#657780', rubber: '#292b2d', glass: '#79d4e3' },
});

const p = assembly("telephoto-lens");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Optical axis height above the foot, chosen so the fitted hood clears the ground.
const H = 92;
// Revolve an (r, axial) profile about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Lens-axis part: revolved about Z, then laid along +X at the axis height.
const onAxis = (shape) => shape.rotateY(90).translate(0, 0, H);
// Ribbed ring: n ribs alternating between r and r - depth, from a0 to a1 along the axis.
const ribbed = (r, depth, a0, a1, n = 30) => onAxis(extrudePolygon(
  Array.from({ length: n * 2 }, (_, i) => {
    const t = (i / (n * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r - depth;
    return [rr * Math.cos(t), rr * Math.sin(t)];
  }),
  a1 - a0,
).translate(0, 0, a0));
// Solid along +Y centred on y = 0, with an XZ-plane cross-section given as [x, z] points.
const alongY = (pts, len) => extrudePolygon(pts, len).rotateX(90).translate(0, len / 2, 0);

// Rear: bayonet mount, contact block and the narrow rear barrel.
add('bayonet-mount', onAxis(turned([[22, -8], [31, -8], [31, 0], [22, 0]])).color(metal));
add('rear-contacts', box(4, 10, 3, true).translate(-6, 0, H + 26).color(metal));
add('rear-barrel', onAxis(turned([[0, 0], [36, 0], [38, 8], [38, 62], [0, 62]])).color(enamel));
add('zoom-ring', ribbed(41, 1.6, 12, 54).color(rubber));

// Tripod collar ring with its lock knob, a pillar and the slotted foot on the ground.
add('collar-ring', onAxis(turned([[38, 62], [44, 62], [44, 86], [38, 86]])).color(metal));
add('collar-lock-knob', turned([[0, 0], [8, 0], [8, 10], [5, 14], [0, 14]]).rotateX(-90).translate(74, 44, H + 6).color(metal));
add('collar-pillar', alongY([[64, H - 40], [84, H - 40], [82, 18], [96, 10], [44, 10], [62, 18]], 22).color(metal));
add('foot-plate', box(70, 32, 10, true).translate(70, 0, 5).color(metal));
add('foot-pad', box(60, 26, 1.5, true).translate(70, 0, 0.75).color(rubber));

// Middle barrel flaring toward the front, with the AF/IS switch panel on its side.
add('mid-barrel', onAxis(turned([[0, 86], [42, 86], [45, 110], [50, 150], [0, 150]])).color(enamel));
add('switch-panel', box(38, 5, 22, true).rotateZ(-4).translate(118, -46, H).color(rubber));
for (const [i, x] of [104, 116, 128].entries()) add(`switch-${i}`, box(5, 3, 8, true).translate(x, -49.5, H + (i - 1) * 2).color(metal));
add('focus-ring', ribbed(53, 1.4, 154, 184).color(rubber));

// Front barrel, hood bayonet band, and the recessed front element.
add('front-barrel', onAxis(turned([[0, 150], [50, 150], [50, 188], [56, 200], [61, 214], [61, 226], [55, 226], [55, 216], [0, 216]])).color(enamel));
add('hood-bayonet-band', onAxis(turned([[61, 220], [62.5, 220], [62.5, 226], [61, 226]])).color(metal));
add('front-element', onAxis(turned([[0, 212], [54, 212], [54, 218], [0, 221]])).color(glass));

if (hood.value === 'fitted') {
  add('hood', onAxis(turned([[62, 222], [65, 222], [71, 300], [68, 300]])).color(rubber));
  add('hood-lock', box(12, 8, 6, true).translate(232, 0, H + 66).color(metal));
} else if (hood.value === 'reversed') {
  // Flipped back over the barrel for carrying: the wide mouth now faces the mount.
  add('hood', onAxis(turned([[62, 226], [65, 226], [71, 148], [68, 148]])).color(rubber));
  add('hood-lock', box(12, 8, 6, true).translate(218, 0, H + 66).color(metal));
}

return p.model();
