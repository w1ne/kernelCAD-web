# Replicad Sketcher API Research

**Date**: 2026-01-26  
**Purpose**: Document Replicad's Sketcher API for v0.5.0 implementation

---

## Summary

Based on web search and existing code analysis, Replicad provides a fluent Sketcher API for creating 2D shapes that can be extruded into 3D solids.

---

## Sketcher API Overview

### Creating a Sketch

**Basic Pattern**:
```javascript
const sketch = new Sketcher(plane?)
  .movePointerTo([x, y])
  .lineTo([x, y])
  .close();
```

**Planes** (optional):
- `'XY'` - Standard top view
- `'XZ'` - Front view
- `'YZ'` - Side view
- Omit for default (XY)

### Available Drawing Methods

#### Lines
- `lineTo([x, y])` - Draw line to absolute position
- `line(length, angle)` - Draw line with polar coordinates
- `hLine(length)` - Horizontal line (current implementation uses this)
- `vLine(length)` - Vertical line (current implementation uses this)
- `polarLine(length, angle)` - Draw at specific angle

#### Arcs & Curves
- `threePointsArcTo([x1, y1], [x2, y2])` - Arc through 3 points
- `sagittaArcTo([x, y], sagitta)` - Arc with height
- `tangentArcTo([x, y])` - Tangent arc
- `ellipseTo([x, y], [rx, ry])` - Elliptical arc
- `bezierCurveTo(points)` - Bezier curve
- `quadraticBezierCurveTo(cp, end)` - Quadratic bezier
- `cubicBezier CurveTo(cp1, cp2, end)` - Cubic bezier
- `smoothSpline(points)` - Smooth spline through points

#### Pre-made Shapes (Convenience Functions)
```javascript
import { sketchRectangle, sketchCircle, sketchEllipse } from 'replicad';

const rect = sketchRectangle(length, width);
const roundedRect = sketchRoundedRectangle(length, width, fillet);
const circle = sketchCircle(radius);
const ellipse = sketchEllipse(xRadius, yRadius);
```

#### Closing & Modifiers
- `close()` - Close path back to start
- `customCorner(radius)` - Apply fillet to sharp corner
- `customCorner(radius, 'chamfer')` - Apply chamfer instead

### Placing Sketches in 3D

**Method 1**: Sketch directly on plane
```javascript
const sketch = new Sketcher('XY')  // Already on XY plane
  .lineTo([10, 0])
  .close();
```

**Method 2**: Draw, then place later
```javascript
import { draw, makePlane } from 'replicad';

const shape2D = draw()
  .lineTo([10, 0])
  .close();

const myPlane = makePlane('XZ');  // or custom plane
const sketch3D = shape2D.sketchOnPlane(myPlane);
```

---

## Extrusion to 3D

### Basic Extrude

```javascript
const solid = sketch.extrude(distance);
```

**Parameters**:
- `distance`: Number - Height/depth to extrude
- Direction is normal to the sketch plane

**Example** (from current code):
```javascript
const base = new Sketcher()
  .hLine(40)
  .vLine(40)
  .hLine(-40)
  .close()
  .extrude(20);  // Extrude 20mm
```

### Extrude Options (if supported)

```javascript
// May support additional options (needs verification):
sketch.extrude(distance, {
  direction: 'reversed',  // Extrude in opposite direction
  both: true,             // Extrude in both directions
})
```

---

## Current kernelCAD Implementation

### Default Template (src/lib/geometryEngine.ts)

```javascript
const { Sketcher } = replicad;

function drawPart() {
  const base = new Sketcher()
    .hLine(40)      // Horizontal line 40mm
    .vLine(40)      // Vertical line 40mm
    .hLine(-40)     // Horizontal line -40mm (back to start)
    .close()        // Close the square
    .extrude(20);   // Extrude to 20mm height

  const filleted = base.fillet(2);  // Apply 2mm fillet
  const cyl = replicad.makeCylinder(10, 30).translate(0, 0, 10);
  
  return [filleted.cut(cyl)];
}
```

**Observations**:
- ✅ Sketcher is already imported and working
- ✅ Basic h/vLine methods work
- ✅ Extrude is straightforward
- ✅ Can chain operations (sketch → extrude → fillet → cut)

---

## Proof of Concept Tests

### Test 1: Rectangle Sketch

```javascript
const rect = new Sketcher('XY')
  .movePointerTo([0, 0])
  .lineTo([10, 0])
  .lineTo([10, 20])
  .lineTo([0, 20])
  .close()
  .extrude(5);
```

**Expected Result**: 10×20×5mm box

### Test 2: Circle Sketch (if sketchCircle available)

```javascript
import { sketchCircle } from 'replicad';

const circle = sketchCircle(10)  // Radius 10
  .extrude(5);
```

**Expected Result**: Cylinder with radius 10, height 5

### Test 3: Multiple Entities

```javascript
// Need to verify if multiple disconnected entities work
const sketch = new Sketcher('XY')
  // First rectangle
  .movePointerTo([0, 0])
  .lineTo([5, 0])
  .lineTo([5, 5])
  .lineTo([0, 5])
  .close()
  // Second circle (separate)
  .movePointerTo([15, 0])
  .circle(3);  // May not work - needs testing
```

**Question**: Can a single sketch contain multiple closed paths?

---

## Findings & Recommendations

### ✅ What Works
1. **Basic Sketcher API** is functional and already integrated
2. **Extrude operation** is simple and well-documented
3. **Chainable fluent API** makes code generation straightforward
4. **Plane selection** works (`new Sketcher('XY')`)

### ⚠️ Needs Verification
1. **Convenience functions** (sketchRectangle, sketchCircle) - are they imported?
2. **Multiple paths** in single sketch - supported or need separate sketches?
3. **Extrude options** - direction, both sides, taper
4. **Sketch constraints** - does Replicad have any built-in constraint solving?

### Code Generation Strategy

**For MVP (v0.5.0)**:
```typescript
// User draws rectangle in UI
const entities = [
  { type: 'rectangle', corner: [0, 0], width: 10, height: 20 }
];

// Generate code:
const code = `
const sketch1 = new Sketcher('XY')
  .movePointerTo([0, 0])
  .lineTo([10, 0])
  .lineTo([10, 20])
  .lineTo([0, 20])
  .close();
`;

// Then for extrude:
const extrudeCode = `
const extruded1 = sketch1.extrude(5);
`;
```

**Advantages**:
- Simple code generation
- Matches Replicad's fluent API
- Easy to read and modify manually

---

## Next Steps

1. **Create prototype** in current codebase:
   - Modify default code to test different sketch patterns
   - Verify circle/arc methods work
   - Test multiple sketches in same drawPart()

2. **Validate assumptions**:
   - Can we use sketchCircle()?
   - Do we need to import it separately?
   - Test error handling for invalid sketches

3. **Design code generator**:
   - Map UI entities → Replicad methods
   - Handle coordinate transformations
   - Generate clean, readable code

---

## References

- Replicad GitHub: https://github.com/sgenoud/replicad
- Web search findings: Comprehensive Sketcher API with multiple drawing primitives
- Current implementation: Working sketch → extrude in defaultCode

---

**Status**: Research Complete  
**Next**: Create proof-of-concept sketches in browser
