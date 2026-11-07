// Character meet photo easel: Portable guest photo display with a tripod back, framed sample print, and a low caption shelf.
meta({
  name: "character-meet-photo-easel",
  license: "CC0-1.0",
  title: "Character meet photo easel",
  description: "Portable guest photo display with a tripod back, framed sample print, and a low caption shelf. Controls: overall scale, timber, aluminum, acrylic; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const timber = param("timber", "#8a6748", { label: "Sealed timber" });
const aluminum = param("aluminum", "#9caeb0", { label: "Anodized aluminum" });
const acrylic = param("acrylic", "#63aab8", { label: "Tinted acrylic" });

presets({
  festival: {
    "timber": "#ab8051",
    "aluminum": "#c2c9c5",
    "acrylic": "#79c8d2"
},
  twilight: {
    "timber": "#604b3b",
    "aluminum": "#718a94",
    "acrylic": "#41768b"
},
});
const originOffsetMm = -3.732;
const p = assembly("character-meet-photo-easel");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if ([].includes(name)) p.part(name, positioned.color(timber));
  else if (["display-frame", "sample-panel"].includes(name)) p.part(name, positioned.color(acrylic));
  else if (["caption-shelf", "easel-leg-0", "easel-leg-1", "easel-leg-2", "frame-corner-0", "frame-corner-1", "frame-corner-2", "frame-corner-3"].includes(name)) p.part(name, positioned.color(aluminum));
  else p.part(name, positioned.color(timber));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("display-frame", [1120, 150, 1460], [0, 0, 1330]);
B("sample-panel", [900, 55, 1160], [0, -100, 1330]);
B("caption-shelf", [1360, 450, 90], [0, -120, 490]);
B("easel-leg-0", [80, 90, 1520], [-500, 0, 760], [-10, 0, 0]);
B("easel-leg-1", [80, 90, 1520], [500, 0, 760], [-10, 0, 0]);
B("easel-leg-2", [80, 90, 1520], [0, 430, 760], [12, 0, 0]);
B("frame-corner-0", [150, 130, 150], [-490, -95, 740]);
B("frame-corner-1", [150, 130, 150], [490, -95, 740]);
B("frame-corner-2", [150, 130, 150], [-490, -95, 1920]);
B("frame-corner-3", [150, 130, 150], [490, -95, 1920]);

return p.model();
