// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "yard-cable-reel-cart",
  license: "CC0-1.0",
  title: "Yard cable reel cart",
  description: "Portable cable handling cart with a guarded reel, through axle, push handle, and four shop-floor wheels. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "outfitting and yard services"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#b27046", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("yard-cable-reel-cart");

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

B("cart-deck", [1200, 680, 130], [0, 0, 370]);
B("side-frame-0", [100, 150, 1120], [-500, 0, 930]);
B("side-frame-1", [100, 150, 1120], [500, 0, 930]);
C("cable-drum", 620, 370, [0, 0, 1050], [90, 0, 0], 16);
C("support-wheel-0", 90, 180, [-540, -330, 180], [90, 0, 0], 10);
C("support-wheel-1", 90, 180, [540, -330, 180], [90, 0, 0], 10);
C("support-wheel-2", 90, 180, [-540, 330, 180], [90, 0, 0], 10);
C("support-wheel-3", 90, 180, [540, 330, 180], [90, 0, 0], 10);
B("push-handle", [100, 800, 90], [-580, 0, 1040]);
B("drum-lock", [80, 300, 300], [365, -250, 800]);

return p.model();
