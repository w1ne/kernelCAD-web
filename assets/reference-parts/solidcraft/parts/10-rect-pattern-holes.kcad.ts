// Hole u/v is the top-face centre frame. World centres are (15+20i, 15+20j).
return box(90, 70, 5).holes('top', {
  positions: [
    { u: -30, v: -20 }, { u: -10, v: -20 }, { u: 10, v: -20 }, { u: 30, v: -20 },
    { u: -30, v: 0 }, { u: -10, v: 0 }, { u: 10, v: 0 }, { u: 30, v: 0 },
    { u: -30, v: 20 }, { u: -10, v: 20 }, { u: 10, v: 20 }, { u: 30, v: 20 },
  ],
  diameter: 6,
  depth: 'through',
});
