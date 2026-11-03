// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "midway-barker-microphone-stand",
  license: "CC0-1.0",
  title: "Midway game microphone stand",
  description: "Portable host microphone podium with an angled script shelf, hand mic, and folded-stand feet. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "midway games"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#927a5f", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("midway-barker-microphone-stand");

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

B("podium-base", [620, 500, 110], [0, 0, 55]);
B("stem", [150, 160, 990], [0, 0, 600]);
B("script-shelf", [780, 500, 100], [0, -40, 1170], [-12, 0, 0]);
B("front-panel", [580, 90, 620], [0, -245, 620]);
C("microphone", 350, 44, [280, -20, 1500], [0, 0, -30], 8);
B("foot-0", [520, 80, 70], [-200, 0, 35], [0, 0, 25]);
B("foot-1", [520, 80, 70], [200, 0, 35], [0, 0, -25]);
B("foot-2", [520, 80, 70], [0, 200, 35], [0, 0, 90]);

return p.model();
