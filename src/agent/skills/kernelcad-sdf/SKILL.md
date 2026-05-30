---
name: kernelcad-sdf
description: DEPRECATED — renamed to kernelcad-fields. This alias is removed in the next minor version.
---

# kernelcad-sdf (deprecated alias)

This skill was renamed to **`kernelcad-fields`** to free the "SDF" abbreviation
for upcoming Gazebo SDFormat export. Load `kernelcad-fields` instead.

Public API is unchanged: `sdf.sphere`, `sdf.box`, `sdf.materialize`, the
`SdfField` type, and the `evaluate_sdf` MCP tool all keep their existing names.

This alias will be removed in the next minor version. Update any references
that load `kernelcad-sdf` to load `kernelcad-fields` directly.
