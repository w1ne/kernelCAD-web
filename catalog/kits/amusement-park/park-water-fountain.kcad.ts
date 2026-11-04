// Park drinking fountain: Freestanding guest fountain with a raised bowl, two push-button stations, and a bottle-fill spout.
meta({
  name: "park-water-fountain",
  license: "CC0-1.0",
  title: "Park drinking fountain",
  description: "Freestanding guest fountain with a raised bowl, two push-button stations, and a bottle-fill spout. Controls: overall scale, stainlessSteel, concrete, acrylic; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless steel" });
const concrete = param("concrete", "#92938b", { label: "Concrete" });
const acrylic = param("acrylic", "#63aab8", { label: "Tinted acrylic" });

presets({
  festival: {
    "stainlessSteel": "#d1d1c6",
    "concrete": "#aaa99e",
    "acrylic": "#79c8d2"
},
  twilight: {
    "stainlessSteel": "#788b91",
    "concrete": "#6f7477",
    "acrylic": "#41768b"
},
});
const originOffsetMm = 0;
const p = assembly("park-water-fountain");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["backsplash", "bottle-fill-spout", "bowl", "pedestal"].includes(name)) p.part(name, positioned.color(stainlessSteel));
  else if (["push-button-0", "push-button-1"].includes(name)) p.part(name, positioned.color(acrylic));
  else if (["bubbler-post-0", "bubbler-post-1"].includes(name)) p.part(name, positioned.color(concrete));
  else p.part(name, positioned.color(stainlessSteel));
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

B("pedestal", [480, 500, 810], [0, 0, 405]);
C("bowl", 110, 410, [0, 0, 850], [0, 0, 0], 12);
B("backsplash", [800, 100, 740], [0, 240, 1030]);
C("bubbler-post-0", 160, 30, [-200, -140, 1000], [0, 0, 0], 8);
C("bubbler-post-1", 160, 30, [200, -140, 1000], [0, 0, 0], 8);
B("push-button-0", [100, 50, 75], [-240, -210, 950]);
B("push-button-1", [100, 50, 75], [240, -210, 950]);
C("bottle-fill-spout", 230, 32, [0, 220, 1380], [90, 0, 0], 8);

return p.model();
