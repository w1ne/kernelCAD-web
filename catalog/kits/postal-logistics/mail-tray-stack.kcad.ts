// SPDX-License-Identifier: CC0-1.0
// Mail tray stack: Stack of four shallow mail trays with reinforced rims and hand-grip openings. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "mail-tray-stack",
  license: 'CC0-1.0',
  title: "Mail tray stack",
  description: "Stack of four shallow mail trays with reinforced rims and hand-grip openings. Scale, painted steel, moulded polymer, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#607b7b', { label: 'Painted steel' });
const polymer = param('polymer', '#477c8e', { label: 'Moulded polymer' });
presets({
  weathered: { paintedSteel: '#68777a', polymer: '#6c7c7c' },
  highVisibility: { paintedSteel: '#e36d32', polymer: '#e0b245' },
});
const octRect = (w:number,d:number,cut:number) => path()
  .moveTo(-w/2+cut,-d/2).lineTo(w/2-cut,-d/2).lineTo(w/2,-d/2+cut)
  .lineTo(w/2,d/2-cut).lineTo(w/2-cut,d/2).lineTo(-w/2+cut,d/2)
  .lineTo(-w/2,d/2-cut).lineTo(-w/2,-d/2+cut).close();
const bevelled = (w:number,d:number,h:number) => {
  const edge = Math.min(w,d,h) * 0.08;
  const profiles = [
    octRect(w-edge*2,d-edge*2,Math.min(w-edge*2,d-edge*2)*0.08),
    octRect(w,d,Math.min(w,d)*0.08),
    octRect(w,d,Math.min(w,d)*0.08),
    octRect(w-edge*2,d-edge*2,Math.min(w-edge*2,d-edge*2)*0.08),
  ];
  const levels = [0,edge,h-edge,h];
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0,0,z] as [number,number,number] })),
    ruled: true,
  });
};
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => bevelled(w,d,h).translate(x,y,z).scale(scale);

const p = assembly("mail-tray-stack");
p.part("tray-bottom", b(0,0,0,620,430,80).color(polymer));
p.part("tray-2", b(0,0,95,620,430,80).color(polymer));
p.part("tray-3", b(0,0,190,620,430,80).color(polymer));
p.part("tray-top", b(0,0,285,620,430,80).color(polymer));
p.part("rim-front", b(0,-210,365,620,28,20).color(paintedSteel));
p.part("rim-back", b(0,210,365,620,28,20).color(paintedSteel));
p.part("hand-slot-left", b(-280,0,342,30,150,30).color(paintedSteel));
p.part("hand-slot-right", b(280,0,342,30,150,30).color(paintedSteel));

return p.model();
