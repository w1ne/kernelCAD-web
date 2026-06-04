// Reference build for cqe-task-assemble-m3-through-bracket.

const arm = assembly('arm');

const bracket = box(40, 20, 3).holes('top', {
  positions: [
    { u: -10, v: 0 },
    { u: 10, v: 0 },
  ],
  diameter: 3.2,
  depth: 'through',
});
arm.part('bracket', bracket);

const bolt = await lib.standard.boltSHCS({ thread: 'M3', lengthMm: 10 });
arm.part('bolt', bolt);

// Auto-emitted bolt-holes-1 = the leftmost (u=-10) hole.
arm.mate('bolt.head-bearing', 'bracket.bolt-holes-1', { kind: 'fastened' });

return arm.model();
