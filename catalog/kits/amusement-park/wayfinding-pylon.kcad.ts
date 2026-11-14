// SPDX-License-Identifier: CC0-1.0
// Park wayfinding pylon: the tall fingerpost at a path junction that points
// guests toward each land.
// What makes it a wayfinding post rather than a pole with boards: arrow-
// shaped finger blades, each with a pointed tip, a fishtail tail and a
// cream lettering panel, fanned out at different heights toward different
// destinations; a round post with turned collars on a stepped stone plinth;
// and a star finial on a ball at the top so it is visible across the crowd.
// Generic visualization geometry at about real size (about 3.4 m tall, blades
// about 1.3 m long), millimetres, Z up, standing on z = 0.
meta({
  name: "wayfinding-pylon",
  license: "CC0-1.0",
  title: "Park wayfinding pylon",
  description: "Theme-park fingerpost at about real size: four arrow-shaped finger blades with pointed tips, fishtail tails and cream lettering panels fanned toward different destinations, a round post with turned collars on a stepped plinth, and a gilt star finial on a ball. Material controls: powder-coated post and plinth, blade enamel, lettering panel, gilt trim. Festival, twilight and adventure-land presets.",
  tags: ["wayfinding", "signpost", "fingerpost", "direction sign", "arrow sign", "amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 3000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#2f4f5f", { label: "Powder-coated post and plinth" });
const enamel = param("enamel", "#c8553d", { label: "Finger blade enamel" });
const signFace = param("signFace", "#f3e9cf", { label: "Lettering panels" });
const gilt = param("gilt", "#d4a53c", { label: "Collars, tips and star finial" });

presets({
  festival: { powderCoat: "#2e6fb3", enamel: "#e04f6a", signFace: "#fff6dc", gilt: "#f2c230" },
  twilight: { powderCoat: "#1f2a38", enamel: "#3d5a8f", signFace: "#c9c2ad", gilt: "#9fb0b8" },
  adventureLand: { powderCoat: "#5a4330", enamel: "#3f7a3a", signFace: "#e8d6a8", gilt: "#b8913f" },
});

const p = assembly("wayfinding-pylon");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const turned = (pts: [number, number][]) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Outline drawn in (x, z), extruded t thick and centred on y = 0.
const blade = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);

// Stepped plinth and round post with turned collars.
add("plinth-lower", extrudePolygon(filletPolygon([[-380, -380], [380, -380], [380, 380], [-380, 380]], 40, { segments: 3 }), 140).color(powderCoat));
add("plinth-upper", turned([[0, 140], [250, 140], [250, 180], [160, 300], [0, 300]]).color(powderCoat));
add("post", cylinder(2900, 75, 18).translate(0, 0, 300).color(powderCoat));
for (const [k, z] of [300, 1200, 3150].entries()) add(`collar-${k}`, turned([[0, z], [100, z], [100, z + 25], [86, z + 50], [0, z + 50]]).color(gilt));

// Finger blades: pointed tip, fishtail tail, a cream lettering panel each side.
const H = 260;
const T = 50;
const fingers: { len: number; z: number; yaw: number }[] = [
  { len: 1350, z: 2900, yaw: -35 },
  { len: 1200, z: 2560, yaw: 150 },
  { len: 1300, z: 2220, yaw: -70 },
  { len: 1150, z: 1880, yaw: 115 },
];
for (const [k, f] of fingers.entries()) {
  const L = f.len;
  const outline: [number, number][] = [[40, -H / 2], [L - 170, -H / 2], [L, 0], [L - 170, H / 2], [40, H / 2], [110, 0]];
  const panel: [number, number][] = [[150, -H / 2 + 40], [L - 220, -H / 2 + 40], [L - 220, H / 2 - 40], [150, H / 2 - 40]];
  const tip: [number, number][] = [[L - 150, -H / 2 + 30], [L - 20, 0], [L - 150, H / 2 - 30]];
  const place = (s: Shape) => s.translate(0, 0, f.z).rotateZ(f.yaw);
  add(`blade-${k}`, place(blade(outline, T)).color(enamel));
  add(`blade-panel-${k}`, place(blade(panel, T + 12)).color(signFace));
  add(`blade-tip-${k}`, place(blade(tip, T + 12)).color(gilt));
  for (let j = 0; j < 3; j++) add(`blade-text-${k}-${j}`, place(box(L - 520 - j * 140, T + 16, 22, true).translate(150 + (L - 520 - j * 140) / 2 + 40, 0, 50 - j * 50)).color(powderCoat));
  add(`blade-bracket-${k}`, place(box(160, T + 30, H + 40, true).translate(80, 0, 0)).color(powderCoat));
}

// Star finial on a ball.
add("finial-ball", sphere(80).translate(0, 0, 3270).color(gilt));
const STAR = Array.from({ length: 10 }, (_, k) => {
  const a = Math.PI / 2 + (k * Math.PI) / 5;
  const r = k % 2 === 0 ? 170 : 70;
  return [r * Math.cos(a), r * Math.sin(a)] as [number, number];
});
add("finial-star", blade(STAR, 40).translate(0, 0, 3480).rotateZ(-45).color(gilt));

return p.model();
