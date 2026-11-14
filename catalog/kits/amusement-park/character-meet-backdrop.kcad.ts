// SPDX-License-Identifier: CC0-1.0
// Character meet-and-greet backdrop: the little storybook stage where a park
// character stands for photos with each family in the queue.
// What makes it a meet-and-greet set rather than a wall: a timber stage deck
// with a front step and edge trim, a painted sky backdrop with a cloud-scalloped
// top edge, a flat castle silhouette with turrets and pointed roofs, a gilded
// round-topped portal framing the photo spot, gathered velvet curtain wings with
// a scalloped pelmet and tie-backs, raked stage braces behind, and two star
// "stand here" marks on the deck.
// Generic visualization geometry at about real size (about 2.4 m wide, 1.5 m
// deep, 2.6 m tall), millimetres, Z up, facing -Y, standing on z = 0.
meta({
  name: "character-meet-backdrop",
  license: "CC0-1.0",
  title: "Character meet-and-greet backdrop",
  description: "Storybook character photo stage at about real size: timber deck with front step, painted sky backdrop with cloud-scalloped top, flat castle silhouette with turrets, gilded round-topped portal, gathered velvet curtain wings with pelmet and tie-backs, rear braces and two star stand-here marks. Material controls: velvet fabric, stage timber, scenery paint, gilt trim and castle flat paint. Storybook, festival and twilight presets.",
  tags: ["photo op", "meet and greet", "character", "stage", "backdrop", "castle", "curtain", "amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 3000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const fabric = param("fabric", "#9e2a3a", { label: "Curtain velvet" });
const timber = param("timber", "#8a6748", { label: "Stage timber" });
const scenery = param("scenery", "#86bfe0", { label: "Scenery paint" });
const gilt = param("gilt", "#d9b44a", { label: "Gilt trim and stars" });
const stone = param("stone", "#efe4cf", { label: "Castle flat paint" });

presets({
  storybook: { fabric: "#9e2a3a", timber: "#8a6748", scenery: "#86bfe0", gilt: "#d9b44a", stone: "#efe4cf" },
  festival: { fabric: "#d4593a", timber: "#ab8051", scenery: "#f2d27a", gilt: "#f4f0e2", stone: "#f7c6cf" },
  twilight: { fabric: "#3a3f78", timber: "#604b3b", scenery: "#4a5f8f", gilt: "#c8b06a", stone: "#b9b3c9" },
});

const p = assembly("character-meet-backdrop");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Side profile drawn in (y, z) and extruded t wide along X; outline drawn in (x, z) and extruded t deep along Y, centred on y = 0.
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const arc = (cx: number, cz: number, r: number, a0: number, a1: number, n: number): [number, number][] =>
  Array.from({ length: n }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * (i + 1)) / (n + 1)) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cz + r * Math.sin(a)];
  });

const DECK = 180;

// Stage deck, front step and edge trim.
add("stage", box(2400, 1200, DECK - 30, true).translate(0, 0, (DECK - 30) / 2).color(timber));
add("stage-top", box(2440, 1240, 30, true).translate(0, 0, DECK - 15).color(timber));
add("stage-trim", box(2450, 30, 50, true).translate(0, -625, DECK - 60).color(gilt));
add("front-step", box(1100, 300, 90, true).translate(0, -750, 45).color(timber));
add("step-nosing", box(1120, 20, 20, true).translate(0, -905, 80).color(gilt));

// Painted sky backdrop with a scalloped cloud top edge.
const BW = 2200;
const BT = 1900;
const sky: [number, number][] = [[-BW / 2, 0], [BW / 2, 0], [BW / 2, BT - 150]];
const CL = 5;
for (let k = CL - 1; k >= 0; k--) {
  const cx = -BW / 2 + (BW / CL) * (k + 0.5);
  sky.push(...arc(cx, BT - 150, BW / CL / 2, 0, 180, 5));
  if (k > 0) sky.push([cx - BW / CL / 2, BT - 150]);
}
sky.push([-BW / 2, BT - 150]);
add("backdrop", profileXZ(sky, 60).translate(0, 520, DECK).color(scenery));

// Flat castle silhouette in front of the sky.
const castle: [number, number][] = [
  [-900, 0], [900, 0], [900, 1150], [860, 1150], [780, 1650], [700, 1150], [660, 1150],
  [660, 950], [560, 950], [560, 1010], [480, 1010], [480, 950], [380, 950], [380, 1010], [300, 1010],
  [300, 1350], [240, 1350], [0, 1720], [-240, 1350], [-300, 1350],
  [-300, 1010], [-380, 1010], [-380, 950], [-480, 950], [-480, 1010], [-560, 1010], [-560, 950], [-660, 950],
  [-660, 1150], [-700, 1150], [-780, 1650], [-860, 1150], [-900, 1150],
];
add("castle", profileXZ(castle.map(([x, z]) => [x, z * 0.8] as [number, number]), 30).translate(0, 470, DECK).color(stone));
for (const x of [-780, 0, 780]) add(`turret-window-${x}`, profileXZ([[-45, 0], [45, 0], [45, 120], ...arc(0, 120, 45, 0, 180, 5), [-45, 120]], 10).translate(x, 450, DECK + (x === 0 ? 880 : 680)).color(timber));

// Gilded round-topped portal framing the photo spot.
const PW = 1500;
const PIW = 1200;
const PH = 1500;
const portal: [number, number][] = [
  [-PW / 2, 0], [-PIW / 2, 0], [-PIW / 2, PH], ...arc(0, PH, PIW / 2, 180, 0, 12), [PIW / 2, PH], [PIW / 2, 0],
  [PW / 2, 0], [PW / 2, PH], ...arc(0, PH, PW / 2, 0, 180, 12), [-PW / 2, PH],
];
add("portal", profileXZ(portal, 120).translate(0, 360, DECK).color(gilt));
for (const sx of [-1, 1]) add(`portal-plinth-${sx > 0 ? "r" : "l"}`, box(220, 200, 260, true).translate(sx * (PW + PIW) / 4, 350, DECK + 130).color(timber));
add("portal-keystone", profileXZ([[-90, 0], [90, 0], [130, 220], [-130, 220]], 160).translate(0, 340, DECK + PH + PW / 2 - 60).color(timber));

// Velvet curtain wings: gathered folds, scalloped pelmet and tie-backs.
const WING_X = 1000;
const CURTAIN_H = 2050;
for (const sx of [-1, 1]) {
  const s = sx > 0 ? "r" : "l";
  for (let k = 0; k < 4; k++) add(`curtain-fold-${s}-${k}`, cylinder(CURTAIN_H, 55, 10).translate(sx * (WING_X + 80 * k - 120), 300 + (k % 2) * 30, DECK).color(fabric));
  add(`tie-back-${s}`, torus(170, 18, 12).translate(sx * (WING_X + 0), 300, DECK + 900).color(gilt));
}
const SC = 7;
const sw = 2500 / SC;
const bottom: [number, number][] = [];
for (let k = SC - 1; k >= 0; k--) {
  const cx = -1250 + sw * (k + 0.5);
  bottom.push(...arc(cx, 0, sw / 2, 0, -180, 4));
  if (k > 0) bottom.push([cx - sw / 2, 0]);
}
add("pelmet", profileXZ([[-1250, 0], [-1250, 260], [1250, 260], [1250, 0], ...bottom], 60).translate(0, 230, DECK + CURTAIN_H - 260).color(fabric));
add("pelmet-trim", box(2520, 70, 40, true).translate(0, 230, DECK + CURTAIN_H + 20).color(gilt));

// Raked braces behind the backdrop.
for (const x of [-800, 0, 800]) {
  add(`brace-${x}`, profileYZ([[0, 0], [0, 1500], [380, 0]], 50).translate(x, 560, DECK).color(timber));
}

// Star "stand here" marks on the deck.
const star: [number, number][] = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 === 0 ? 170 : 70;
  const a = ((90 + i * 36) * Math.PI) / 180;
  return [r * Math.cos(a), r * Math.sin(a)];
});
add("star-mark-0", extrudePolygon(star, 8).translate(-300, -250, DECK).color(gilt));
add("star-mark-1", extrudePolygon(star, 8).translate(300, -250, DECK).color(gilt));

return p.model();
