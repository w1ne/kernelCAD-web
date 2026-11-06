// Starting Block: Track starting block prop with a low base rail and two angled-looking foot pads. Low-poly sports prop in millimetres, Z up; materials: anodized aluminium, pedal rubber, track mat.
meta({
  name: 'starting-block',
  license: 'CC0-1.0',
  title: 'Track starting block',
  description: "Track starting block prop with a low base rail and two angled-looking foot pads. Material controls: anodized aluminium, pedal rubber, track mat.",
  tags: ['starting block', 'track', 'athletics', 'field sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const anodizedAluminium = param('anodizedAluminium', '#8b989b', { label: 'Anodized aluminium' });
const pedalRubber = param('pedalRubber', '#344b5b', { label: 'Pedal rubber' });
const trackMat = param('trackMat', '#3a4042', { label: 'Track mat' });
presets({ clubColors: { anodizedAluminium: '#8b989b', pedalRubber: '#ba4d3f' } });
const p = assembly('starting-block');
p.part('base-rail', box(255, 62, 14, true).translate(0, 0, 7).scale(scale).color(anodizedAluminium));
p.part('front-pedal', box(65, 64, 44, true).translate(-72, 0, 36).scale(scale).color(pedalRubber));
p.part('rear-pedal', box(65, 64, 58, true).translate(70, 0, 43).scale(scale).color(pedalRubber));
p.part('front-heel-stop', box(12, 64, 50, true).translate(-110, 0, 53).scale(scale).color(pedalRubber));
p.part('rear-heel-stop', box(12, 64, 66, true).translate(107, 0, 62).scale(scale).color(pedalRubber));


// A thin non-slip track pad sits beneath the aluminium rail.
p.part("track-grip-pad", box(230, 44, 2, true).translate(0, 0, 1).color(trackMat));

return p.model();
