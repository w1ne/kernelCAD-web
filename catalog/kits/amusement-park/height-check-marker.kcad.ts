// SPDX-License-Identifier: CC0-1.0
// Rider height check marker: the "you must be this tall" gate at the head of
// a ride queue, where a host checks each child against the minimum height.
// What makes it a height check rather than a door frame: two printed ruler
// boards with round tops standing on weighted round bases; alternating
// graduation bands every 100 mm with a heavier band every 500 mm; a
// cantilevered height arm with a star pointer clamped at the ride's minimum
// height; and an arched header sign carrying a big star medallion so a child
// can see the target from the queue.
// Generic visualization geometry at about real size (about 1.2 m wide,
// 2.4 m tall), millimetres, Z up, measuring face toward -Y, standing on z = 0.
meta({
  name: "height-check-marker",
  license: "CC0-1.0",
  title: "Rider height check marker",
  description: "Ride-queue minimum height gate at about real size: two round-topped printed ruler boards on weighted round bases with graduation bands every 100 mm, a cantilevered height arm with a star pointer set by a minHeight control, and an arched header sign with a star medallion. Material controls: powder-coated frame, ruler board, accent bands and star, steel bases. Festival, twilight and jungle presets.",
  tags: ["height check", "height marker", "ride height", "queue", "sign", "amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const minHeight = param("minHeight", 1220, { label: "Minimum rider height (mm)", min: 900, max: 1400, step: 20 });
const powderCoat = param("powderCoat", "#2f5f8f", { label: "Powder-coated frame and header" });
const board = param("board", "#f4efe2", { label: "Printed ruler board" });
const accent = param("accent", "#e8a628", { label: "Graduation bands, arm and star" });
const steel = param("steel", "#5c666b", { label: "Weighted steel bases" });

presets({
  festival: { powderCoat: "#d0473a", board: "#fff8e0", accent: "#2f7fb8", steel: "#9da3a0" },
  twilight: { powderCoat: "#35576f", board: "#d9d4e8", accent: "#c79bf2", steel: "#4f626c" },
  jungle: { powderCoat: "#3f6b3a", board: "#efe3c2", accent: "#e57a2e", steel: "#5a4632" },
});

const p = assembly("height-check-marker");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Profile drawn in (x, z), given thickness t along Y starting at y0.
const front = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);
// Five-point star in (x, z) around (cx, cz).
const star = (cx: number, cz: number, r: number) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (Math.PI * i) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push([cx + rr * Math.cos(a), cz + rr * Math.sin(a)]);
  }
  return pts;
};
// Round-topped board outline of width w from z0 up to z1.
const roundTop = (cx: number, w: number, z0: number, z1: number) => {
  const pts: [number, number][] = [[cx - w / 2, z0], [cx + w / 2, z0]];
  for (let i = 0; i <= 8; i++) {
    const a = (Math.PI * i) / 8;
    pts.push([cx + (w / 2) * Math.cos(a), z1 - w / 2 + (w / 2) * Math.sin(a)]);
  }
  return pts;
};

const X = 520;
const TOP = 2050;
const W = 200;

for (const sx of [-1, 1]) {
  const side = sx > 0 ? "r" : "l";
  const cx = sx * X;
  add(`base-${side}`, cylinder(70, 230, 16).translate(cx, 0, 0).color(steel));
  add(`base-cap-${side}`, cylinder(30, 150, 16).translate(cx, 0, 70).color(powderCoat));
  add(`frame-${side}`, front(roundTop(cx, W + 50, 100, TOP + 25), 70, -35).color(powderCoat));
  add(`board-${side}`, front(roundTop(cx, W, 140, TOP), 10, -45).color(board));
  // Graduation bands every 100 mm, heavier every 500 mm.
  for (let z = 200; z <= 1900; z += 100) {
    const major = z % 500 === 0;
    add(`band-${side}-${z}`, box(major ? W : W * 0.55, 6, major ? 34 : 16, true).translate(cx + (major ? 0 : -sx * W * 0.22), -48, z).color(accent));
  }
}

// Arched header between the boards with a star medallion.
const arch: [number, number][] = [];
const archIn: [number, number][] = [];
for (let i = 0; i <= 12; i++) {
  const t = i / 12;
  const x = -X + 2 * X * t;
  const lift = 180 * Math.sin(Math.PI * t);
  arch.push([x, TOP - 60 + lift + 140]);
  archIn.push([x, TOP - 60 + lift]);
}
add("header", front([...archIn, ...arch.slice().reverse()], 60, -30).color(powderCoat));
add("header-face", front([...archIn.map(([x, z]) => [x, z + 25]), ...arch.slice().reverse().map(([x, z]) => [x, z - 25])].slice(1, -1), 8, -38).color(board));
add("star-disc", cylinder(20, 190, 20).rotateX(-90).translate(0, -40, TOP + 300).color(powderCoat));
add("star", front(star(0, TOP + 300, 160), 14, -54).color(accent));

// Cantilevered height arm clamped at the minimum height on the left board
// (built about z = 0, then lifted by the minHeight control).
const atHeight = (s: Shape) => s.translate(0, 0, minHeight);
add("arm-clamp", atHeight(box(W + 90, 110, 120, true).translate(-X, 0, 0)).color(steel));
add("height-arm", atHeight(box(560, 80, 50, true).translate(-X + 350, -10, 0)).color(accent));
add("arm-star", atHeight(front(star(-X + 690, 0, 110), 30, -40)).color(accent));
add("arm-edge", atHeight(box(560, 90, 8, true).translate(-X + 350, -10, -29)).color(powderCoat));

return p.model();
