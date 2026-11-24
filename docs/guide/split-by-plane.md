# Split a body at a plane

`Shape.splitByPlane(normal, offset)` cuts one solid with the infinite plane
`dot(point, normal) = offset` and returns the two sides as ordinary Shapes:

```typescript
const [upper, lower] = box(40, 30, 20).splitByPlane([0, 0, 1], 8);
```

`upper` is the material where `dot(point, normal) >= offset`; `lower` is the
other side. The normal need not be unit length, so `[1, 1, 0], 20` is the plane
`x + y = 20`. A negative normal measures the same plane from the opposite
direction. The offset accepts a numeric `param()` reference, so the cut plane
can follow a parameter edit.

Both results are normal Shapes. Chain `.fillet()`, measure with
`.volume()` / `.boundingBox()`, export them, or combine them with another
body. A plane that does not pass through the body makes the empty half fail
with `feature.empty-result` at lower time; it never returns a phantom solid.

Use `split(other)` when the cutter is a finite Shape and you want the
intersection plus both leftovers as named parts. `splitByPlane` is the direct
operation for a half-space cut, such as removing a lid at a height or cutting a
part along a centre plane.
