// Digital SLR camera: an interchangeable-lens stills camera with a mirror box and
// optical viewfinder. What makes it a DSLR rather than a generic camera box: the
// pentaprism hump on top carrying the hot shoe and eyepiece, a deep rubber hand
// grip with the shutter button and front command dial, a stepped shoulder with
// a mode dial and top LCD, a bayonet mount with a lens release button, a rear
// screen, and a revolved lens with ribbed zoom and focus rings.
// Generic visualization geometry at real size, millimetres, Z up, base on z = 0,
// lens pointing to -Y, grip at -X (the user's right hand).
meta({
  name: "digital-slr-camera",
  license: 'CC0-1.0',
  title: "Digital SLR camera",
  description: "Interchangeable-lens DSLR with a pentaprism viewfinder hump, hot shoe and eyecup, deep rubber grip with shutter button and command dial, mode dial and top LCD, bayonet mount and a revolved lens with ribbed zoom and focus rings. Material controls: body polymer, grip rubber, optical glass, metal. Lens choice kit zoom or 50 mm prime; studioBlack and fieldRental presets.",
  tags: ["digital slr camera", "dslr", "photography", "video", "studio", "camera", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 2000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const lens = param('lens', 'kit-zoom', { choices: ['kit-zoom', 'prime-50'], label: 'Mounted lens' });
const polymer = param('polymer', '#343c43', { label: 'Body and lens barrel polymer' });
const rubber = param('rubber', '#1b2024', { label: 'Grip, rings and eyecup rubber' });
const glass = param('glass', '#45a6c0', { label: 'Lens element and screen glass' });
const metal = param('metal', '#a9b5ba', { label: 'Mount, hot shoe and dial metal' });

presets({
  studioBlack: { polymer: '#343c43', rubber: '#1b2024', glass: '#45a6c0', metal: '#a9b5ba' },
  fieldRental: { polymer: '#c75a2e', rubber: '#292b2d', glass: '#79d4e3', metal: '#657780' },
});

const p = assembly("digital-slr-camera");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Revolve an (r, axial) profile about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Ribbed ring: n ribs alternating between r and r - depth, from a0 to a1 along the axis.
const ribbed = (r, depth, a0, a1, n = 24) => extrudePolygon(
  Array.from({ length: n * 2 }, (_, i) => {
    const t = (i / (n * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r - depth;
    return [rr * Math.cos(t), rr * Math.sin(t)];
  }),
  a1 - a0,
).translate(0, 0, a0);
// Solid along +X from x0 for length len, with a YZ-plane cross-section given as [y, z] points.
const alongX = (pts, x0, len) => extrudePolygon(pts.map(([y, z]) => [-z, y]), len).rotateY(90).translate(x0, 0, 0);
// Solid along +Y from y0 for length len, with an XZ-plane cross-section given as [x, z] points.
const alongY = (pts, y0, len) => extrudePolygon(pts, len).rotateX(90).translate(0, y0 + len, 0);
// Lens-axis part: revolved about Z, then pointed at -Y from the mount face.
const LENS_Z = 44;
const onAxis = (shape) => shape.rotateX(90).translate(0, -37, LENS_Z);

// Body shell seen from the front: flat base, rounded corners, stepped shoulders.
add('body', alongY([[-64, 0], [62, 0], [69, 6], [69, 72], [63, 79], [-40, 79], [-56, 82], [-69, 72], [-69, 6]], -37, 72).color(polymer));
// Deep hand grip bulging forward of the body on the -X side.
add('grip', extrudePolygon([[-69, -28], [-69, -50], [-63, -60], [-51, -64], [-40, -59], [-36, -46], [-37, -28]], 78).color(rubber));
add('grip-back-pad', box(28, 4, 50, true).translate(-52, 36.5, 46).color(rubber));
// Pentaprism hump: sloped front, flat top, hot shoe and pop-up flash face.
add('prism-hump', alongX([[-28, 78], [30, 78], [30, 98], [20, 106], [-6, 106], [-24, 92]], -30, 60).color(polymer));
add('hot-shoe', box(22, 20, 3, true).translate(0, 6, 107.5).color(metal));
add('hot-shoe-rails', box(24, 18, 2, true).translate(0, 6, 110).color(metal));
add('eyepiece', box(38, 6, 24, true).translate(0, 33, 92).color(rubber));
add('eyecup', box(44, 10, 30, true).translate(0, 41, 92).color(rubber));
add('viewfinder-glass', box(22, 1, 14, true).translate(0, 46.5, 93).color(glass));

// Top deck: mode dial and top LCD on the left shoulder, shutter button and dial on the grip.
add('mode-dial', ribbed(15, 1.5, 0, 9, 18).translate(46, 4, 79).color(metal));
add('mode-dial-cap', turned([[0, 0], [12, 0], [12, 2], [0, 3]]).translate(46, 4, 88).color(polymer));
add('top-lcd', box(30, 22, 1, true).translate(-48, 12, 79.5).color(glass));
add('shutter-collar', turned([[0, 0], [10, 0], [10, 4], [0, 4]]).translate(-54, -42, 78).color(metal));
add('shutter-button', turned([[0, 0], [6.5, 0], [6.5, 3], [4, 5], [0, 5]]).translate(-54, -42, 82).color(metal));
add('front-command-dial', ribbed(7, 1, 0, 6, 12).rotateX(90).translate(-54, -54, 72).color(polymer));
add('rear-command-dial', ribbed(8, 1, 0, 6, 12).rotateY(90).translate(52, 34, 72).color(polymer));

// Bayonet mount, lens release button and front strap lugs.
add('mount-ring', onAxis(turned([[25, 0], [31, 0], [31, 3], [25, 3]]).translate(0, 0, -3)).color(metal));
add('mirror-box', onAxis(turned([[0, -2], [24, -2], [24, 0], [0, 0]])).color(rubber));
add('lens-release', turned([[0, 0], [5, 0], [5, 3], [0, 3]]).rotateX(90).translate(36, -37, 34).color(metal));
add('strap-lug-left', box(4, 10, 10, true).translate(71, -10, 66).color(metal));
add('strap-lug-right', box(4, 10, 10, true).translate(-71, -10, 66).color(metal));

// Rear screen and control cluster.
add('rear-screen-bezel', box(80, 3, 58, true).translate(10, 36.5, 38).color(rubber));
add('rear-screen', box(74, 1, 50, true).translate(10, 38.5, 38).color(glass));
add('rear-thumb-pad', box(18, 3, 22, true).translate(-54, 36.5, 54).color(rubber));
add('multi-controller', turned([[0, 0], [7, 0], [7, 2], [0, 2]]).rotateX(-90).translate(-54, 35, 34).color(metal));

// Lens: barrel, rubber rings and recessed front element.
if (lens.value === 'prime-50') {
  add('lens-barrel', onAxis(turned([[0, 0], [30, 0], [30, 6], [31, 6], [31, 40], [33, 42], [33, 46], [27, 46], [27, 43], [0, 43]])).color(polymer));
  add('focus-ring', onAxis(ribbed(32.5, 1.2, 14, 32, 28)).color(rubber));
  add('lens-index-band', onAxis(turned([[31, 8], [32, 8], [32, 10], [31, 10]])).color(metal));
  add('front-element', onAxis(turned([[0, 41], [26, 41], [26, 44], [0, 45]])).color(glass));
} else {
  add('lens-barrel', onAxis(turned([[0, 0], [30, 0], [30, 6], [32, 6], [32, 70], [36, 74], [36, 82], [30, 82], [30, 78], [0, 78]])).color(polymer));
  add('zoom-ring', onAxis(ribbed(34, 1.4, 14, 44, 30)).color(rubber));
  add('focus-ring', onAxis(ribbed(34, 1, 54, 66, 30)).color(rubber));
  add('lens-index-band', onAxis(turned([[32, 8], [33, 8], [33, 10], [32, 10]])).color(metal));
  add('front-element', onAxis(turned([[0, 76], [29, 76], [29, 80], [0, 81]])).color(glass));
}

return p.model();
