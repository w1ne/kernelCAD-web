// Airport control tower: Air traffic control tower with a tapered concrete shaft, glazed observation cab and broad roof cap. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'airport-control-tower',
  license: 'CC0-1.0',
  title: 'Airport control tower',
  description: 'Air traffic control tower with a tapered concrete shaft, glazed observation cab and broad roof cap. Material controls: metal cladding, roof metal, concrete, glazing. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const cladding = param('cladding', '#f4c430', { label: 'Metal cladding' });
const roofMetal = param('roofMetal', '#38596d', { label: 'Roof metal' });
const concrete = param('concrete', '#b8b4aa', { label: 'Concrete' });
const glass = param('glass', '#2aa9be', { label: 'Glazing' });

presets({
  weathered: {
    cladding: '#596765',
    roofMetal: '#536267',
    concrete: '#555751',
    glass: '#315c69',
  },
  highVisibility: {
    cladding: '#f0b52f',
    roofMetal: '#aeb9bb',
    concrete: '#999990',
    glass: '#82c8d0',
  },
});
const squareProfile = (side: number) => path().moveTo(-side / 2, -side / 2).lineTo(side / 2, -side / 2).lineTo(side / 2, side / 2).lineTo(-side / 2, side / 2).close();
const p = assembly("airport-control-tower");
p.part("base", box(230, 230, 140, true).translate(0, 0, 70).scale(scale).color(concrete));
p.part("shaft", squareProfile(174).loft(squareProfile(126), { spacing: 540, ruled: true }).translate(0, 0, 140).scale(scale).color(concrete));
p.part("control-cab", box(300, 280, 130, true).translate(0, 0, 745).scale(scale).color(cladding));
p.part("roof-cap", box(330, 310, 24, true).translate(0, 0, 822).scale(scale).color(roofMetal));
p.part("left-cab-window-band", box(5, 232, 72, true).translate(-152.25, 0, 745).scale(scale).color(glass));
p.part("right-cab-window-band", box(5, 232, 72, true).translate(152.25, 0, 745).scale(scale).color(glass));

return p.model();
