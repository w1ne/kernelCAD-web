// Gym Bench: Low-poly adjustable bench prop with padded top, support frame and floor feet. Low-poly sports prop in millimetres, Z up; materials: vinyl upholstery, frame steel, foot rubber.
meta({
  name: 'gym-bench',
  license: 'CC0-1.0',
  title: 'Gym bench',
  description: "Low-poly adjustable bench prop with padded top, support frame and floor feet. Material controls: vinyl upholstery, frame steel, foot rubber.",
  tags: ['gym bench', 'weight bench', 'gym', 'training', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const vinylUpholstery = param('vinylUpholstery', '#344f5c', { label: 'Vinyl upholstery' });
const frameSteel = param('frameSteel', '#8e999d', { label: 'Frame steel' });
const footRubber = param('footRubber', '#30363a', { label: 'Foot rubber' });
presets({ clubColors: { vinylUpholstery: '#87463d', frameSteel: '#8e999d' } });
const p = assembly('gym-bench');
p.part('pad', box(330, 112, 30, true).translate(0, 0, 330).scale(scale).color(vinylUpholstery));
p.part('front-leg', box(24, 86, 290, true).translate(-102, 0, 145).scale(scale).color(frameSteel));
p.part('rear-leg', box(24, 86, 252, true).translate(108, 0, 126).scale(scale).color(frameSteel));
p.part('crossbar', box(220, 22, 18, true).translate(2, 0, 75).scale(scale).color(frameSteel));
p.part('front-foot', box(105, 32, 12, true).translate(-102, 0, 6).scale(scale).color(footRubber));
p.part('rear-foot', box(105, 32, 12, true).translate(108, 0, 6).scale(scale).color(footRubber));

return p.model();
