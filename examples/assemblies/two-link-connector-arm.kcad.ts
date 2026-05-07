// v0.6 assembly connector example: a static two-link robot arm.
//
// Connectors are named local frames on each part. The link is placed by
// aligning its `root` connector to the base `shoulder` connector; assembly
// connection records keep the relationship inspectable for agents.

const arm = assembly('two-link connector arm');

const base = arm.part('base', box(30, 30, 8), {
  at: [0, 0, 0],
  connectors: {
    shoulder: { origin: [15, 15, 8], axis: [0, 0, 1] },
  },
});

const link = arm.part('link', box(80, 10, 6), {
  connectors: {
    root: { origin: [0, 5, 3], axis: [0, 0, 1] },
    wrist: { origin: [80, 5, 3], axis: [0, 0, 1] },
  },
  connect: {
    connector: 'root',
    to: base.connector('shoulder'),
    name: 'shoulder-fixed',
  },
});

const tool = arm.part('tool', cylinder(12, 5), {
  connectors: {
    mount: { origin: [0, 0, 0], axis: [0, 0, 1] },
  },
  connect: {
    connector: 'mount',
    to: link.connector('wrist'),
    name: 'wrist-fixed',
  },
});

arm.connect('tool-inspection', link.connector('wrist'), tool.connector('mount'));

return arm.model();
