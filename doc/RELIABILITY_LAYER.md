# Reliability Layer

The Reliability Layer provides robust wrappers around Replicad's Sketcher API to handle edge cases gracefully and prevent invalid geometry.

## SafeSketcher

**Location**: `src/lib/safeSketch.ts`

The `SafeSketcher` class wraps Replicad's `Sketcher` to provide:

### Features

| Feature | Behavior |
|---------|----------|
| **Redundant Move Prevention** | Consecutive `movePointerTo()` calls to the same point are ignored |
| **Auto-Close Loops** | Open loops are automatically closed before starting a new path |
| **Position Tracking** | Tracks current cursor position for validation |
| **Tolerance Handling** | Uses 1e-6 tolerance for point comparison |

### Usage

```typescript
import { SafeSketcher, createSafeReplicad } from './lib/safeSketch';

// Option 1: Direct usage
const sketcher = new SafeSketcher(new replicad.Sketcher('XY'));
const solid = sketcher
  .movePointerTo([0, 0])
  .lineTo([10, 0])
  .lineTo([10, 10])
  .close()
  .extrude(5);

// Option 2: Factory (replaces Sketcher globally)
const safeReplicad = createSafeReplicad(replicad);
const sketcher2 = new safeReplicad.Sketcher('XY'); // Returns SafeSketcher
```

### Factory Function

`createSafeReplicad(replicad)` returns a modified replicad object where:
- `Sketcher` constructor returns `SafeSketcher` instances
- All other replicad APIs remain unchanged
- Used by the web worker to inject reliability layer into user code

## Future Enhancements

- [ ] Additional curve method wrappers (bezier, spline)
- [ ] Disjoint loop detection and handling
- [ ] Geometry validation before extrusion
