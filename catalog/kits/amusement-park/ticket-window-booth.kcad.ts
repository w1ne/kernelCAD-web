// SPDX-License-Identifier: CC0-1.0
// Ticket window booth: the small staffed booth at the park gate where guests
// buy admission through a window.
// What makes it a ticket booth rather than a shed: the big arched sales
// window on the front with a talk-through grille and a pass slot at its
// base, the stainless transaction ledge on brackets in front of it, the sign
// board above the window, and the carnival hip roof with a striped scalloped
// valance and finial. The body is lap-boarded painted timber with trim
// pilasters and a base skirt, and the cashier enters through a side door
// with its own step.
// Generic visualization geometry at about real size (about 1.8 m wide,
// 1.5 m deep, 3.3 m to the finial), millimetres, Z up, sales window toward
// -Y, standing on z = 0.
meta({
  name: "ticket-window-booth",
  license: "CC0-1.0",
  title: "Ticket window booth",
  description: "Staffed park-gate ticket booth at about real size: lap-boarded painted timber body with trim corner pilasters and base skirt, big arched sales window with talk-through grille and pass slot, stainless transaction ledge on brackets, sign board with star, carnival hip roof with striped scalloped valance and finial, side cashier door with window and step. Material controls: painted timber, trim, roof and valance stripe, stainless steel, glass. Festival, twilight and seaside presets.",
  tags: ["ticket booth", "ticket window", "box office", "kiosk", "admission", "amusement park", "theme park", "midway", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 2200,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const paintedTimber = param("paintedTimber", "#c9473f", { label: "Painted timber boarding" });
const trim = param("trim", "#f4ecd8", { label: "Painted trim, pilasters and sign" });
const roof = param("roof", "#2f6f8f", { label: "Roof and valance stripe" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless ledge and fittings" });
const glass = param("glass", "#75b9bf", { label: "Window glass" });

presets({
  festival: { paintedTimber: "#be8a4e", stainlessSteel: "#d1d1c6", glass: "#efce70", roof: "#d0453a" },
  twilight: { paintedTimber: "#5e7181", stainlessSteel: "#788b91", glass: "#6387aa", trim: "#c9c3b4", roof: "#2c2f45" },
  seaside: { paintedTimber: "#3d8fb8", trim: "#ffffff", roof: "#e8b33a", glass: "#a9dbe0" },
});

const p = assembly("ticket-window-booth");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Profile drawn in (x, z), given thickness t along Y starting at y0.
const front = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);
const arch = (w: number, z0: number, zs: number, n = 8) => {
  const pts = [[-w / 2, z0], [w / 2, z0]];
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI * i) / n;
    pts.push([(w / 2) * Math.cos(a), zs + (w / 2) * Math.sin(a)]);
  }
  return pts;
};
const square = (r: number) => path().moveTo(-r, -r).lineTo(r, -r).lineTo(r, r).lineTo(-r, r).close();

const W = 1600;
const D = 1300;
const FY = -D / 2;
const Z0 = 150;
const ZT = 2250;

// Body, base skirt, corner pilasters and lap boarding.
add("body", box(W, D, ZT - Z0, true).translate(0, 0, (ZT + Z0) / 2).color(paintedTimber));
add("base-skirt", box(W + 80, D + 80, Z0 + 60, true).translate(0, 0, (Z0 + 60) / 2).color(trim));
add("eaves-band", box(W + 60, D + 60, 90, true).translate(0, 0, ZT - 45).color(trim));
for (const sx of [-1, 1]) {
  for (const sy of [-1, 1]) {
    add(`pilaster-${sx > 0 ? "r" : "l"}-${sy > 0 ? "b" : "f"}`, box(110, 110, ZT - Z0, true).translate(sx * W / 2, sy * D / 2, (ZT + Z0) / 2).color(trim));
  }
}
for (let i = 0; i < 9; i++) {
  const z = Z0 + 110 + i * 210;
  add(`lap-board-side-${i}`, box(14, D - 120, 40, true).translate(-W / 2 - 7, 0, z).color(paintedTimber));
  add(`lap-board-back-${i}`, box(W - 120, 14, 40, true).translate(0, D / 2 + 7, z).color(paintedTimber));
  if (z < 980) add(`lap-board-front-${i}`, box(W - 120, 14, 40, true).translate(0, FY - 7, z).color(paintedTimber));
}

// Arched sales window: trim surround, glass, muntin, talk grille and pass slot.
add("window-surround", front(arch(1120, 1000, 1500), 40, FY - 40).color(trim));
add("window-glass", front(arch(1000, 1060, 1500), 20, FY - 50).color(glass));
add("window-muntin", box(30, 16, 460, true).translate(0, FY - 56, 1290).color(trim));
add("talk-grille", cylinder(10, 70, 16).rotateX(90).translate(-240, FY - 52, 1380).color(stainlessSteel));
add("pass-slot", front([[-220, 1060], [220, 1060], [190, 1130], [-190, 1130]], 12, FY - 62).color(stainlessSteel));

// Transaction ledge on two brackets, with a stainless kick plate below.
add("ledge", box(1340, 340, 45, true).translate(0, FY - 170, 1022).color(stainlessSteel));
add("ledge-nosing", cylinder(1340, 26, 10).rotateY(90).translate(-670, FY - 340, 1022).color(stainlessSteel));
for (const sx of [-1, 1]) {
  add(`ledge-bracket-${sx > 0 ? "r" : "l"}`,
    extrudePolygon([[0, 0], [300, 0], [0, -280]], 30).rotateX(90).rotateZ(-90).translate(sx * 520 + 15, FY, 1000).color(trim));
}
add("kick-plate", box(W - 140, 10, 300, true).translate(0, FY - 5, Z0 + 200).color(stainlessSteel));

// Sign board standing on the front roof slope, with a star and lamps.
add("sign-board", front(filletPolygon([[-560, 2420], [560, 2420], [560, 2740], [-560, 2740]], 50, { segments: 4 }), 40, FY - 150).color(trim));
add("sign-border", front(filletPolygon([[-600, 2390], [600, 2390], [600, 2770], [-600, 2770]], 60, { segments: 4 }), 20, FY - 110).color(paintedTimber));
add("sign-star", front(Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 ? 55 : 130;
  const a = (Math.PI * i) / 5 + Math.PI / 2;
  return [r * Math.cos(a), 2580 + r * Math.sin(a)];
}), 14, FY - 164).color(roof));
for (const sx of [-1, 1]) {
  add(`sign-bulb-${sx > 0 ? "r" : "l"}`, sphere(34).translate(sx * 400, FY - 180, 2580).color(glass));
}

// Carnival hip roof with striped scalloped valance and a finial.
const roofShell = square(1).loft([square(0.05)], { spacing: 820, ruled: true });
add("roof", roofShell.scale([(W + 360) / 2, (D + 360) / 2, 1]).translate(0, 0, ZT + 110).color(roof));
add("roof-fascia", box(W + 380, D + 380, 110, true).translate(0, 0, ZT + 55).color(trim));
add("finial-post", cylinder(180, 30, 10).translate(0, 0, ZT + 900).color(trim));
add("finial-ball", sphere(70).translate(0, 0, ZT + 1110).color(roof));
const scallop = (w: number, depth: number) => {
  const pts = [];
  for (let i = 0; i <= 6; i++) {
    const a = (Math.PI * i) / 6;
    pts.push([(w / 2) * Math.cos(a), -depth * Math.sin(a)]);
  }
  return pts;
};
const NV = 8;
const vw = (W + 380) / NV;
const vd = (D + 380) / 6;
for (let i = 0; i < NV; i++) {
  const x = -(W + 380) / 2 + vw * (i + 0.5);
  const c = [roof, trim][i % 2];
  add(`valance-front-${i}`, front(scallop(vw, 150), 12, FY - 202).translate(x, 0, ZT).color(c));
  add(`valance-back-${i}`, front(scallop(vw, 150), 12, D / 2 + 190).translate(x, 0, ZT).color(c));
}
for (let i = 0; i < 6; i++) {
  const y = -(D + 380) / 2 + vd * (i + 0.5);
  const c = [roof, trim][i % 2];
  for (const sx of [-1, 1]) {
    add(`valance-side-${sx > 0 ? "r" : "l"}-${i}`, front(scallop(vd, 150), 12, -6).rotateZ(90).translate(sx * ((W + 380) / 2 + 6), y, ZT).color(c));
  }
}

// Cashier door on the -X side with a small window, knob and step.
const DX = -W / 2;
add("door", box(30, 700, 1860, true).translate(DX - 15, 180, Z0 + 930).color(paintedTimber));
add("door-frame", box(16, 790, 1920, true).translate(DX - 8, 180, Z0 + 960).color(trim));
add("door-window", box(12, 380, 420, true).translate(DX - 34, 180, Z0 + 1450).color(glass));
add("door-panel", box(12, 480, 640, true).translate(DX - 34, 180, Z0 + 560).color(trim));
add("door-knob", sphere(32).translate(DX - 60, -90, Z0 + 1000).color(stainlessSteel));
add("door-step", box(380, 900, Z0, true).translate(DX - 190, 180, Z0 / 2).color(stainlessSteel));

return p.model();
