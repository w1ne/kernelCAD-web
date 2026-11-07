// SPDX-License-Identifier: CC0-1.0
// Crossbelt sorter section: Elevated sortation track section with repeated shallow crossbelt carriage trays. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "crossbelt-sorter-section",
  license: 'CC0-1.0',
  title: "Crossbelt sorter section",
  description: "Elevated sortation track section with repeated shallow crossbelt carriage trays. Scale, painted steel, structural steel, moulded polymer, stainless steel, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#56777d', { label: 'Painted steel' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
const polymer = param('polymer', '#477c8e', { label: 'Moulded polymer' });
const stainlessSteel = param('stainlessSteel', '#bbc4c4', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#68777a', structuralSteel: '#67675f', polymer: '#6c7c7c', stainlessSteel: '#9ea7a6' },
  highVisibility: { paintedSteel: '#e36d32', structuralSteel: '#454f54', polymer: '#e0b245', stainlessSteel: '#d9e0de' },
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

const p = assembly("crossbelt-sorter-section");
p.part("track-base", b(0,0,690,680,1180,75).color(structuralSteel));
p.part("side-left", b(-330,0,735,30,1180,65).color(paintedSteel));
p.part("side-right", b(330,0,735,30,1180,65).color(paintedSteel));
p.part("support-left-front", b(-270,-450,0,55,55,690).color(structuralSteel));
p.part("support-right-front", b(270,-450,0,55,55,690).color(structuralSteel));
p.part("support-left-back", b(-270,450,0,55,55,690).color(structuralSteel));
p.part("support-right-back", b(270,450,0,55,55,690).color(structuralSteel));
p.part("tray-1", b(0,-390,790,500,150,50).color(polymer));
p.part("tray-2", b(0,-130,790,500,150,50).color(polymer));
p.part("tray-3", b(0,130,790,500,150,50).color(polymer));
p.part("tray-4", b(0,390,790,500,150,50).color(polymer));
p.part("drive-panel", b(390,0,370,80,180,260).color(stainlessSteel));

return p.model();
