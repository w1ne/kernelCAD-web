// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "picnic-table-with-umbrella",
  license: "CC0-1.0",
  title: "Picnic table with umbrella",
  description: "Family dining table with two bench seats, umbrella mast, and a broad shade canopy. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#9d7b58", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("picnic-table-with-umbrella");

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

B("tabletop", [1800, 940, 100], [0, 0, 890]);
B("table-pedestal", [220, 220, 800], [0, 0, 440]);
B("bench-front", [1760, 310, 95], [0, -850, 470]);
B("bench-back", [1760, 310, 95], [0, 850, 470]);
B("bench-leg-0", [90, 90, 430], [-650, -850, 215]);
B("bench-leg-1", [90, 90, 430], [650, -850, 215]);
B("bench-leg-2", [90, 90, 430], [-650, 850, 215]);
B("bench-leg-3", [90, 90, 430], [650, 850, 215]);
C("umbrella-mast", 1870, 48, [0, 0, 970], [0, 0, 0], 8);
B("umbrella-canopy", [2350, 2200, 120], [0, 0, 1940]);

return p.model();
