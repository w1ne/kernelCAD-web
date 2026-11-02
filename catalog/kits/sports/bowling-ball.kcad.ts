meta({
  name: 'bowling-ball',
  license: 'CC0-1.0',
  title: 'Bowling ball',
  description: 'Heavy smooth ball with three contrasting finger-hole markers. Knobs: size, body and detail colours.',
  tags: ["bowling", "ball", "lane", "sports"],
  kit: 'sports',
  category: 'item',
  origin: 'base',
  compat: ["sports", "recreation", "game"],
  triangleBudget: 350,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const body = param('body', '#315d9b', { label: 'Body' });
const trim = param('trim', '#16191c', { label: 'Detail' });

presets({
  classic: { body: '#315d9b', trim: '#16191c' },
  club: { body: '#387a92', trim: '#e4c85a' },
});

const k = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.2 : 1;
const a = assembly('bowling-ball');
const R = 112 * k;
a.part('shell', sphere(R).scale([1, 1, 1]).translate(0,0,R*1).color(body));

for(const [i,p] of [[0,[-24,-18,1.78]],[1,[24,-18,1.78]],[2,[0,-42,1.89]]])
 a.part('finger-hole-'+i,sphere(12*k).translate(p[0]*k,p[1]*k,R*p[2]).color(trim));
return a.model();
