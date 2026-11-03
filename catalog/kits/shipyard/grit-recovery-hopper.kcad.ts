// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "grit-recovery-hopper",
  license: "CC0-1.0",
  title: "Grit recovery hopper",
  description: "Low collection hopper with a sloped bin body, discharge cone, fork pockets, and removable screen deck. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "surface preparation and coating"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#8c765c", { label: "Asset color" });
const originOffsetMm = 10;
const p = assembly("grit-recovery-hopper");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("bin-body", [1580, 1200, 980], [0, 0, 680]);
B("screen-deck", [1680, 1300, 120], [0, 0, 1240]);
B("discharge-neck", [620, 520, 330], [0, 0, 200]);
B("fork-pocket-left", [350, 300, 190], [-530, 0, 130]);
B("fork-pocket-right", [350, 300, 190], [530, 0, 130]);
B("screen-rib-0", [1520, 45, 60], [0, -560, 1330]);
B("screen-rib-1", [1520, 45, 60], [0, -340, 1330]);
B("screen-rib-2", [1520, 45, 60], [0, -120, 1330]);
B("screen-rib-3", [1520, 45, 60], [0, 100, 1330]);
B("screen-rib-4", [1520, 45, 60], [0, 320, 1330]);
B("screen-rib-5", [1520, 45, 60], [0, 540, 1330]);
B("outlet-flange", [700, 620, 90], [0, 0, 35]);

return p.model();
