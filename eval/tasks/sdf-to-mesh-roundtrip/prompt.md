# SDF → mesh roundtrip

Materialize a sphere of radius 8 mm at resolution 20, then return it.

This task verifies the materialize → standard-pipeline escape works
end-to-end. Downstream STL export and bbox measurement should approximate
the sphere within marching-cubes faceting error (±1 mm).

- `sdf.sphere(8)`, resolution 20.
- Return the materialized `Shape`.
