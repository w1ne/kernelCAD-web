// SPDX-License-Identifier: CC0-1.0
// Midway barker's podium: the striped stand a game host talks from to pull
// guests in off the midway.
// What makes it a barker's podium rather than a lectern: a flared body
// painted in circus stripes between gilt bands and corner beads, a big gilt
// medallion with a star on the front, a row of marquee bulbs under the lip,
// a sloped script desk, and a vintage chrome microphone on a gooseneck
// turned toward the host behind it.
// Generic visualization geometry at about real size (about 0.8 m wide,
// 1.55 m to the microphone), millimetres, Z up, audience on -Y, host on +Y,
// standing on z = 0.
meta({
  name: "midway-barker-microphone-stand",
  license: "CC0-1.0",
  title: "Midway barker's microphone podium",
  description: "Midway game host podium at about real size: flared body in circus stripes between gilt bands and corner beads, gilt star medallion, row of marquee bulbs under the lip, sloped script desk, and a vintage chrome microphone on a gooseneck facing the host. Material controls: painted body, stripe and bulb cream, gilt trim, chrome. Festival, twilight and vintage presets.",
  tags: ["podium", "barker", "microphone", "vintage microphone", "lectern", "carnival", "midway games", "amusement park", "theme park", "guest experience", "low poly", "CC0"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 3500,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const paint = param("paint", "#b8312f", { label: "Painted podium body" });
const stripe = param("stripe", "#f3e6c4", { label: "Cream stripes, desk and bulbs" });
const gilt = param("gilt", "#d4a53c", { label: "Gilt bands, beads and medallion" });
const chrome = param("chrome", "#c9ced1", { label: "Chrome microphone and gooseneck" });

presets({
  festival: { paint: "#2e6fb3", stripe: "#fff4d6", gilt: "#f2c230", chrome: "#dfe3e5" },
  twilight: { paint: "#3b2a55", stripe: "#c9b98f", gilt: "#a8873a", chrome: "#8a9aa0" },
  vintage: { paint: "#7a2b23", stripe: "#e8d6a8", gilt: "#b8913f", chrome: "#b5b0a4" },
});

const p = assembly("midway-barker-microphone-stand");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Outline drawn in (x, z) and extruded t thick toward +Y from y0.
const face = (pts: [number, number][], t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);
// Outline drawn in (y, z) and extruded t wide, centred on x = 0.
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const rodYZ = (x: number, a: [number, number], b: [number, number], r: number) => {
  const dy = b[0] - a[0];
  const dz = b[1] - a[1];
  return cylinder(Math.sqrt(dy * dy + dz * dz), r, 10).rotateX((-Math.atan2(dy, dz) * 180) / Math.PI).translate(x, a[0], a[1]);
};
const rodXZ = (y: number, a: [number, number], b: [number, number], r: number) => {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  return cylinder(Math.sqrt(dx * dx + dz * dz), r, 8).rotateY((Math.atan2(dx, dz) * 180) / Math.PI).translate(a[0], y, a[1]);
};

const Z0 = 120;
const Z1 = 1050;
const W0 = 560;
const W1 = 700;
const D = 420;
const half = (z: number) => (W0 + ((z - Z0) / (Z1 - Z0)) * (W1 - W0)) / 2;
const band = (za: number, zb: number, grow: number): [number, number][] => [[-half(za) - grow, za], [half(za) + grow, za], [half(zb) + grow, zb], [-half(zb) - grow, zb]];

// Plinth and flared body.
add("plinth", extrudeRoundedRect(W0 + 140, Z0, 30, D + 120, { axis: "y" }).translate(0, -(D + 120) / 2, Z0 / 2).color(paint));
add("plinth-band", face(band(Z0 - 30, Z0 - 10, 80), D + 130, -(D + 130) / 2).color(gilt));
add("body", face(band(Z0, Z1, 0), D, -D / 2).color(paint));

// Circus stripes on the front between gilt bands.
const ZS0 = 200;
const ZS1 = 960;
const NS = 7;
for (let k = 1; k < NS; k += 2) {
  const xa = (z: number, i: number) => -half(z) + (2 * half(z) * i) / NS;
  add(`stripe-${k}`, face([[xa(ZS0, k), ZS0], [xa(ZS0, k + 1), ZS0], [xa(ZS1, k + 1), ZS1], [xa(ZS1, k), ZS1]], 6, -D / 2 - 6).color(stripe));
}
add("band-low", face(band(170, ZS0, 10), D + 20, -D / 2 - 10).color(gilt));
add("band-high", face(band(ZS1, 1000, 10), D + 20, -D / 2 - 10).color(gilt));
for (const sx of [-1, 1]) add(`corner-bead-${sx < 0 ? "l" : "r"}`, rodXZ(-D / 2 - 4, [sx * (half(Z0) + 4), Z0], [sx * (half(Z1) + 4), Z1], 16).color(gilt));

// Gilt medallion with a star.
add("medallion", cylinder(14, 150, 24).rotateX(90).translate(0, -D / 2 - 6, 580).color(gilt));
add("medallion-field", cylinder(6, 122, 24).rotateX(90).translate(0, -D / 2 - 20, 580).color(paint));
const STAR = Array.from({ length: 10 }, (_, k) => {
  const a = Math.PI / 2 + (k * Math.PI) / 5;
  const r = k % 2 === 0 ? 105 : 42;
  return [r * Math.cos(a), r * Math.sin(a)] as [number, number];
});
add("medallion-star", extrudePolygon(STAR, 8).rotateX(90).translate(0, -D / 2 - 26, 580).color(gilt));

// Sloped script desk with a gilt lip and a row of marquee bulbs under it.
add("desk", profileYZ([[-D / 2 - 40, Z1], [D / 2 + 20, Z1], [D / 2 + 20, 1150], [-D / 2 - 40, 1060]], W1 + 60).color(stripe));
add("desk-lip", rodXZ(-D / 2 - 40, [-(W1 + 60) / 2, 1065], [(W1 + 60) / 2, 1065], 14).color(gilt));
for (let k = 0; k < 7; k++) {
  const x = -270 + k * 90;
  add(`bulb-socket-${k}`, cylinder(16, 18, 8).rotateX(90).translate(x, -D / 2 - 10, 1020).color(gilt));
  add(`bulb-${k}`, sphere(22).translate(x, -D / 2 - 40, 1020).color(stripe));
}
add("script-card", box(300, 220, 8, true).rotateX(10).translate(-120, 30, 1112).color(paint));

// Vintage chrome microphone on a gooseneck, turned toward the host.
const neck: [number, number][] = [[200, 1145], [200, 1260], [185, 1340], [150, 1400], [100, 1440]];
add("mic-flange", cylinder(16, 50, 16).translate(0, 200, 1135).color(chrome));
for (let k = 0; k < neck.length - 1; k++) {
  add(`gooseneck-${k}`, rodYZ(0, neck[k], neck[k + 1], 13).color(chrome));
  if (k > 0) add(`gooseneck-joint-${k}`, sphere(13).translate(0, neck[k][0], neck[k][1]).color(chrome));
}
add("mic-yoke", box(150, 24, 24, true).translate(0, 100, 1440).color(chrome));
for (const sx of [-1, 1]) add(`mic-yoke-arm-${sx < 0 ? "l" : "r"}`, box(16, 24, 90, true).translate(sx * 70, 100, 1480).color(chrome));
add("mic-capsule", sphere(60).scale([1.05, 0.75, 1.45]).translate(0, 100, 1500).color(chrome));
for (let k = 0; k < 5; k++) add(`mic-grille-${k}`, box(8, 92, 120, true).translate(-36 + k * 18, 100, 1500).color(paint));
add("mic-badge", box(70, 96, 22, true).translate(0, 100, 1470).color(gilt));

return p.model();
