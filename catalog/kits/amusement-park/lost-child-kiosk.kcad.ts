// SPDX-License-Identifier: CC0-1.0
// Lost child reunification kiosk: the calm, easy-to-spot station where staff
// look after a child who has lost their family until a parent arrives.
// What makes it a reunification kiosk rather than a ticket booth: a tall
// beacon mast with a round "meeting point" disc and star that can be seen
// over the crowd; a striped curved awning on a light steel frame; a service
// counter with a lowered child-height section so staff can talk to a small
// child eye to eye; a privacy screen at the back with a cushioned waiting
// bench and a box of toys behind the counter; and a step-free deck.
// Generic visualization geometry at about real size (about 1.8 m wide,
// 1.4 m deep, 3.5 m to the beacon), millimetres, Z up, counter facing -Y,
// standing on z = 0.
meta({
  name: "lost-child-kiosk",
  license: "CC0-1.0",
  title: "Lost child reunification kiosk",
  description: "Lost-child meeting point at about real size: tall beacon mast with a round meeting-point disc and star, striped curved awning on a powder-coated frame, service counter with a lowered child-height section, privacy screen with a cushioned waiting bench and toy box behind the counter, and a step-free timber deck with a ramped edge. Material controls: powder-coated frame, painted timber cladding, awning and cushion fabric, beacon signage. Festival, twilight and calm presets.",
  tags: ["lost child", "lost and found", "meeting point", "reunification", "guest services", "kiosk", "amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 2600,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#477985", { label: "Powder-coated frame and mast" });
const paintedTimber = param("paintedTimber", "#e9dcc0", { label: "Painted timber cladding and deck" });
const fabric = param("fabric", "#c77786", { label: "Awning stripes and bench cushion" });
const signage = param("signage", "#f2c230", { label: "Beacon disc and star" });

presets({
  festival: { powderCoat: "#d47452", paintedTimber: "#f4e7c9", fabric: "#3f8fc9", signage: "#ffd23f" },
  twilight: { powderCoat: "#35576f", paintedTimber: "#5e7181", fabric: "#557b8a", signage: "#e6c35a" },
  calm: { powderCoat: "#5f8a6a", paintedTimber: "#efe8d8", fabric: "#9cc3a8", signage: "#f5f0e0" },
});

const p = assembly("lost-child-kiosk");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Profile drawn in (y, z) and pushed along X by t, centred on x = 0.
const longSide = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(-t / 2, 0, 0);
// Profile drawn in (x, z), given thickness t along Y starting at y0.
const front = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);

const W = 1800;
const DECK = 120;
const FY = -420; // counter front face
const BY = 560; // privacy screen plane

// Step-free deck with a ramped front edge.
add("deck", longSide([[-700, 0], [-580, DECK], [700, DECK], [700, 0]], W).color(paintedTimber));
add("deck-edge-strip", box(W, 40, 8, true).translate(0, -600, DECK - 30).color(signage));

// Service counter: full-height section on the left, lowered child-height
// section on the right, both with a timber cladding and a steel top.
add("counter-high", box(1000, 360, 1000, true).translate(-400, FY + 180, DECK + 500).color(paintedTimber));
add("counter-high-top", box(1060, 420, 40, true).translate(-400, FY + 180, DECK + 1020).color(powderCoat));
add("counter-low", box(800, 360, 640, true).translate(500, FY + 180, DECK + 320).color(paintedTimber));
add("counter-low-top", box(840, 420, 40, true).translate(500, FY + 180, DECK + 660).color(powderCoat));
for (let k = 0; k < 4; k++) {
  add(`cladding-batten-${k}`, box(30, 20, 900, true).translate(-820 + k * 140, FY - 10, DECK + 500).color(powderCoat));
}
// Painted handprint-style dots on the child-height counter front.
for (let k = 0; k < 3; k++) {
  add(`counter-dot-${k}`, cylinder(12, 70, 14).rotateX(90).translate(330 + k * 170, FY + 2, DECK + 330 + (k % 2) * 90).color(k === 1 ? signage : fabric));
}

// Side panels and the privacy screen behind the waiting area.
for (const sx of [-1, 1]) {
  add(`side-panel-${sx > 0 ? "r" : "l"}`, box(60, BY - FY, 1300, true).translate(sx * (W / 2 - 30), (BY + FY) / 2, DECK + 650).color(paintedTimber));
}
add("privacy-screen", box(W, 60, 1900, true).translate(0, BY + 30, DECK + 950).color(paintedTimber));
add("screen-rail", box(W, 70, 50, true).translate(0, BY + 30, DECK + 1900).color(powderCoat));

// Frame posts carrying the curved awning.
for (const sx of [-1, 1]) {
  for (const [label, y] of [["f", FY - 40], ["b", BY + 30]] as const) {
    add(`post-${sx > 0 ? "r" : "l"}-${label}`, cylinder(2300 - DECK, 30, 12).translate(sx * (W / 2 - 30), y, DECK).color(powderCoat));
  }
}
// Curved awning (arched profile along X), split into alternating stripes.
const arch: [number, number][] = [];
const archIn: [number, number][] = [];
for (let i = 0; i <= 8; i++) {
  const t = i / 8;
  const y = FY - 260 + t * (BY + 330 - FY);
  const z = 2350 + 260 * Math.sin(Math.PI * t);
  arch.push([y, z + 50]);
  archIn.push([y, z]);
}
const awning = [...arch, ...archIn.slice().reverse()];
const STRIPES = 6;
for (let s = 0; s < STRIPES; s++) {
  const sw = (W + 160) / STRIPES;
  add(`awning-stripe-${s}`, longSide(awning, sw - 2).translate(-(W + 160) / 2 + (s + 0.5) * sw, 0, 0).color(s % 2 ? paintedTimber : fabric));
}
// Scalloped valance along the front edge.
for (let s = 0; s < 8; s++) {
  const x = -(W + 160) / 2 + (s + 0.5) * ((W + 160) / 8);
  add(`valance-${s}`, front([[x - 120, 2400], [x + 120, 2400], [x, 2260]], 20, FY - 280).color(s % 2 ? paintedTimber : fabric));
}

// Waiting bench with a cushion and a toy box behind the counter.
add("bench-frame", box(1100, 380, 380, true).translate(-200, BY - 220, DECK + 190).color(paintedTimber));
add("bench-cushion", box(1060, 360, 90, true).translate(-200, BY - 220, DECK + 425).color(fabric));
add("back-cushion", box(1060, 90, 400, true).translate(-200, BY - 30, DECK + 680).color(fabric));
add("toy-box", box(340, 300, 320, true).translate(620, BY - 200, DECK + 160).color(signage));
add("toy-ball", sphere(110).translate(560, BY - 220, DECK + 420).color(fabric));
add("toy-block", box(130, 130, 130, true).rotateZ(25).translate(700, BY - 170, DECK + 385).color(powderCoat));

// Beacon mast with a round meeting-point disc and star, seen over crowds.
const MX = -W / 2 - 120;
const MY = BY - 80;
add("mast", cylinder(3350, 45, 14).translate(MX, MY, 0).color(powderCoat));
add("mast-base", cylinder(40, 160, 14).translate(MX, MY, 0).color(powderCoat));
add("beacon-disc", cylinder(40, 360, 28).rotateX(90).translate(MX, MY + 20, 3000).color(signage));
add("beacon-ring", torus(360, 24, 28).rotateX(90).translate(MX, MY, 3000).color(powderCoat));
const star: [number, number][] = [];
for (let i = 0; i < 10; i++) {
  const a = Math.PI / 2 + (Math.PI * i) / 5;
  const r = i % 2 ? 100 : 240;
  star.push([MX + r * Math.cos(a), 3000 + r * Math.sin(a)]);
}
add("beacon-star", front(star, 20, MY - 40).color(fabric));
add("beacon-lamp", sphere(90).translate(MX, MY, 3420).color(signage));

return p.model();
