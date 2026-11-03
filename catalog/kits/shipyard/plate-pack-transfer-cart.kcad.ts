// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "plate-pack-transfer-cart",
  license: "CC0-1.0",
  title: "Plate pack transfer cart",
  description: "Shop cart for short plate packs with fork-shaped deck rails, end stops, push bar, and four large wheels. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "block and material movement"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#8a765d", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("plate-pack-transfer-cart");

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

B("cart-deck", [1840, 1050, 180], [0, 0, 470]);
B("deck-rail-0", [1630, 130, 180], [0, -340, 650]);
B("deck-rail-1", [1630, 130, 180], [0, 340, 650]);
B("end-stop-0", [140, 1020, 400], [-850, 0, 760]);
B("end-stop-1", [140, 1020, 400], [850, 0, 760]);
C("wheel-0", 110, 230, [-650, -450, 230], [90, 0, 0], 12);
C("wheel-1", 110, 230, [650, -450, 230], [90, 0, 0], 12);
C("wheel-2", 110, 230, [-650, 450, 230], [90, 0, 0], 12);
C("wheel-3", 110, 230, [650, 450, 230], [90, 0, 0], 12);
B("push-bar", [100, 920, 100], [-930, 0, 980]);
B("handle-grip", [120, 780, 120], [-930, 0, 1480]);

return p.model();
