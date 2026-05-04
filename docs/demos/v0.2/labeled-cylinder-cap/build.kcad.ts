// Hollow cylinder with a labeled cap, then translate.
// faceLabels declares the open-top end as 'cap', shell removes it,
// then translate(5, 0, 0) — the label resolved at shell time, the
// transform comes after.

cylinder(20, 10, undefined, { faceLabels: { cap: 'top' } })
  .shell(2, { face: 'cap' })
  .translate(5, 0, 0);
