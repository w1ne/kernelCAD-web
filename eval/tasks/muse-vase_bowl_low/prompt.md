# vase_bowl_low (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a low flower bowl vase with a wide mouth and shallow body, featuring a parametric profile capable of generating smooth or wavy aesthetic variations.

## Geometry and Dimensions
Approx. 116.0 mm × 116.0 mm × 142.0 mm.

## Material
PLA

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Static decorative display, suitable for holding lightweight items, dried flowers, or acting as a standalone aesthetic centerpiece.

## Structural Features
Single continuous shell; solid bottom base; hollow interior cavity; lofted outer and inner walls; top connecting ring.

## Special Requirements
The final sewed shape must remain a closed, watertight solid with consistent wall thickness to ensure printability without internal voids.

## Planned Component Quantity
1

## Component Names
- vase_body

## Adjustable Parameters
- **height**: 142.0 (120.0 ~ 222.0 mm). Controls the overall vertical dimension of the vase.
- **wall_thickness**: 3.0 (1.8 ~ 5.0 mm). Ensures structural integrity during FDM printing while maximizing internal volume; lower limit prevents fragile walls.
- **steps**: 12 (10.0 ~ 22.0). Determines the vertical resolution and number of cross-sectional layers used to loft the geometry.
- **profile_radius**: 58.0 (10.0 ~ 74.0 mm). Controls the radial extent of the vase profile at various heights to define the bowl's curvature.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Generate horizontal circular or wavy wire profiles for both the inner and outer boundaries based on the height steps.
2. Loft the outer wires to create the exterior surface and the inner wires to create the interior cavity.
3. Cap the bottom and bridge the top gap with a ruled surface.
4. Sew all surfaces together into a single valid solid body.

---

### 1. vase_body
The main and only entity of the model.
* **Component Purpose**: Acts as the decorative vessel, providing internal volume for contents while maintaining structural stability on a flat surface.
* **Assembly Direction**: Not applicable (Base component, built vertically along the +Z axis).
* **Connection & Kinematics**: Not applicable (Single solid body).

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 1-component model:

* **vase_body -> Standalone** | Joint: None | Note: Single continuous body; no assembly required.
