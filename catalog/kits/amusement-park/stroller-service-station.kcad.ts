// SPDX-License-Identifier: CC0-1.0
// Stroller service station: the self-service stand beside stroller parking
// where parents pump up a soft tyre or tighten a loose wheel.
// What makes it a stroller service stand rather than a shelf: a signboard on
// two posts carrying a round stroller pictogram (basket, hood and wheels), a
// pedestal air pump with a dial gauge and a coiled hose hanging on its side, a
// tool bar with tethered wrenches, a raised wheel cradle holding a spare
// stroller wheel, and three hoop parking rails in front to lock strollers to.
// Generic visualization geometry at about real size (about 2.2 m wide, 2.1 m
// tall), millimetres, Z up, facing -Y, standing on z = 0.
meta({
  name: "stroller-service-station",
  license: "CC0-1.0",
  title: "Stroller service station",
  description: "Self-service stroller repair stand at about real size: two-post signboard with a stroller pictogram, pedestal air pump with dial gauge and coiled hose, tool bar with tethered wrenches, raised wheel cradle holding a spare stroller wheel, and three hoop parking rails. Material controls: painted steel, stainless rails and tools, rubber hose and tyres, and signage enamel. Park, festival and twilight presets.",
  tags: ["stroller", "pram", "bike repair stand", "air pump", "parking rail", "guest services", "amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 7000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const steel = param("steel", "#2f6d8c", { label: "Painted steel" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless rails and tools" });
const rubber = param("rubber", "#292f33", { label: "Rubber hose and tyres" });
const signage = param("signage", "#f2b134", { label: "Signage enamel" });

presets({
  park: { steel: "#2f6d8c", stainlessSteel: "#b0b9b6", rubber: "#292f33", signage: "#f2b134" },
  festival: { steel: "#c8423a", stainlessSteel: "#c2c9c5", rubber: "#2e2a35", signage: "#7fd0e0" },
  twilight: { steel: "#3a3f5c", stainlessSteel: "#7f8b90", rubber: "#15181c", signage: "#e7a0c4" },
});

const p = assembly("stroller-service-station");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Outline drawn in (x, z) and extruded t deep along Y, centred on y = 0.
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
// Upper half of a hoop standing in the XZ plane, radius R, tube r.
const hoop = (R: number, r: number) => torus(R, r, 20).rotateX(90).subtract(box(2 * R + 4 * r, 4 * r, R + 2 * r, true).translate(0, 0, -(R + 2 * r) / 2));

const BACK_Y = 400;

// Signboard on two posts with a stroller pictogram.
for (const sx of [-1, 1]) {
  add(`sign-post-${sx > 0 ? "r" : "l"}`, cylinder(2050, 45, 12).translate(sx * 650, BACK_Y, 0).color(steel));
  add(`post-base-${sx > 0 ? "r" : "l"}`, cylinder(40, 110, 12).translate(sx * 650, BACK_Y, 0).color(stainlessSteel));
}
add("signboard", extrudeRoundedRect(1500, 700, 60, 40, { axis: "y" }).translate(0, BACK_Y - 90, 1650).color(steel));
add("sign-roundel", cylinder(20, 280, 32).rotateX(90).translate(-380, BACK_Y - 90, 1650).color(signage));
// Pictogram: basket, hood quarter-disc, handle and two wheels.
const hood: [number, number][] = [[0, 0], [0, 150], ...Array.from({ length: 5 }, (_, i) => {
  const a = ((90 - (i + 1) * 15) * Math.PI) / 180;
  return [150 * Math.cos(a), 150 * Math.sin(a)] as [number, number];
}), [150, 0]];
add("picto-basket", profileXZ([[-160, 0], [140, 0], [100, -90], [-120, -90]], 10).translate(-380, BACK_Y - 115, 1650).color(steel));
add("picto-hood", profileXZ(hood.map(([x, z]) => [-x - 10, z] as [number, number]), 10).translate(-380, BACK_Y - 115, 1655).color(steel));
add("picto-handle", box(20, 10, 180, true).rotateY(-30).translate(-180, BACK_Y - 115, 1700).color(steel));
for (const wx of [-470, -290]) add(`picto-wheel-${wx}`, cylinder(10, 45, 16).rotateX(90).translate(wx, BACK_Y - 110, 1500).color(steel));
// Spanner icon on the right.
add("picto-spanner", box(320, 10, 50, true).rotateY(35).translate(300, BACK_Y - 115, 1650).color(signage));
add("picto-spanner-jaw", torus(55, 22, 12).rotateX(90).translate(430, BACK_Y - 115, 1740).color(signage));

// Tool bar with tethered wrenches.
add("tool-bar", cylinder(1300, 25, 10).rotateY(90).translate(-650, BACK_Y - 30, 1150).color(stainlessSteel));
for (let k = 0; k < 4; k++) {
  const x = 120 + k * 120;
  add(`tether-${k}`, cylinder(140, 5, 6).translate(x, BACK_Y - 30, 1000).color(rubber));
  add(`wrench-${k}`, box(26, 10, 220 - k * 25, true).translate(x, BACK_Y - 30, 880 + k * 12).color(stainlessSteel));
  add(`wrench-ring-${k}`, torus(26, 9, 10).rotateX(90).translate(x, BACK_Y - 30, 770 + k * 25).color(stainlessSteel));
}

// Pedestal air pump with dial gauge and coiled hose.
const PX = -720;
const PY = 0;
add("pump-plinth", box(320, 320, 40, true).translate(PX, PY, 20).color(stainlessSteel));
add("pump-body", extrudeRoundedRect(240, 1000, 60, 220, { axis: "y" }).translate(PX, PY - 110, 540).color(signage));
add("pump-head", extrudeRoundedRect(280, 200, 40, 260, { axis: "y" }).translate(PX, PY - 130, 1110).color(steel));
add("gauge-bezel", cylinder(30, 90, 24).rotateX(90).translate(PX, PY - 130, 1110).color(stainlessSteel));
add("gauge-face", cylinder(6, 75, 24).rotateX(90).translate(PX, PY - 156, 1110).color(signage));
add("gauge-needle", box(8, 4, 70, true).rotateY(40).translate(PX + 20, PY - 162, 1125).color(rubber));
add("pump-hook", cylinder(80, 14, 8).rotateY(90).translate(PX - 200, PY, 820).color(stainlessSteel));
for (let k = 0; k < 4; k++) add(`hose-coil-${k}`, torus(130, 14, 16).rotateY(90).translate(PX - 175 - k * 22, PY, 700).color(rubber));
add("hose-drop", cylinder(400, 14, 8).translate(PX - 175, PY - 120, 180).color(rubber));
add("hose-chuck", cylinder(70, 22, 10).translate(PX - 175, PY - 120, 110).color(stainlessSteel));

// Raised wheel cradle with a spare stroller wheel.
const WX = 450;
add("cradle-stand", box(80, 80, 560, true).translate(WX, 120, 280).color(steel));
add("cradle-foot", box(420, 300, 30, true).translate(WX, 120, 15).color(steel));
add("cradle-fork", profileXZ([[-140, 0], [140, 0], [140, 220], [100, 220], [100, 40], [-100, 40], [-100, 220], [-140, 220]], 80).translate(WX, 120, 560).color(stainlessSteel));
const WZ = 780;
add("spare-tyre", torus(150, 35, 24).rotateX(90).translate(WX, 120, WZ).color(rubber));
add("spare-rim", cylinder(40, 118, 20).rotateX(90).translate(WX, 140, WZ).color(signage));
add("spare-hub", cylinder(120, 30, 12).rotateX(90).translate(WX, 180, WZ).color(stainlessSteel));

// Three hoop parking rails in front.
const HR = 300;
const HH = 550;
for (let k = 0; k < 3; k++) {
  const x = -700 + k * 700;
  add(`rail-hoop-${k}`, hoop(HR, 30).translate(x, -500, HH).color(stainlessSteel));
  for (const sx of [-1, 1]) {
    add(`rail-leg-${k}-${sx > 0 ? "r" : "l"}`, cylinder(HH, 30, 10).translate(x + sx * HR, -500, 0).color(stainlessSteel));
    add(`rail-flange-${k}-${sx > 0 ? "r" : "l"}`, cylinder(15, 60, 10).translate(x + sx * HR, -500, 0).color(steel));
  }
  add(`rail-band-${k}`, cylinder(80, 34, 10).translate(x - HR, -500, 380).color(signage));
}

return p.model();
