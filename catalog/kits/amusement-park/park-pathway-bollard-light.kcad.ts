// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "park-pathway-bollard-light",
  license: "CC0-1.0",
  title: "Park pathway bollard light",
  description: "Low path marker with a broad anchor foot, fluted post, and a down-shielded cap. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#d2a254", { label: "Asset color" });
const originOffsetMm = -45;
const p = assembly("park-pathway-bollard-light");

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

C("anchor-foot", 90, 220, [0, 0, 45], [0, 0, 0], 12);
C("bollard-post", 740, 105, [0, 0, 90]);
C("light-cap", 150, 150, [0, 0, 780]);
B("glare-shield", [330, 330, 70], [0, 0, 860]);
B("vertical-flute-0", [28, 28, 480], [-60, -60, 400]);
B("vertical-flute-1", [28, 28, 480], [60, -60, 400]);
B("vertical-flute-2", [28, 28, 480], [-60, 60, 400]);
B("vertical-flute-3", [28, 28, 480], [60, 60, 400]);

return p.model();
