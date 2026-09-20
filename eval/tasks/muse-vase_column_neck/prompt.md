# vase_column_neck (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Column vase with straight upper walls and a stable rounded base, designed as a decorative container.

## Geometry and Dimensions
Approx. 72.0 mm × 72.0 mm × 258.0 mm.

## Material
PLA

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Decorative container standing vertically on a flat surface, capable of holding lightweight or dry items.

## Structural Features
Hollow cylindrical body; stable rounded base; straight upper walls; uniform wall thickness; smooth or wave-textured lofted exterior.

## Special Requirements
Ensure the bottom cap, inner floor, lofted walls, and top ring are perfectly sewed to form a closed, watertight solid shell.

## Planned Component Quantity
1

## Component Names
- vase_body

## Adjustable Parameters
- **height**: 258.0 (198.0 ~ 338.0 mm). Determines the overall vertical extent of the vase.
- **wall_thickness**: 2.7 (1.5 ~ 4.7 mm). Defines the structural thickness of the vase walls, balancing material usage, print time, and rigidity.
- **steps**: 18 (12.0 ~ 28.0). Controls the vertical resolution and number of cross-sections used for lofting the profile.
- **profile_radius**: Variable (10.0 ~ 52.0 mm). Controls the radial extent of the vase profile at various height intervals to shape the rounded base and straight neck.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Generate the outer and inner wire profiles based on the interpolated radius points and wall thickness.
2. Loft the cross-sectional wires to create the inner and outer shell surfaces.
3. Cap the top and bottom with ruled surfaces and planar faces.
4. Sew all surfaces together into a single valid solid body.

---

### 1. vase_body
The main structural and aesthetic entity of the vase.
* **Component Purpose**: Acts as the primary container, providing the exterior aesthetic profile and the hollow interior volume.
* **Assembly Direction**: N/A (Standalone component).
* **Connection & Kinematics**: N/A (Single continuous solid body).

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 1-component model:

* **vase_body -> Standalone** | Joint: None | Note: Single continuous solid body; no assembly required.
