// SPDX-License-Identifier: CC0-1.0
// Refillable cup rack: the spinning carousel tower beside a drinks stand that
// holds the park's souvenir refill cups for sale.
// What makes it a cup carousel rather than a shelf: a weighted round base on a
// turntable bearing, a central stainless mast, four round tiers that shrink
// toward the top, each ringed with tapered souvenir cups hung upside-down on
// pegs with their lids stacked beside them, a drip lip on every tier, and a
// round "refill" topper sign.
// Generic visualization geometry at about real size (about 0.9 m across,
// 1.6 m tall), millimetres, Z up, standing on z = 0.
meta({
  name: "refillable-cup-rack",
  license: "CC0-1.0",
  title: "Refillable cup rack",
  description: "Souvenir refill-cup carousel at about real size: weighted round base on a turntable bearing, stainless mast, four shrinking round tiers each ringed with tapered souvenir cups hung upside-down on pegs, drip lips, and a round refill topper sign. Material controls: stainless steel, cup polymer, tier enamel, lids and sign face. Classic, festival and twilight presets.",
  tags: ["cup rack", "souvenir cup", "refill", "carousel display", "merchandise", "drinks", "amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 9000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param("stainlessSteel", "#c3c9c7", { label: "Stainless mast and pegs" });
const polymer = param("polymer", "#2a8fc4", { label: "Souvenir cup polymer" });
const enamel = param("enamel", "#d4473a", { label: "Tier and base enamel" });
const lid = param("lid", "#f6f1e3", { label: "Lids and sign face" });

presets({
  classic: { stainlessSteel: "#c3c9c7", polymer: "#2a8fc4", enamel: "#d4473a", lid: "#f6f1e3" },
  festival: { stainlessSteel: "#d6d6cc", polymer: "#7a3fa0", enamel: "#efb03f", lid: "#fff8e6" },
  twilight: { stainlessSteel: "#87979c", polymer: "#2e9c8a", enamel: "#2d4b7a", lid: "#e6dcc4" },
});

const p = assembly("refillable-cup-rack");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const turned = (pts: [number, number][]) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

// Weighted base and turntable.
add("base", turned([[0, 0], [450, 0], [450, 30], [400, 80], [0, 80]]).color(enamel));
add("turntable", cylinder(40, 180, 20).translate(0, 0, 80).color(stainlessSteel));
add("mast", cylinder(1380, 35, 12).translate(0, 0, 120).color(stainlessSteel));

// Four shrinking tiers with cups hung upside-down on pegs around the rim.
const tiers = [
  { z: 300, r: 400, n: 10 },
  { z: 640, r: 340, n: 9 },
  { z: 960, r: 280, n: 7 },
  { z: 1260, r: 220, n: 6 },
];
// Cup hung upside-down: wide rim at the bottom, narrower base on top.
const cup = turned([[0, 0], [58, 0], [62, 10], [44, 170], [0, 170]]);
tiers.forEach((t, i) => {
  add(`tier-${i}`, turned([[0, 0], [t.r, 0], [t.r + 10, 30], [t.r - 10, 40], [0, 40]]).translate(0, 0, t.z).color(enamel));
  add(`tier-hub-${i}`, cylinder(60, 70, 12).translate(0, 0, t.z - 60).color(stainlessSteel));
  for (let k = 0; k < t.n; k++) {
    const a = (2 * Math.PI * (k + i * 0.5)) / t.n;
    const cr = t.r - 70;
    const x = cr * Math.cos(a);
    const y = cr * Math.sin(a);
    add(`peg-${i}-${k}`, cylinder(30, 10, 6).translate(x, y, t.z + 40).color(stainlessSteel));
    add(`cup-${i}-${k}`, cup.translate(x, y, t.z + 42).color(k % 3 === 2 ? enamel : polymer));
    add(`cup-band-${i}-${k}`, cylinder(30, 54, 12).translate(x, y, t.z + 82).color(lid));
  }
  // Stacked spare lids on the hub.
  add(`lid-stack-${i}`, cylinder(50, 60, 14).translate(0, 0, t.z + 40).color(lid));
});

// Round refill topper sign on the mast top.
const SZ = 1500;
add("sign-collar", cylinder(60, 50, 12).translate(0, 0, SZ - 60).color(stainlessSteel));
add("sign-disc", cylinder(30, 200, 28).rotateX(90).translate(0, 15, SZ + 190).color(enamel));
add("sign-face-front", cylinder(6, 170, 28).rotateX(90).translate(0, -15, SZ + 190).color(lid));
add("sign-face-back", cylinder(6, 170, 28).rotateX(-90).translate(0, 15, SZ + 190).color(lid));
add("sign-cup", turned([[0, 0], [50, 0], [70, 150], [0, 150]]).rotateX(-20).translate(0, -40, SZ + 110).color(polymer));
add("sign-straw", box(14, 14, 120, true).rotateY(20).translate(20, -40, SZ + 290).color(enamel));

return p.model();
