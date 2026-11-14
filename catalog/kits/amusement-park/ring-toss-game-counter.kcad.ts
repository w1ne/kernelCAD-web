// SPDX-License-Identifier: CC0-1.0
// Ring toss game counter: the midway booth where guests pitch hoops at a
// packed bed of glass bottles and win if a ring settles over a neck.
// What makes it a ring toss rather than a counter: a stepped three-tier bed
// crowded with green glass bottles, a couple of rings already ringing the
// necks, a striped throw counter with a stack of hoops on it, corner posts
// holding a striped canopy with a pennant valance, and a back shelf of
// plush prizes.
// Generic visualization geometry at about real size (2.2 m wide, 2.5 m to
// the canopy), millimetres, Z up, guest face on -Y, standing on z = 0.
meta({
  name: "ring-toss-game-counter",
  license: "CC0-1.0",
  title: "Ring toss game counter",
  description: "Midway ring toss booth at about real size: a stepped three-tier bed packed with glass bottles, rings already caught on two necks, a striped throw counter with a stack of hoops, corner posts carrying a striped canopy with a pennant valance, and a back shelf of plush prizes. Material controls: painted timber, bottle glass, enamel, canvas. Festival, twilight and vintage presets.",
  tags: ["ring toss", "bottle toss", "hoopla", "glass bottles", "carnival booth", "midway game", "carnival game", "amusement park", "theme park", "guest experience", "low poly", "CC0", "midway games"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 11000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const timber = param("timber", "#2b6cb0", { label: "Painted timber booth, counter and bottle bed" });
const glass = param("glass", "#3f9a5a", { label: "Bottle glass" });
const enamel = param("enamel", "#e03a33", { label: "Enamel stripes, rings and prizes" });
const canvas = param("canvas", "#fbf4e2", { label: "Canvas stripes and light rings" });

presets({
  festival: { timber: "#e38b1f", glass: "#2f8f8a", enamel: "#d7357f", canvas: "#fffdf4" },
  twilight: { timber: "#2b2f55", glass: "#4e8f6a", enamel: "#e2a33a", canvas: "#d9e4f5" },
  vintage: { timber: "#7a4f2f", glass: "#6d8a4a", enamel: "#b8452f", canvas: "#efe1c0" },
});

const p = assembly("ring-toss-game-counter");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const plan = (pts, z0: number, h: number) => extrudePolygon(pts, h).translate(0, 0, z0);
const rect = (x0: number, y0: number, x1: number, y1: number): [number, number][] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
// Outline drawn in (x, z) and extruded t thick toward +Y from y0.
const face = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);
// Outline drawn in (y, z) and extruded t thick along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const W = 2200;
const FRONT = -700;
const BACK = 600;
const TOP = 960;
const EAVE_F = 2300;
const EAVE_B = 2550;

// Throw counter: striped skirt panels under a timber top.
const STRIPES = 8;
for (let k = 0; k < STRIPES; k++) {
  const x0 = -W / 2 + (k * W) / STRIPES;
  add(`skirt-${k}`, face(rect(x0, 0, x0 + W / STRIPES, TOP - 40), 30, FRONT).color(k % 2 ? canvas : enamel));
}
add("counter-top", plan(rect(-W / 2 - 40, FRONT - 60, W / 2 + 40, FRONT + 300), TOP - 40, 50).color(timber));
add("floor", plan(rect(-W / 2 + 20, FRONT + 40, W / 2 - 20, BACK), 0, 60).color(timber));

// Stepped three-tier bottle bed packed with bottles.
const bottle = turned([[0, 0], [44, 0], [44, 170], [15, 235], [15, 300], [0, 300]]);
const TIERS = [{ y: -200, z: 760 }, { y: 70, z: 900 }, { y: 340, z: 1040 }];
TIERS.forEach(({ y, z }, t) => {
  add(`tier-${t}`, plan(rect(-900, y - 135, 900, BACK - 120), 60, z - 60).color(timber));
  add(`tier-lip-${t}`, face(rect(-900, z - 20, 900, z + 40), 20, y - 155).color(t % 2 ? enamel : canvas));
  for (let c = 0; c < 7; c++) {
    for (let r = 0; r < 2; r++) {
      const x = -780 + c * 250 + (r ? 125 : 0);
      if (r && c === 6) continue;
      add(`bottle-${t}-${c}-${r}`, bottle.translate(x, y - 60 + r * 105, z).color(glass));
    }
  }
});

// Rings already caught on two necks.
add("caught-ring-0", torus(70, 9, 16).translate(-530, -260, 760 + 230).color(enamel));
add("caught-ring-1", torus(70, 9, 16).rotateX(12).translate(220, 10, 900 + 250).color(canvas));

// A stack of hoops on the counter, plus one loose ring.
for (let k = 0; k < 5; k++) add(`ring-stack-${k}`, torus(70, 9, 16).translate(700, FRONT + 100, TOP + 19 + k * 18).color(k % 2 ? canvas : enamel));
add("loose-ring", torus(70, 9, 16).translate(420, FRONT + 70, TOP + 19).color(enamel));

// Back wall with a shelf of plush prizes.
add("back-wall", face(rect(-W / 2, 60, W / 2, EAVE_B), 50, BACK).color(timber));
add("prize-shelf", plan(rect(-W / 2 + 80, BACK - 220, W / 2 - 80, BACK), 1550, 40).color(canvas));
for (let k = 0; k < 6; k++) {
  const x = -850 + k * 340;
  const col = k % 2 ? enamel : canvas;
  add(`prize-body-${k}`, sphere(120).scale([1, 0.85, 1.1]).translate(x, BACK - 120, 1590 + 120).color(col));
  add(`prize-head-${k}`, sphere(85).translate(x, BACK - 140, 1590 + 300).color(col));
  for (const ex of [-1, 1]) add(`prize-ear-${k}-${ex}`, sphere(32).translate(x + ex * 60, BACK - 140, 1590 + 380).color(col));
}

// Side walls with a shaped front edge.
for (const sx of [-1, 1]) {
  const wall = profileYZ([[BACK, 60], [FRONT + 300, 60], [FRONT + 300, TOP + 10], [FRONT + 150, 1300], [FRONT + 150, EAVE_F], [BACK, EAVE_B]], 50);
  add(`side-wall-${sx > 0 ? "r" : "l"}`, wall.translate(sx * (W / 2 - 25), 0, 0).color(timber));
}
for (const sx of [-1, 1]) add(`corner-post-${sx > 0 ? "r" : "l"}`, cylinder(EAVE_F - TOP + 10, 30, 12).translate(sx * (W / 2 - 25), FRONT + 120, TOP + 10).color(canvas));

// Sloped striped canopy with a pennant valance.
const SLOPE = Math.atan2(EAVE_B - EAVE_F, BACK - FRONT) * (180 / Math.PI);
const RUN = Math.hypot(EAVE_B - EAVE_F, BACK - FRONT + 140);
const CSTRIPES = 9;
for (let k = 0; k < CSTRIPES; k++) {
  const x0 = -W / 2 - 80 + (k * (W + 160)) / CSTRIPES;
  add(`canopy-${k}`, plan(rect(x0, 0, x0 + (W + 160) / CSTRIPES, RUN), 0, 30).rotateX(SLOPE).translate(0, FRONT - 140, EAVE_F).color(k % 2 ? canvas : enamel));
}
for (let k = 0; k < CSTRIPES; k++) {
  const xc = -W / 2 - 80 + ((k + 0.5) * (W + 160)) / CSTRIPES;
  add(`pennant-${k}`, face([[xc - 120, 0], [xc + 120, 0], [xc, -170]], 12, FRONT - 150).translate(0, 0, EAVE_F).color(k % 2 ? enamel : canvas));
}

return p.model();
