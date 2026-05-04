return cylinder(20, 10, undefined, { faceLabels: { cap: 'top' } })
  .shell(2, { face: 'cap' })
  .translate(5, 0, 0);
