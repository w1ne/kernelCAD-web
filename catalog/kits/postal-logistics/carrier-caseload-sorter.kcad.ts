// SPDX-License-Identifier: CC0-1.0
// Carrier caseload sorter: Portable multi-compartment case for staging route bundles with a broad carry handle. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "carrier-caseload-sorter",
  license: 'CC0-1.0',
  title: "Carrier caseload sorter",
  description: "Portable multi-compartment case for staging route bundles with a broad carry handle. Scale, painted steel, structural steel, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#59727e', { label: 'Painted steel' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
presets({
  weathered: { paintedSteel: '#68777a', structuralSteel: '#67675f' },
  highVisibility: { paintedSteel: '#e36d32', structuralSteel: '#454f54' },
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

const p = assembly("carrier-caseload-sorter");
p.part("base", b(0,0,0,680,430,65).color(structuralSteel));
p.part("left-wall", b(-315,0,65,50,430,420).color(paintedSteel));
p.part("right-wall", b(315,0,65,50,430,420).color(paintedSteel));
p.part("back-wall", b(0,190,65,680,50,420).color(paintedSteel));
p.part("front-wall", b(0,-190,65,680,50,420).color(paintedSteel));
p.part("divider-a", b(-165,0,115,28,380,320).color(paintedSteel));
p.part("divider-b", b(0,0,115,28,380,320).color(paintedSteel));
p.part("divider-c", b(165,0,115,28,380,320).color(paintedSteel));
p.part("handle-left", b(-210,0,485,45,45,70).color(paintedSteel));
p.part("handle-right", b(210,0,485,45,45,70).color(paintedSteel));
p.part("handle", b(0,0,520,470,45,45).color(paintedSteel));

return p.model();
