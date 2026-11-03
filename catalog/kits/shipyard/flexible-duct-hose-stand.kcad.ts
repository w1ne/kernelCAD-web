// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "flexible-duct-hose-stand",
  license: "CC0-1.0",
  title: "Flexible duct hose stand",
  description: "Mobile stand carrying a coiled ventilation duct, with a central post, spool arms, base, and wheel set. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "outfitting and yard services"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#8a765d", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("flexible-duct-hose-stand");

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
const C = (name: string, height: number, radius: number, at: [number, number, number], rotation: [number, number, number] = [0, 0, 0], segments = 10) => {
  let shape = cylinder(height, radius, segments);
  if (rotation[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("base", [1100, 900, 130], [0, 0, 65]);
C("duct-coil", 430, 410, [0, 0, 790], [90, 0, 0], 16);
B("spool-shaft", [120, 1040, 120], [0, 0, 790]);
B("spool-arm-0", [760, 90, 90], [-430, 0, 790]);
B("spool-arm-1", [760, 90, 90], [430, 0, 790]);
C("caster-0", 85, 85, [-430, -330, 85], [0, 0, 0], 8);
C("caster-1", 85, 85, [430, -330, 85], [0, 0, 0], 8);
C("caster-2", 85, 85, [-430, 330, 85], [0, 0, 0], 8);
C("caster-3", 85, 85, [430, 330, 85], [0, 0, 0], 8);
B("handle", [80, 700, 680], [500, 0, 420]);

return p.model();
