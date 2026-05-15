# Task: Linear Bolt Pattern on Spaced Plates

Build a row of 6 small mounting plates produced by linearly patterning one source plate with a clearance hole.

Functional requirements:

- Source plate: `boltDiam`-aware tile, 20 × 50 × 6 mm, anchored at the origin.
- One source bolt clearance hole at face-local `u = 0, v = 0` on the top face, diameter `boltDiam`, depth `'through'`. Give the hole `name: 'mountBolt'`.
- Linearly pattern that plate **6 instances**, direction `[1, 0, 0]`, spacing 30 mm. Adjacent instances are disjoint (plate width 20 mm < spacing 30 mm), so each instance preserves its bore.

Accept this parameter:

```typescript
const boltDiam = param('boltDiam', 5, { min: 4, max: 6 });
```

Return the patterned tiles.

Z-up, millimetres, degrees.
