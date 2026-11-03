// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "fire-watch-response-cart",
  license: "CC0-1.0",
  title: "Fire watch response cart",
  description: "Hot-work watch cart with a tool chest, hose reel, extinguisher cradle, and a tall signal mast. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "outfitting and yard services"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#b45a42", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("fire-watch-response-cart");

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

B("cart-frame", [1280, 700, 150], [0, 0, 430]);
B("tool-chest", [760, 560, 660], [-170, 0, 835]);
C("hose-reel", 180, 300, [480, 0, 850], [90, 0, 0], 14);
B("extinguisher-cradle", [300, 350, 520], [420, 300, 690]);
C("signal-mast", 1030, 45, [550, 280, 1480], [0, 0, 0], 8);
C("cart-wheel-0", 80, 165, [-520, -300, 165], [90, 0, 0], 10);
C("cart-wheel-1", 80, 165, [520, -300, 165], [90, 0, 0], 10);
C("cart-wheel-2", 80, 165, [-520, 300, 165], [90, 0, 0], 10);
C("cart-wheel-3", 80, 165, [520, 300, 165], [90, 0, 0], 10);
B("push-handle", [90, 650, 90], [-650, 0, 940]);

return p.model();
