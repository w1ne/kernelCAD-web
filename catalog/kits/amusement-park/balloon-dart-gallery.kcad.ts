// SPDX-License-Identifier: CC0-1.0
// Balloon dart gallery: the midway booth where you throw darts to pop
// balloons pinned to a cork wall.
// What makes it a balloon dart game rather than a counter: a cork back wall
// covered in a grid of inflated balloons, with darts already stuck in the
// cork between them; a striped throw counter holding a cup of darts; plush
// prizes hanging along the side walls; and a sloped striped canopy with a
// pennant valance.
// Generic visualization geometry at about real size (2.3 m wide, 2.5 m to
// the canopy), millimetres, Z up, guest face on -Y, standing on z = 0.
meta({
  name: "balloon-dart-gallery",
  license: "CC0-1.0",
  title: "Balloon dart gallery",
  description: "Midway balloon dart booth at about real size: a cork back wall covered in a five-by-four grid of balloons with darts stuck in the cork, a striped throw counter with a cup of darts, plush prizes hanging on the side walls, and a sloped striped canopy with a pennant valance. Material controls: painted timber, cork, balloon latex, canvas. Festival, twilight and pastel presets.",
  tags: ["balloon dart", "dart game", "balloon pop", "carnival booth", "midway game", "prize booth", "amusement park", "theme park", "guest experience", "low poly", "CC0", "midway games"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 9000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const timber = param("timber", "#7a3f8f", { label: "Painted timber booth and counter" });
const cork = param("cork", "#b98a5a", { label: "Cork back wall" });
const latex = param("latex", "#e23b3b", { label: "Balloon latex, canopy stripe and prizes" });
const canvas = param("canvas", "#fbf4e2", { label: "Canvas stripe, light balloons and dart flights" });

presets({
  festival: { timber: "#1f7fc4", cork: "#c49a64", latex: "#f2b51c", canvas: "#fffdf4" },
  twilight: { timber: "#2b2f55", cork: "#8a6a4c", latex: "#d1468c", canvas: "#d9e4f5" },
  pastel: { timber: "#8fc9c2", cork: "#d6b88f", latex: "#f29bb5", canvas: "#fff7e0" },
});

const p = assembly("balloon-dart-gallery");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const rr = (l: number, w: number, r: number) =>
  filletPolygon([[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]], r, { segments: 6 });
const plan = (pts, z0: number, h: number) => extrudePolygon(pts, h).translate(0, 0, z0);
// Outline drawn in (x, z) and extruded t thick toward +Y from y0.
const face = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);
// Outline drawn in (y, z) and extruded t thick along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const W = 2300;
const BACK = 420;
const FRONT = -700;
const EAVE_B = 2500;
const EAVE_F = 2250;

// Floor plinth, cork back wall and its timber frame.
add("floor", plan(rr(W, BACK - FRONT + 60, 20), 0, 80).translate(0, (BACK + FRONT) / 2 + 30, 0).color(timber));
add("back-frame", face([[-W / 2, 80], [W / 2, 80], [W / 2, EAVE_B], [-W / 2, EAVE_B]], 60, BACK + 40).color(timber));
add("cork-wall", face([[-W / 2 + 80, 700], [W / 2 - 80, 700], [W / 2 - 80, 2200], [-W / 2 + 80, 2200]], 40, BACK).color(cork));

// Five-by-four grid of balloons on the cork, with darts stuck between them.
for (let c = 0; c < 5; c++)
  for (let r = 0; r < 4; r++) {
    const x = -800 + c * 400 + (r % 2 ? 80 : -40);
    const z = 860 + r * 350;
    add(`balloon-${c}-${r}`, sphere(120).scale([1, 0.85, 1.2]).translate(x, BACK - 95, z).color((c + r) % 3 === 1 ? canvas : latex));
    add(`balloon-knot-${c}-${r}`, turned([[0, 0], [24, 0], [6, 40], [0, 40]]).rotateX(180).translate(x, BACK - 60, z - 140).color(latex));
  }
[[-600, 1030], [210, 1380], [-180, 1720], [590, 1070]].forEach(([x, z], i) => {
  add(`stuck-dart-${i}`, cylinder(170, 10, 8).rotateX(90).rotateZ(i * 7 - 10).translate(x, BACK, z).color(timber));
  add(`stuck-dart-flight-${i}`, box(70, 90, 4, true).rotateZ(i * 7 - 10).translate(x + 12, BACK - 170, z).color(canvas));
  add(`stuck-dart-flight-v-${i}`, box(4, 90, 70, true).rotateZ(i * 7 - 10).translate(x + 12, BACK - 170, z).color(canvas));
});

// Side walls with a shaped front edge, carrying hanging plush prizes.
for (const sx of [-1, 1]) {
  const s = sx > 0 ? "r" : "l";
  const wall = profileYZ([[BACK + 100, 80], [FRONT, 80], [FRONT, 1060], [FRONT + 220, 1260], [FRONT + 220, EAVE_F + 40], [BACK + 100, EAVE_B]], 70);
  add(`side-wall-${s}`, wall.translate(sx * (W / 2 - 35), 0, 0).color(timber));
  add(`prize-rail-${s}`, cylinder(900, 18, 10).rotateX(90).translate(sx * (W / 2 - 110), BACK - 40, 2150).color(canvas));
  for (let k = 0; k < 3; k++) {
    const y = BACK - 180 - k * 280;
    const z = 1780 - (k % 2) * 90;
    add(`prize-string-${s}-${k}`, cylinder(2150 - z - 180, 6, 6).translate(sx * (W / 2 - 110), y, z + 180).color(canvas));
    add(`prize-body-${s}-${k}`, sphere(110).scale([1, 0.85, 1.15]).translate(sx * (W / 2 - 150), y, z).color(k % 2 ? canvas : latex));
    add(`prize-head-${s}-${k}`, sphere(80).translate(sx * (W / 2 - 150), y, z + 150).color(k % 2 ? latex : canvas));
    for (const e of [-1, 1]) add(`prize-ear-${s}-${k}-${e}`, sphere(32).translate(sx * (W / 2 - 150), y + e * 55, z + 225).color(k % 2 ? latex : canvas));
  }
}

// Throw counter with a striped front and a cup of darts.
const CT = 1000;
add("counter-top", plan(rr(W - 60, 340, 24), CT, 50).translate(0, FRONT + 140, 0).color(timber));
const NS = 7;
const sw = (W - 200) / NS;
for (let k = 0; k < NS; k++) {
  const x0 = -(W - 200) / 2 + k * sw;
  add(`counter-stripe-${k}`, face([[x0, 80], [x0 + sw, 80], [x0 + sw, CT], [x0, CT]], 30, FRONT).color(k % 2 ? canvas : latex));
}
add("dart-cup", turned([[0, 0], [70, 0], [80, 170], [68, 170], [60, 15], [0, 15]]).translate(640, FRONT + 140, CT + 50).color(canvas));
for (const [i, a] of [-12, 0, 12].entries()) {
  add(`cup-dart-${i}`, cylinder(240, 9, 8).rotateY(a).translate(640 + i * 18 - 18, FRONT + 140, CT + 70).color(timber));
  add(`cup-flight-${i}`, box(60, 4, 70, true).rotateY(a).translate(640 + i * 18 - 18 + Math.sin((a * Math.PI) / 180) * 260, FRONT + 140, CT + 70 + 260).color(latex));
}

// Sloped striped canopy with a pennant valance on the guest side.
const DEPTH = BACK + 140 - (FRONT - 120);
const tilt = (Math.atan2(EAVE_B - EAVE_F, DEPTH) * 180) / Math.PI;
const NC = 8;
const cw = (W + 160) / NC;
for (let k = 0; k < NC; k++) {
  const x = -(W + 160) / 2 + cw * (k + 0.5);
  add(`canopy-stripe-${k}`, box(cw, DEPTH / Math.cos((tilt * Math.PI) / 180), 30, true).rotateX(tilt).translate(x, (BACK + 140 + FRONT - 120) / 2, (EAVE_B + EAVE_F) / 2 + 40).color(k % 2 ? canvas : latex));
}
for (let k = 0; k < NC; k++) {
  const x = -(W + 160) / 2 + cw * k;
  add(`pennant-${k}`, face([[x, 0], [x + cw, 0], [x + cw / 2, -200]], 12, FRONT - 135).translate(0, 0, EAVE_F + 30).color(k % 2 ? latex : canvas));
}

return p.model();
