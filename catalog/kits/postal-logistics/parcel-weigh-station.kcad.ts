// SPDX-License-Identifier: CC0-1.0
// Parcel weigh station: Floor scale platform, upright digital indicator and a compact parcel staging shelf. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "parcel-weigh-station",
  license: 'CC0-1.0',
  title: "Parcel weigh station",
  description: "Floor scale platform, upright digital indicator and a compact parcel staging shelf. Scale, painted steel, structural steel, stainless steel, instrument glass, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#657a83', { label: 'Painted steel' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#bbc4c4', { label: 'Stainless steel' });
const instrumentGlass = param('instrumentGlass', '#57b4c3', { label: 'Instrument glass' });
presets({
  weathered: { paintedSteel: '#68777a', structuralSteel: '#67675f', stainlessSteel: '#9ea7a6', instrumentGlass: '#548a91' },
  highVisibility: { paintedSteel: '#e36d32', structuralSteel: '#454f54', stainlessSteel: '#d9e0de', instrumentGlass: '#6bd0dc' },
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

const p = assembly("parcel-weigh-station");
p.part("platform", b(0,0,0,760,720,100).color(paintedSteel));
p.part("top-plate", b(0,0,100,740,700,30).color(paintedSteel));
p.part("indicator-stem", b(420,270,110,50,50,720).color(paintedSteel));
p.part("indicator-head", b(420,270,810,260,140,180).color(stainlessSteel));
p.part("display", b(420,250,850,180,15,90).color(instrumentGlass));
p.part("shelf-left", b(-440,200,280,80,80,390).color(paintedSteel));
p.part("shelf-right", b(0,200,280,800,80,35).color(paintedSteel));
p.part("foot-left", b(-300,-300,0,70,70,90).color(structuralSteel));
p.part("foot-right", b(300,-300,0,70,70,90).color(structuralSteel));

return p.model();
