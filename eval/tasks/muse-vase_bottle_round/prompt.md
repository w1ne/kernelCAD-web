# vase_bottle_round (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a bottle-style vase with a round belly and a long slender neck, designed as a freestanding decorative container.

## Geometry and Dimensions
Approx. 88.0 mm × 88.0 mm × 248.0 mm.

## Material
PLA

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Freestanding decorative object, capable of holding lightweight items (e.g., dried or artificial flowers) and supporting its own weight.

## Structural Features
Continuous outer shell; hollow interior cavity; closed bottom base; open top neck.

## Special Requirements
The model must remain a single, continuous, closed solid shell to ensure proper slicing and structural integrity during the 3D printing process.

## Planned Component Quantity
1

## Component Names
- vase_body

## Adjustable Parameters
- **height**: 248.0 (188.0 ~ 328.0 mm). Controls the overall vertical extent of the vase.
- **wall_thickness**: 2.4 (1.5 ~ 4.4 mm). Determines the thickness of the vase shell, ensuring structural stability and printability without excessive material use.
- **steps**: 18 (12.0 ~ 28.0). Defines the vertical resolution and the number of lofting sections used to generate the smooth or wavy profile.
- **profile_radius**: 44.0 (10.0 ~ 60.0 mm). Controls the radial extent of the belly and neck at various height fractions to shape the vase's silhouette.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Generate the outer and inner wire profiles based on the interpolated radius points and wall thickness.
2. Loft the wires to create the inner and outer shells.
3. Cap the bottom and connect the top ring to form a single sewed solid body.

---

### 1. vase_body
The main and only structural body of the vase.
* **Component Purpose**: Acts as the decorative outer shell and internal container for holding items.
* **Assembly Direction**: N/A (Manufactured in place vertically along the +Z axis from the base).
* **Connection & Kinematics**: N/A (Single continuous body).

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 1-component model:

* **vase_body -> Standalone** | Joint: N/A | Note: Single continuous body, no assembly required.
