# vase_lantern_soft (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a lantern-shaped decorative vase with a rounded midsection, short neck, and a hollow internal cavity for floral display.

## Geometry and Dimensions
Approx. 100.0 mm × 100.0 mm × 196.0 mm.

## Material
PLA

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Static decorative display, resting vertically on a flat surface.

## Structural Features
Hollow lantern-shaped body; closed bottom base; open top neck; continuous thin-wall shell.

## Special Requirements
The model must remain a closed, manifold solid (watertight) to ensure proper slicing and potential liquid containment.

## Planned Component Quantity
1

## Component Names
- vase_body

## Adjustable Parameters
- **height**: 196.0 (136.0 ~ 276.0 mm). Controls the overall vertical extent of the vase.
- **wall_thickness**: 2.6 (1.5 ~ 4.6 mm). Determines the shell thickness, ensuring adequate structural integrity and printability without excessive material use.
- **steps**: 14 (10.0 ~ 24.0). Defines the vertical resolution and the number of lofting sections used to generate the smooth curved profile.
- **profile_radius**: 50.0 (10.0 ~ 66.0 mm). Controls the radial bounds of the vase's midsection and neck, dictating the volumetric capacity and lantern-like curvature.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Generate the outer and inner circular wire profiles based on the interpolated radius function along the Z-axis.
2. Loft the outer wires to create the exterior surface and the inner wires to create the interior cavity.
3. Cap the bottom with planar faces and connect the top edges using a ruled surface.
4. Sew all surfaces together into a single watertight solid.

---

### 1. vase_body
The primary and only structural entity of the model.
* **Component Purpose**: Acts as the main decorative shell and containment vessel.
* **Assembly Direction**: Standalone component, built vertically along the +Z axis.
* **Connection & Kinematics**: Not applicable (Single continuous body).

---

## Component Assembly Graph (Textual)
vase_body -> Standalone | Joint: None | Note: Single-piece monolithic design without physical assembly interfaces.
