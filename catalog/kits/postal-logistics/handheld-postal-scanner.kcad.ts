// SPDX-License-Identifier: CC0-1.0
// Handheld postal scanner: Rugged handheld parcel scanner with a broad reader head, handle and raised control keys. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "handheld-postal-scanner",
  license: 'CC0-1.0',
  title: "Handheld postal scanner",
  description: "Rugged handheld parcel scanner with a broad reader head, handle and raised control keys. Scale, painted steel, safety amber, stainless steel, instrument glass, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#4e6c7d', { label: 'Painted steel' });
const safetyAmber = param('safetyAmber', '#e7aa35', { label: 'Safety amber' });
const stainlessSteel = param('stainlessSteel', '#bbc4c4', { label: 'Stainless steel' });
const instrumentGlass = param('instrumentGlass', '#57b4c3', { label: 'Instrument glass' });
presets({
  weathered: { paintedSteel: '#68777a', safetyAmber: '#bb8c34', stainlessSteel: '#9ea7a6', instrumentGlass: '#548a91' },
  highVisibility: { paintedSteel: '#e36d32', safetyAmber: '#ffd12f', stainlessSteel: '#d9e0de', instrumentGlass: '#6bd0dc' },
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
const tiltedY = (x:number,y:number,z:number,w:number,d:number,h:number,a:number) => bevelled(w,d,h).translate(0,0,-h/2).rotateY(a).translate(x,y,z+h/2).scale(scale);

const p = assembly("handheld-postal-scanner");
p.part("scanner-head", b(0,0,245,210,150,70).color(stainlessSteel));
p.part("reader-window", b(0,-8,315,150,105,20).color(instrumentGlass));
p.part("handle", tiltedY(0,-115,140,95,75,220,-10).color(paintedSteel));
p.part("handle-end", b(0,-115,35,120,90,35).color(paintedSteel));
p.part("trigger", b(0,-75,220,40,20,50).color(safetyAmber));
p.part("top-key-a", b(-58,34,320,34,30,16).color(safetyAmber));
p.part("top-key-b", b(0,34,320,34,30,16).color(safetyAmber));
p.part("top-key-c", b(58,34,320,34,30,16).color(safetyAmber));
p.part("battery-pack", b(0,-125,0,88,70,48).color(paintedSteel));

return p.model();
