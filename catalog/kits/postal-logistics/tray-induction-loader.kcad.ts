// SPDX-License-Identifier: CC0-1.0
// Tray induction loader: Feed station with a tray staging deck, backstop, side guides and operator controls. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "tray-induction-loader",
  license: 'CC0-1.0',
  title: "Tray induction loader",
  description: "Feed station with a tray staging deck, backstop, side guides and operator controls. Scale, painted steel, stainless steel, moulded polymer, structural steel, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#5e7481', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#bbc4c4', { label: 'Stainless steel' });
const polymer = param('polymer', '#477c8e', { label: 'Moulded polymer' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
presets({
  weathered: { paintedSteel: '#68777a', stainlessSteel: '#9ea7a6', polymer: '#6c7c7c', structuralSteel: '#67675f' },
  highVisibility: { paintedSteel: '#e36d32', stainlessSteel: '#d9e0de', polymer: '#e0b245', structuralSteel: '#454f54' },
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

const p = assembly("tray-induction-loader");
p.part("base", b(0,0,0,800,650,85).color(structuralSteel));
p.part("feed-deck", b(0,0,600,760,650,60).color(paintedSteel));
p.part("backstop", b(0,290,660,760,45,130).color(paintedSteel));
p.part("guide-left", b(-365,0,660,35,580,80).color(stainlessSteel));
p.part("guide-right", b(365,0,660,35,580,80).color(stainlessSteel));
p.part("tray-stack-a", b(0,-80,675,540,110,42).color(polymer));
p.part("tray-stack-b", b(0,40,717,540,110,42).color(polymer));
p.part("tray-stack-c", b(0,160,759,540,110,42).color(polymer));
p.part("control-post", b(470,-230,0,70,70,520).color(structuralSteel));
p.part("control-head", b(470,-230,520,220,140,150).color(stainlessSteel));
p.part("display", b(470,-210,600,155,15,82).color(paintedSteel));

return p.model();
