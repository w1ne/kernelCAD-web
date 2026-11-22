// SPDX-License-Identifier: CC0-1.0
// Ride photo camera: the trackside on-ride photo unit that snaps each car at
// the big drop so guests can buy the picture at the exit.
// What makes it an on-ride camera rather than a CCTV box: a weatherproof
// housing with an overhanging sun hood, a big glass lens in a bezel aimed down
// at the track, a pair of strobe flash heads on a crossbar either side of it,
// a pan-tilt yoke on a tapered galvanised pole, a cable conduit to a junction
// box, a bolted base plate with gussets, and a "smile" sign that warns riders
// where to look.
// Generic visualization geometry at about real size (about 1.1 m across the
// strobes, 2.9 m to the hood), millimetres, Z up, lens aimed toward -Y,
// standing on z = 0.
meta({
  name: "ride-photo-camera",
  license: "CC0-1.0",
  title: "Ride photo camera",
  description: "Trackside on-ride photo camera at about real size: weatherproof housing with an overhanging sun hood, a big glass lens in a bezel aimed down at the track, twin strobe flash heads on a crossbar, a pan-tilt yoke on a tapered galvanised pole with a cable conduit and junction box, a gusseted base plate, and a smile sign for riders. Material controls: enclosure paint, galvanised steel, lens glass, strobe diffuser. Park white, festival and twilight presets.",
  tags: ["ride photo", "on-ride camera", "camera", "strobe", "flash", "pole mount", "amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 4000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const enclosure = param("enclosure", "#e6e7e1", { label: "Enclosure paint and sign" });
const galvanised = param("galvanised", "#8a9499", { label: "Galvanised pole, yoke and brackets" });
const glass = param("glass", "#1d3445", { label: "Lens glass and smiley" });
const strobe = param("strobe", "#ffe9a8", { label: "Strobe diffusers and sign face" });

presets({
  parkWhite: { enclosure: "#e6e7e1", galvanised: "#8a9499", glass: "#1d3445", strobe: "#ffe9a8" },
  festival: { enclosure: "#d47452", galvanised: "#a5adaf", glass: "#22303a", strobe: "#fff3c4" },
  twilight: { enclosure: "#35576f", galvanised: "#5f6d73", glass: "#101b24", strobe: "#ffd36b" },
});

const p = assembly("ride-photo-camera");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const turned = (pts: [number, number][]) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Side profile drawn in (y, z) and extruded t wide along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
// Rounded section in (x, z), extruded along Y from y0 for len.
const tube = (w: number, h: number, r: number, len: number, y0: number) =>
  extrudePolygon(filletPolygon([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], r, { segments: 4 }), len).rotateX(90).translate(0, y0 + len, 0);

// Base plate with anchor bolts and gussets.
add("base-plate", box(420, 420, 24, true).translate(0, 0, 12).color(galvanised));
for (let k = 0; k < 4; k++) {
  const a = (k * Math.PI) / 2 + Math.PI / 4;
  add(`anchor-nut-${k}`, cylinder(30, 22, 6).translate(165 * Math.cos(a), 165 * Math.sin(a), 24).color(galvanised));
  add(`gusset-${k}`, profileYZ([[60, 24], [180, 24], [60, 200]], 14).rotateZ(k * 90).color(galvanised));
}

// Tapered pole, cable conduit and junction box.
const TOP = 2380;
add("pole", turned([[0, 24], [72, 24], [56, TOP], [0, TOP]]).color(galvanised));
add("conduit", cylinder(TOP - 400, 14, 8).translate(0, 78, 300).color(galvanised));
add("junction-box", box(150, 90, 200, true).translate(0, 100, 1100).color(enclosure));
add("junction-lid", box(160, 10, 210, true).translate(0, 148, 1100).color(galvanised));

// "Smile" sign on the pole facing the track.
const SZ = 1650;
add("sign-bracket", box(40, 120, 40, true).translate(0, -100, SZ).color(galvanised));
add("sign-board", box(620, 16, 360, true).translate(0, -168, SZ).color(enclosure));
add("sign-face", cylinder(10, 140, 24).rotateX(90).translate(0, -176, SZ).color(strobe));
for (const x of [-48, 48]) add(`smiley-eye-${x > 0 ? "r" : "l"}`, cylinder(8, 18, 10).rotateX(90).translate(x, -186, SZ + 40).color(glass));
for (let k = 0; k < 5; k++) {
  const a = Math.PI * (1.15 + k * 0.175);
  add(`smiley-mouth-${k}`, box(34, 8, 16, true).rotateY((-(a - 1.5 * Math.PI) * 180) / Math.PI).translate(80 * Math.cos(a), -186, SZ + 80 * Math.sin(a) + 10).color(glass));
}
for (const x of [-250, 250]) add(`sign-star-${x > 0 ? "r" : "l"}`, extrudePolygon([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => { const r = k % 2 === 0 ? 70 : 30; const a = Math.PI / 2 + (k * Math.PI) / 5; return [r * Math.cos(a), r * Math.sin(a)]; }), 8).rotateX(90).translate(x, -176, SZ).color(strobe));

// Pan-tilt yoke on the pole top.
add("pan-head", cylinder(60, 90, 16).translate(0, 0, TOP).color(galvanised));
for (const sx of [-1, 1]) add(`yoke-arm-${sx > 0 ? "r" : "l"}`, box(24, 120, 260, true).translate(sx * 205, 0, TOP + 180).color(galvanised));
add("yoke-base", box(434, 120, 30, true).translate(0, 0, TOP + 65).color(galvanised));

// Camera head tilted 15 degrees down toward the track on -Y.
const HZ = TOP + 260;
const head = (s: Shape) => s.rotateX(15).translate(0, 0, HZ);
add("housing", head(tube(360, 300, 50, 640, -300)).color(enclosure));
add("tilt-axle", cylinder(440, 22, 12).rotateY(90).translate(-220, 0, HZ).color(galvanised));
add("sun-hood", head(profileYZ([[-420, 150], [300, 150], [300, 185], [-420, 205]], 430)).color(enclosure));
for (const sx of [-1, 1]) add(`hood-cheek-${sx > 0 ? "r" : "l"}`, head(profileYZ([[-420, 205], [-300, 60], [-300, 150]], 12).translate(sx * 209, 0, 0)).color(enclosure));
add("lens-bezel", head(cylinder(40, 130, 24).rotateX(90).translate(0, -300, 0)).color(galvanised));
add("lens-hood", head(turned([[110, 0], [126, 0], [140, 70], [124, 70]]).rotateX(90).translate(0, -340, 0)).color(enclosure));
add("lens-glass", head(cylinder(12, 110, 24).rotateX(90).translate(0, -330, 0)).color(glass));
add("lens-ring", head(torus(72, 8, 18).rotateX(90).translate(0, -344, 0)).color(galvanised));
add("status-led", head(sphere(14).translate(130, -300, 110)).color(strobe));
add("rear-gland", head(cylinder(60, 26, 10).rotateX(-90).translate(0, 340, -60)).color(galvanised));

// Twin strobe flash heads on a crossbar below the camera.
const BZ = TOP + 70;
add("strobe-bar", box(1100, 60, 50, true).translate(0, -60, BZ).color(galvanised));
for (const sx of [-1, 1]) {
  const x = sx * 470;
  const s = sx > 0 ? "r" : "l";
  add(`strobe-knuckle-${s}`, cylinder(70, 28, 10).translate(x, -60, BZ + 25).color(galvanised));
  add(`strobe-head-${s}`, box(220, 200, 160, true).rotateX(15).rotateZ(-sx * 12).translate(x, -80, BZ + 175).color(enclosure));
  add(`strobe-diffuser-${s}`, box(190, 14, 130, true).rotateX(15).rotateZ(-sx * 12).translate(x - sx * 20, -183, BZ + 150).color(strobe));
}

return p.model();
