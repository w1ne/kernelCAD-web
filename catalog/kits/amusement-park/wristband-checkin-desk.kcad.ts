// SPDX-License-Identifier: CC0-1.0
// Wristband check-in desk: the guest services counter where a ticket is
// scanned and swapped for a ride wristband.
// What makes it a check-in desk rather than a shop counter: a bow-fronted
// timber counter with a coloured band round its curved face, split into a
// standing-height section and a lowered accessible section; a wristband
// dispenser with the coil of bands showing; a handheld scanner sitting in a
// tilted cradle; spare wristband loops on the low counter; an acrylic
// screen on stainless standoffs along the staff side; and a check-in sign
// with a wristband emblem on a post at the end.
// Generic visualization geometry at about real size (about 2 m long,
// 0.85 m deep, 1.05 m standing counter, 0.78 m accessible counter),
// millimetres, Z up, guest side facing -Y, standing on z = 0.
meta({
  name: "wristband-checkin-desk",
  license: "CC0-1.0",
  title: "Wristband check-in desk",
  description: "Guest check-in counter at about real size: bow-fronted timber counter with a coloured band, standing-height and lowered accessible sections with stainless tops, a wristband dispenser showing its coil, a handheld scanner in a tilted cradle, spare wristband loops, an acrylic screen on stainless standoffs, and a check-in sign with a wristband emblem. Material controls: painted timber, stainless steel, acrylic, wristband colour. Festival, twilight and safety presets.",
  tags: ["check-in desk", "wristband", "guest services", "counter", "scanner", "accessible counter", "amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 3000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const paintedTimber = param("paintedTimber", "#e8e0cf", { label: "Painted timber counter" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless tops and fittings" });
const acrylic = param("acrylic", "#9fcbd3", { label: "Acrylic screen" });
const wristband = param("wristband", "#e2405e", { label: "Wristband and brand colour" });

presets({
  festival: { paintedTimber: "#f4e6c4", stainlessSteel: "#d1d1c6", acrylic: "#bfe3ea", wristband: "#7b3fbf" },
  twilight: { paintedTimber: "#5e7181", stainlessSteel: "#788b91", acrylic: "#41768b", wristband: "#f2b84b" },
  safety: { paintedTimber: "#d9d4c6", stainlessSteel: "#c3cbc8", acrylic: "#c8d7da", wristband: "#ff7a00" },
});

const p = assembly("wristband-checkin-desk");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const L = 1000;
const BACK = 380;
// Bow front: y of the guest face at x.
const yf = (x: number, grow = 0) => -300 - grow - 130 * (1 - (x / L) ** 2);
const bow = (x0: number, x1: number, grow = 0, back = BACK) => {
  const pts = [];
  for (let k = 0; k <= 8; k++) {
    const x = x0 + ((x1 - x0) * k) / 8;
    pts.push([x, yf(x, grow)]);
  }
  pts.push([x1, back], [x0, back]);
  return pts;
};
// Strip following the bow face, from the face out by `t`.
const bowBand = (x0: number, x1: number, t: number) => {
  const outer = [];
  const inner = [];
  for (let k = 0; k <= 8; k++) {
    const x = x0 + ((x1 - x0) * k) / 8;
    outer.push([x, yf(x, t)]);
    inner.unshift([x, yf(x, -2)]);
  }
  return [...outer, ...inner];
};
const plan = (pts, z0: number, h: number) => extrudePolygon(pts, h).translate(0, 0, z0);
// Profile drawn in (y, z) and pushed along X by t, centred on x0.
const longSide = (pts, t: number, x0 = 0) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0 - t / 2, 0, 0);

const SPLIT = -320;
const LOW = 740;
const HIGH = 1000;

// Counter bodies, stainless tops, kick plinth and the coloured bands.
add("plinth", plan(bow(-L + 20, L - 20, -30, BACK - 30), 0, 90).color(stainlessSteel));
add("accessible-body", plan(bow(-L, SPLIT), 90, LOW - 90).color(paintedTimber));
add("standing-body", plan(bow(SPLIT, L), 90, HIGH - 90).color(paintedTimber));
add("accessible-top", plan(bow(-L - 30, SPLIT, 40, BACK + 20), LOW, 40).color(stainlessSteel));
add("standing-top", plan(bow(SPLIT, L + 30, 40, BACK + 20), HIGH, 40).color(stainlessSteel));
add("band-low", plan(bowBand(-L, SPLIT, 12), 520, 110).color(wristband));
add("band-high", plan(bowBand(SPLIT, L, 12), 760, 110).color(wristband));
add("accessible-sign", box(150, 10, 150, true).translate(-660, yf(-660, 14), 380).color(wristband));
add("accessible-sign-mark", cylinder(8, 40, 12).rotateX(90).translate(-660, yf(-660, 22), 400).color(paintedTimber));

// Wristband dispenser showing the coil of bands.
const DX = 640;
const DY = -150;
const T = HIGH + 40;
add("dispenser-housing", longSide([[-150, 0], [150, 0], [150, 260], [-40, 260], [-150, 150]], 260, DX).translate(0, DY, T).color(stainlessSteel));
add("dispenser-coil", cylinder(200, 110, 20).rotateY(90).translate(DX - 100, DY - 20, T + 150).color(wristband));
add("dispenser-hub", cylinder(220, 30, 12).rotateY(90).translate(DX - 110, DY - 20, T + 150).color(stainlessSteel));
add("dispenser-tongue", box(60, 120, 6, true).translate(DX, DY - 190, T + 60).color(wristband));

// Handheld scanner in a tilted cradle.
const SX = 180;
add("scanner-cradle", box(140, 200, 90, true).rotateX(-18).translate(SX, -170, T + 45).color(stainlessSteel));
add("scanner", longSide([[-160, 140], [-160, 210], [60, 230], [80, 180], [10, 170], [30, 60], [-40, 60], [-60, 150]], 70, SX).translate(0, -40, T).color(acrylic));
add("scanner-window", box(76, 10, 60, true).translate(SX, -202, T + 175).color(wristband));

// Spare wristband loops on the accessible counter.
for (let k = 0; k < 3; k++) add(`wristband-loop-${k}`, torus(70, 9, 18).translate(-820 + k * 150, -230 + (k % 2) * 60, LOW + 50).color(k === 1 ? paintedTimber : wristband));

// Acrylic screen on stainless standoffs along the staff side.
add("screen", box(1180, 12, 520, true).translate(340, 230, T + 90 + 260).color(acrylic));
for (const x of [-180, 860]) add(`screen-standoff-${x > 0 ? "r" : "l"}`, cylinder(90, 18, 10).translate(x, 230, T).color(stainlessSteel));
add("screen-pass-slot", box(400, 14, 40, true).translate(340, 222, T + 110).color(stainlessSteel));

// Check-in sign with a wristband emblem on a post at the +X end.
add("sign-foot", cylinder(20, 160, 16).translate(L + 230, -80, 0).color(stainlessSteel));
add("sign-post", cylinder(1800, 26, 10).translate(L + 230, -80, 20).color(stainlessSteel));
add("sign-panel", box(520, 30, 320, true).translate(L + 230, -110, 1680).color(wristband));
add("sign-emblem", torus(90, 16, 20).rotateX(80).translate(L + 230 - 130, -130, 1680).color(paintedTimber));
for (let k = 0; k < 3; k++) add(`sign-text-${k}`, box(170 - k * 30, 12, 26, true).translate(L + 230 + 90, -130, 1740 - k * 55).color(paintedTimber));

return p.model();
