# handless_comb (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a parametric handless comb for personal hair grooming, featuring an ergonomic curved grip, a continuous spine, and evenly spaced teeth.

## Geometry and Dimensions
Approx. 3.0 mm × 35.0 mm × 65.0 mm.

## Material
Resin

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Handheld personal care; experiences mild cantilever bending forces on the teeth and spine during hair detangling.

## Structural Features
Curved handle section; main spine; standard inner teeth; reinforced start and end teeth.

## Special Requirements
The fillet radius on the teeth and spine must be dynamically constrained (`effective_corner_radius`) to prevent self-intersecting geometry on narrow cross-sections.

## Planned Component Quantity
1

## Component Names
- comb_body

## Adjustable Parameters
- **comb_width**: 3 (1.5 ~ 8.0 mm). Determines the overall thickness of the comb and the cross-sectional thickness of the teeth.
- **hand_part_width**: 6 (3.0 ~ 16.0 mm). Controls the base width of the handle section for grip stability.
- **teeth_count**: 20 (8 ~ 40). Defines the total number of teeth, directly impacting the combing resolution.
- **teeth_gap_distance**: 3 (1.0 ~ 8.0 mm). Sets the pitch (spacing) between each tooth, determining the density of the comb.
- **teeth_height**: 1 (0.5 ~ 4.0 mm). The vertical offset of the standard inner teeth relative to the spine base.
- **teeth_length**: 20 (8.0 ~ 40.0 mm). The functional length of the standard teeth for penetrating hair.
- **teeth_length_2**: 6 (3.0 ~ 16.0 mm). Defines the depth of the main spine section that supports the teeth array.
- **start_and_end_teeth_height**: 4 (1.0 ~ 12.0 mm). The extended height of the reinforced boundary teeth at both ends of the comb to protect inner teeth and guide hair.
- **hand_part_bending_level**: 8 (2.0 ~ 20.0 mm). Controls the maximum deviation of the spline curve on the handle, ensuring ergonomic contouring.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the handle profile using line segments and a controlled spline, then extrude.
2. Build the main spine by extruding a rounded rectangular profile along the Z-axis.
3. Generate the teeth array by extruding rounded profiles at specified intervals, applying different heights for boundary vs. inner teeth.
4. Boolean fuse all generated bodies (handle, spine, and teeth) into a single monolithic solid.

---

### 1. comb_body
The sole structural and functional entity of the model.
* **Component Purpose**: Acts as a unified grooming tool, providing both the ergonomic grip surface and the functional teeth array for hair detangling.
* **Assembly Direction**: N/A (Single monolithic component).
* **Connection & Kinematics**: Not applicable (Monolithic body; all features are rigidly fused during the CAD boolean operations).

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 1-component model:

* **comb_body** | Joint: None | Note: Monolithic part; handle, spine, and teeth are fused into a single continuous solid body.
