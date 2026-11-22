// SPDX-License-Identifier: CC0-1.0
// Entrance photo frame: the giant freestanding "picture frame" just inside the
// park gates that families step behind for their arrival photo.
// What makes it a photo frame rather than a gate: a deep bevelled moulding
// around an open picture window with a knee-high bottom rail, corner rosettes,
// scrolled crest ornaments carrying an oversized camera (body, lens barrel,
// flash and shutter button), a swallowtail welcome ribbon under the crest, two
// panelled plinths with planter boxes and a footprint mark where the
// photographer stands.
// Generic visualization geometry at about real size (about 2.6 m wide, 3 m
// tall), millimetres, Z up, facing -Y, standing on z = 0.
meta({
  name: "entrance-photo-frame",
  license: "CC0-1.0",
  title: "Entrance photo frame",
  description: "Giant freestanding arrival photo frame at about real size: deep bevelled gilt moulding around an open picture window, corner rosettes, scrolled crest carrying an oversized camera with lens, flash and shutter button, swallowtail welcome ribbon, two panelled plinths with planter boxes and a photographer footprint mark. Material controls: gilt moulding, powder-coated plinths, camera body, and acrylic lens and ribbon. Classic, festival and twilight presets.",
  tags: ["photo op", "picture frame", "selfie spot", "camera", "entrance", "welcome", "amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 3500,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const gilt = param("gilt", "#d6aa3e", { label: "Gilt frame moulding" });
const powderCoat = param("powderCoat", "#2f6f7e", { label: "Powder-coated plinths" });
const cameraBody = param("cameraBody", "#2b2d33", { label: "Camera body and planter soil" });
const acrylic = param("acrylic", "#d9473f", { label: "Acrylic lens ring and ribbon" });

presets({
  classic: { gilt: "#d6aa3e", powderCoat: "#2f6f7e", cameraBody: "#2b2d33", acrylic: "#d9473f" },
  festival: { gilt: "#f2c84b", powderCoat: "#d47452", cameraBody: "#3a2f4a", acrylic: "#3fa6c9" },
  twilight: { gilt: "#b9a26a", powderCoat: "#35576f", cameraBody: "#1d2128", acrylic: "#8e5bb0" },
});

const p = assembly("entrance-photo-frame");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Outline drawn in (x, z) and extruded t deep along Y, centred on y = 0.
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);

const FW = 2300;
const FB = 700;
const FT = 2500;
const M = 180;

// Panelled plinths with planters on top of each foot.
for (const sx of [-1, 1]) {
  const s = sx > 0 ? "r" : "l";
  const x = sx * (FW / 2 + 90);
  add(`plinth-${s}`, box(420, 520, 620, true).translate(x, 0, 310).color(powderCoat));
  add(`plinth-cap-${s}`, box(470, 570, 50, true).translate(x, 0, 645).color(gilt));
  add(`plinth-panel-${s}`, box(300, 20, 420, true).translate(x, -265, 320).color(gilt));
  add(`plinth-plinth-${s}`, box(460, 560, 60, true).translate(x, 0, 30).color(gilt));
  add(`planter-${s}`, box(360, 220, 160, true).translate(x, -120, 750).color(powderCoat));
  add(`planter-soil-${s}`, box(330, 190, 10, true).translate(x, -120, 830).color(cameraBody));
  for (let k = 0; k < 3; k++) add(`shrub-${s}-${k}`, sphere(90).translate(x + (k - 1) * 100, -120, 880 + (k % 2) * 30).color(k === 1 ? acrylic : gilt));
}

// Bevelled moulding: an outer frame and a deeper inner lip.
const bar = (name: string, w: number, h: number, x: number, z: number, d: number, y: number) =>
  add(name, box(w, d, h, true).translate(x, y, z).color(gilt));
// Four mitred-looking bars, outer layer.
bar("frame-top", FW + 2 * M, M, 0, FT + M / 2, 160, 0);
bar("frame-bottom", FW + 2 * M, M, 0, FB - M / 2, 160, 0);
bar("frame-left", M, FT - FB, -FW / 2 - M / 2, (FT + FB) / 2, 160, 0);
bar("frame-right", M, FT - FB, FW / 2 + M / 2, (FT + FB) / 2, 160, 0);
// Inner bevel lip standing proud toward the camera.
const L = 70;
bar("lip-top", FW, L, 0, FT - L / 2, 120, -60);
bar("lip-bottom", FW, L, 0, FB + L / 2, 120, -60);
bar("lip-left", L, FT - FB - 2 * L, -FW / 2 + L / 2, (FT + FB) / 2, 120, -60);
bar("lip-right", L, FT - FB - 2 * L, FW / 2 - L / 2, (FT + FB) / 2, 120, -60);
// Outer bead.
add("bead-top", cylinder(FW + 2 * M, 30, 8).rotateY(90).translate(-FW / 2 - M, -85, FT + M - 20).color(acrylic));
add("bead-bottom", cylinder(FW + 2 * M, 30, 8).rotateY(90).translate(-FW / 2 - M, -85, FB - M + 20).color(acrylic));

// Corner rosettes.
for (const [x, z, n] of [[-1, FT, "tl"], [1, FT, "tr"], [-1, FB, "bl"], [1, FB, "br"]] as [number, number, string][]) {
  const cx = x * (FW / 2 + M / 2);
  const cz = z + (z === FT ? M / 2 : -M / 2);
  add(`rosette-${n}`, cylinder(40, 110, 16).rotateX(90).translate(cx, -80, cz).color(gilt));
  add(`rosette-boss-${n}`, sphere(55).translate(cx, -120, cz).color(acrylic));
}

// Crest: scrolls carrying an oversized camera.
const CZ = FT + M;
for (const sx of [-1, 1]) {
  add(`crest-scroll-${sx > 0 ? "r" : "l"}`, torus(150, 30, 16).rotateX(90).translate(sx * 330, 0, CZ + 130).color(gilt));
}
add("crest-base", profileXZ([[-520, 0], [520, 0], [380, 90], [-380, 90]], 160).translate(0, 0, CZ).color(gilt));
add("camera-body", extrudeRoundedRect(560, 340, 50, 200, { axis: "y" }).translate(0, -100, CZ + 90 + 170).color(cameraBody));
add("camera-hump", profileXZ([[-130, 0], [130, 0], [90, 90], [-90, 90]], 160).translate(0, 0, CZ + 430).color(cameraBody));
add("lens-barrel", cylinder(150, 120, 24).rotateX(90).translate(0, -100, CZ + 260).color(cameraBody));
add("lens-ring", torus(115, 22, 24).rotateX(90).translate(0, -250, CZ + 260).color(acrylic));
add("lens-glass", cylinder(10, 95, 24).rotateX(90).translate(0, -240, CZ + 260).color(powderCoat));
add("flash", box(110, 30, 60, true).translate(-180, -110, CZ + 370).color(gilt));
add("shutter-button", cylinder(30, 35, 12).translate(190, 0, CZ + 430).color(acrylic));

// Swallowtail welcome ribbon hanging under the top rail.
const ribbon: [number, number][] = [
  [-700, 0], [-620, 70], [-700, 140], [-520, 140], [-420, 190], [420, 190], [520, 140], [700, 140], [620, 70], [700, 0], [500, 0], [420, 50], [-420, 50], [-500, 0],
];
add("welcome-ribbon", profileXZ(ribbon, 20).translate(0, -95, FT - 300).color(acrylic));
add("ribbon-band", box(800, 24, 60, true).translate(0, -110, FT - 175).color(gilt));

// Footprint mark where the photographer stands.
const foot: [number, number][] = [[-50, 0], [50, 0], [60, 120], [40, 220], [-40, 220], [-60, 120]];
for (const sx of [-1, 1]) add(`footprint-${sx > 0 ? "r" : "l"}`, extrudePolygon(foot, 6).translate(sx * 90, -1400, 6).color(gilt));
add("photo-pad", cylinder(6, 380, 24).translate(0, -1300, 0).color(powderCoat));

return p.model();
