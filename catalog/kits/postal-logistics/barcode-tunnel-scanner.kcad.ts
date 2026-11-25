// SPDX-License-Identifier: CC0-1.0
// Barcode tunnel scanner: the open portal that every parcel on the sortation
// belt passes through on its way to the chutes. What makes it a tunnel scanner
// rather than a camera on a post: a rectangular arch with painted side walls
// and roof, two stainless scan heads looking down from the roof at the leading
// and trailing edges of the parcel, instrument-glass side windows, and the
// rubber belt that carries the parcel through the opening. Low-poly
// visualization geometry in millimetres, Z up.

meta({
  name: "barcode-tunnel-scanner",
  license: 'CC0-1.0',
  title: "Barcode tunnel scanner",
  description: "Open-sided parcel scanning tunnel at about real size: painted steel arch with a roof, stainless scan heads at the leading and trailing edges, instrument-glass side windows, four structural-steel legs and a dark rubber belt through the opening. Material controls: painted steel, structural steel, stainless steel, instrument glass and belt rubber; weathered and highVisibility presets.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#596e83', { label: 'Painted steel' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#bbc4c4', { label: 'Stainless steel' });
const instrumentGlass = param('instrumentGlass', '#57b4c3', { label: 'Instrument glass' });
// The carrying belt is a dark PVC/rubber carcass, not a painted steel sheet.
const beltRubber = param('beltRubber', '#2c3134', { label: 'Belt rubber' });
presets({
  weathered: { paintedSteel: '#68777a', structuralSteel: '#67675f', stainlessSteel: '#9ea7a6', instrumentGlass: '#548a91', beltRubber: '#3d4140' },
  highVisibility: { paintedSteel: '#e36d32', structuralSteel: '#454f54', stainlessSteel: '#d9e0de', instrumentGlass: '#6bd0dc', beltRubber: '#2c3134' },
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

const p = assembly("barcode-tunnel-scanner");
p.part("belt", b(0,0,570,720,850,65).color(beltRubber));
p.part("left-leg-front", b(-330,-300,0,50,50,570).color(structuralSteel));
p.part("right-leg-front", b(330,-300,0,50,50,570).color(structuralSteel));
p.part("left-leg-back", b(-330,300,0,50,50,570).color(structuralSteel));
p.part("right-leg-back", b(330,300,0,50,50,570).color(structuralSteel));
p.part("arch-left", b(-330,0,570,60,760,720).color(paintedSteel));
p.part("arch-right", b(330,0,570,60,760,720).color(paintedSteel));
p.part("arch-top", b(0,0,1260,720,760,60).color(paintedSteel));
p.part("scan-head-front", b(0,-270,1160,170,170,115).color(stainlessSteel));
p.part("scan-head-back", b(0,270,1160,170,170,115).color(stainlessSteel));
p.part("side-window-left", b(-285,0,1020,18,240,170).color(instrumentGlass));
p.part("side-window-right", b(285,0,1020,18,240,170).color(instrumentGlass));

return p.model();
