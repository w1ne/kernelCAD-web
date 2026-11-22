// A fastened mate solves the child against the base connector. The connected
// tip inherits that solved motion through the child.
const arm = assembly('model-scene-handoff');

arm.part('base', box(10, 10, 10).color('#3978ce'))
  .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [5, 0, 0] } });

const child = arm.part('child', box(10, 10, 10).color('#ee9943'), {
  connectors: { mount: { origin: [10, 0, 0] } },
});
child.connector('q', { type: 'frame', origin: { kind: 'vec3', value: [-5, 0, 0] } });

arm.part('tip', box(2, 4, 4).color('#55a88a'), {
  connectors: { root: { origin: [0, 0, 0] } },
  connect: { connector: 'root', to: child.connector('mount') },
});

arm.mate('seat', 'base.p', 'child.q', 'fastened');
return arm.model();
