// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "admission-turnstile-bank",
  license: "CC0-1.0",
  title: "Admission turnstile bank",
  description: "Three waist-high admission gates with rotating arms and a shared approach rail. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#718b87", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("admission-turnstile-bank");

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

B("approach-rail-front", [2200, 55, 900], [0, -520, 450]);
B("approach-rail-rear", [2200, 55, 900], [0, 520, 450]);
B("pedestal-0", [220, 260, 920], [-700, 0, 460]);
B("pedestal-1", [220, 260, 920], [0, 0, 460]);
B("pedestal-2", [220, 260, 920], [700, 0, 460]);
B("turnstile-arm-0-0", [460, 42, 42], [-700, 0, 500], [0, 0, 0]);
B("turnstile-arm-0-1", [460, 42, 42], [-700, 0, 500], [0, 0, 120]);
B("turnstile-arm-0-2", [460, 42, 42], [-700, 0, 500], [0, 0, 240]);
B("turnstile-arm-1-0", [460, 42, 42], [0, 0, 500], [0, 0, 0]);
B("turnstile-arm-1-1", [460, 42, 42], [0, 0, 500], [0, 0, 120]);
B("turnstile-arm-1-2", [460, 42, 42], [0, 0, 500], [0, 0, 240]);
B("turnstile-arm-2-0", [460, 42, 42], [700, 0, 500], [0, 0, 0]);
B("turnstile-arm-2-1", [460, 42, 42], [700, 0, 500], [0, 0, 120]);
B("turnstile-arm-2-2", [460, 42, 42], [700, 0, 500], [0, 0, 240]);
B("reader-0", [160, 120, 95], [-700, -20, 965]);
B("reader-1", [160, 120, 95], [0, -20, 965]);
B("reader-2", [160, 120, 95], [700, -20, 965]);

return p.model();
