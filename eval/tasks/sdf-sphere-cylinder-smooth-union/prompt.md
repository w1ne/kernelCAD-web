# SDF sphere ∪ cylinder (smooth union)

Smoothly blend a sphere of radius 10 mm with a cylinder of radius 4 mm and
height 24 mm (axis +Z), using `sdf.smoothBlend` with `k = 3 mm`. Materialize
at resolution 30. Return the materialized `Shape`.

Demonstrates `smoothBlend` on differing primitive types.

- Sphere: `sdf.sphere(10)`.
- Cylinder: `sdf.cylinder(4, 24)`.
- Blend: `sdf.smoothBlend(sphere, cylinder, 3)`.
- Resolution: 20.
