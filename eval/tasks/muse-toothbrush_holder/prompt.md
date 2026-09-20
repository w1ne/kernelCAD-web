# toothbrush_holder (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a parametric toothbrush holder with a hollow internal cavity and integrated drainage cutouts for moisture-resistant bathroom storage.

## Geometry and Dimensions
Approx. 200.0 mm × 100.0 mm × 80.0 mm.

## Material
ABS

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Static load-bearing storage for lightweight items (toothbrushes, toothpaste) in a moisture-rich environment.

## Structural Features
Hollow curved main body; two cylindrical drainage holes; two spherical relief cutouts.

## Special Requirements
Ensure the boolean difference cutters (cylinders and spheres) fully intersect the inner hollow cavity to guarantee unobstructed water drainage.

## Planned Component Quantity
1

## Component Names
- toothbrush_holder_body

## Adjustable Parameters
- **body_length**: 200 (100.0 ~ 280.0 mm). Controls the overall width and storage capacity of the holder.
- **body_height**: 80 (40.0 ~ 140.0 mm). Determines the vertical depth of the storage slot to prevent tall items from tipping over.
- **body_depth**: 100 (50.0 ~ 180.0 mm). Controls the front-to-back footprint and extrusion depth of the holder.
- **wall_offset**: 6 (3.0 ~ 16.0 mm). Defines the wall thickness to ensure structural rigidity during FDM printing.
- **hole_radius**: 15 (8.0 ~ 28.0 mm). Sizes the cylindrical drainage holes to allow water escape without letting toothbrushes slip through.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main hollow profile using a boundary surface between the inner rectangular slot and the outer bezier curve chain.
2. Extrude the surface along the Y-axis to form the main body.
3. Execute boolean difference operations using positioned cylinders and spheres to create the drainage and relief features.

---

### 1. toothbrush_holder_body
The primary and sole structural entity of the model.
* **Component Purpose**: Acts as the main storage receptacle, providing physical containment for toothbrushes while allowing water to drain through the bottom cutouts.
* **Assembly Direction**: Not applicable (Standalone component).
* **Connection & Kinematics**: Not applicable (Single solid body).

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 1-component model:

* **toothbrush_holder_body -> World/Ground** | Joint: Support Base | Note: Standalone single-piece design; no internal assembly joints.
