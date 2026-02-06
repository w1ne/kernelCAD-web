# CAD Query Guide for kernelCAD

kernelCAD supports a "CAD Query" style of modeling, inspired by the library of the same name. This approach uses **selectors** to identify geometric entities (faces, edges, vertices) based on their properties, rather than volatile indices.

## Why use CAD Query?

In traditional "index-based" modeling, you might select "Face 12". However, if you change a parameter earlier in the history (e.g., adding a hole), "Face 12" might become "Face 15" or disappear entirely. This is called the **Topological Naming Problem**.

**Selectors** solve this by using geometric intent:
- Instead of "Face 12", use "The top-most face" (`>Z`).
- Instead of "Edge 5", use "All vertical edges" (`|Z`).

## Using Selectors in kernelCAD

### Basic Selectors

kernelCAD uses the Replicad selector engine. Here are common strings:

| Selector | Meaning |
| --- | --- |
| `>Z` | The face/edge with the maximum Z coordinate (the "top"). |
| `<X` | The face/edge with the minimum X coordinate. |
| `|Z` | Entities parallel to the Z axis. |
| `#X` | Entities perpendicular to the X axis. |

### Example: Selector-based Fillet

```javascript
const box = replicad.makeBox(10, 10, 10);

// Traditional (Fragile):
// const f0 = box.fillet(1, box.faces[0]);

// CAD Query Style (Robust):
const f1 = box.fillet(1, box.faces(">Z")); // Fillet the top face
const f2 = f1.fillet(0.5, f1.edges("|Z")); // Fillet all vertical edges

return f2;
```

### Advanced Selection

You can combine selectors or use function-based selection:

```javascript
// Multiple selectors
const topAndBottom = shape.faces(">Z or <Z");

// Selection by area
const largeFaces = shape.faces((f) => f.area > 50);
```

## Available Helpers

In the kernelCAD environment, several helpers are provided to make this easier:

- `select(shape, query, type)`: A generic selection helper.
- `fillet(shape, radius, selector)`: Robust filleting.
- `chamfer(shape, distance, selector)`: Robust chamfering.

### Example with Helpers

```javascript
const box = replicad.makeBox(10, 10, 10);
const filleted = fillet(box, 1, ">Z");
return filleted;
```

## Best Practices
1. **Prefer Selectors for Parametric Designs**: Always use selectors if you plan to change dimensions later.
2. **Combine with Datum Planes**: For complex alignments, create a stable `Plane` from a selected face.
