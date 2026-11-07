// SPDX-License-Identifier: CC0-1.0
// Delivery sequence case: Tall compartment case with numbered-looking bays, top cover and lower return-mail pocket. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "delivery-sequence-case",
  license: 'CC0-1.0',
  title: "Delivery sequence case",
  description: "Tall compartment case with numbered-looking bays, top cover and lower return-mail pocket. Scale, painted steel, moulded polymer, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#667b78', { label: 'Painted steel' });
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

const p = assembly("delivery-sequence-case");
p.part("case-body", b(0,0,0,740,360,1040).color(polymer));
p.part("top-lip", b(0,0,1040,790,410,55).color(paintedSteel));
p.part("left-side", b(-350,0,55,38,340,950).color(paintedSteel));
p.part("right-side", b(350,0,55,38,340,950).color(paintedSteel));
p.part("divider-a", b(-245,0,110,25,330,820).color(paintedSteel));
p.part("divider-b", b(-120,0,110,25,330,820).color(paintedSteel));
p.part("divider-c", b(5,0,110,25,330,820).color(paintedSteel));
p.part("divider-d", b(130,0,110,25,330,820).color(paintedSteel));
p.part("divider-e", b(255,0,110,25,330,820).color(paintedSteel));
p.part("return-pocket", b(0,-195,150,650,35,260).color(polymer));
p.part("carry-handle", b(0,0,1095,260,65,55).color(paintedSteel));

return p.model();
