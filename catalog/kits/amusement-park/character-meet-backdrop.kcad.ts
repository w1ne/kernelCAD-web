// Character meet-and-greet backdrop: Photo-op backdrop with a decorative portal, shallow stage, curtain wings, and two waiting marks.
meta({
  name: "character-meet-backdrop",
  license: "CC0-1.0",
  title: "Character meet-and-greet backdrop",
  description: "Photo-op backdrop with a decorative portal, shallow stage, curtain wings, and two waiting marks. Controls: overall scale, fabric, timber, powderCoat; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const fabric = param("fabric", "#c77786", { label: "Upholstery fabric" });
const timber = param("timber", "#8a6748", { label: "Sealed timber" });
const powderCoat = param("powderCoat", "#477985", { label: "Powder-coated steel" });

presets({
  festival: {
    "fabric": "#e4b765",
    "timber": "#ab8051",
    "powderCoat": "#d47452"
},
  twilight: {
    "fabric": "#557b8a",
    "timber": "#604b3b",
    "powderCoat": "#35576f"
},
});
const originOffsetMm = 0;
const p = assembly("character-meet-backdrop");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["backdrop", "curtain-wing-0", "curtain-wing-1", "portal-left", "portal-right", "portal-top", "waiting-mark-0"].includes(name)) p.part(name, positioned.color(fabric));
  else if (["waiting-mark-1"].includes(name)) p.part(name, positioned.color(powderCoat));
  else if (["stage"].includes(name)) p.part(name, positioned.color(timber));
  else p.part(name, positioned.color(fabric));
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

B("stage", [2400, 1200, 180], [0, 0, 90]);
B("backdrop", [2050, 130, 1770], [0, 480, 1065]);
B("portal-left", [220, 170, 1660], [-650, 360, 1010]);
B("portal-right", [220, 170, 1660], [650, 360, 1010]);
B("portal-top", [1510, 170, 230], [0, 360, 1900]);
B("curtain-wing-0", [260, 160, 1580], [-1060, 300, 890], [0, 0, -7]);
B("curtain-wing-1", [260, 160, 1580], [1060, 300, 890], [0, 0, 7]);
C("waiting-mark-0", 35, 240, [-620, -650, 18]);
C("waiting-mark-1", 35, 240, [620, -650, 18]);

return p.model();
