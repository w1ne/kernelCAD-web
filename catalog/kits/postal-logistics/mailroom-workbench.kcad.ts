// SPDX-License-Identifier: CC0-1.0
// Mailroom workbench: Sorting workbench with storage cubbies, a high back rail and a broad writing surface. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "mailroom-workbench",
  license: 'CC0-1.0',
  title: "Mailroom workbench",
  description: "Sorting workbench with storage cubbies, a high back rail and a broad writing surface. Scale, painted steel, structural steel, moulded polymer, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#687c7a', { label: 'Painted steel' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
const polymer = param('polymer', '#477c8e', { label: 'Moulded polymer' });
presets({
  weathered: { paintedSteel: '#68777a', structuralSteel: '#67675f', polymer: '#6c7c7c' },
  highVisibility: { paintedSteel: '#e36d32', structuralSteel: '#454f54', polymer: '#e0b245' },
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

const p = assembly("mailroom-workbench");
p.part("top", b(0,0,850,1320,620,65).color(paintedSteel));
p.part("left-leg", b(-590,220,0,70,70,850).color(structuralSteel));
p.part("right-leg", b(590,220,0,70,70,850).color(structuralSteel));
p.part("left-rear-leg", b(-590,-220,0,70,70,850).color(structuralSteel));
p.part("right-rear-leg", b(590,-220,0,70,70,850).color(structuralSteel));
p.part("back-rail", b(0,270,915,1280,55,120).color(structuralSteel));
p.part("cubby-base", b(0,-20,250,1150,430,50).color(structuralSteel));
p.part("cubby-top", b(0,-20,490,1150,430,45).color(paintedSteel));
p.part("cubby-left", b(-560,-20,270,45,430,260).color(paintedSteel));
p.part("cubby-right", b(560,-20,270,45,430,260).color(paintedSteel));
p.part("divider-a", b(-190,-20,270,35,420,220).color(paintedSteel));
p.part("divider-b", b(190,-20,270,35,420,220).color(paintedSteel));
p.part("keyboard-tray", b(0,-250,700,600,150,35).color(polymer));

return p.model();
