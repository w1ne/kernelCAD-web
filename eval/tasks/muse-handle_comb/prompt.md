# handle_comb (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a handheld grooming comb featuring an ergonomically lofted handle and evenly spaced teeth for hair detangling and styling.

## Geometry and Dimensions
Approx. 3.0 mm × 26.0 mm × 137.0 mm.

## Material
Resin

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Handheld manual grooming; the teeth experience mild cantilever bending forces during use, while the handle requires ergonomic grip stability.

## Structural Features
Ergonomic lofted handle; solid structural spine; evenly spaced middle teeth; reinforced start and end teeth.

## Special Requirements
The lofted handle must transition smoothly into the spine without non-manifold edges. The surface finish must be smooth to prevent hair snagging, making SLA printing the optimal choice.

## Planned Component Quantity
1

## Component Names
- comb_body

## Adjustable Parameters
- **comb_width**: 3 (1.5 ~ 8.0 mm). Controls the overall thickness and baseline rigidity of the comb.
- **handle_length**: 80 (40.0 ~ 120.0 mm). Determines the length of the ergonomic grip area to accommodate different hand sizes.
- **teeth_count**: 20 (8 ~ 40). Defines the density and the total functional length of the combing section.
- **teeth_gap_distance**: 3 (1.0 ~ 8.0 mm). Sets the spacing between teeth, dictating whether it functions as a fine-tooth or wide-tooth comb.
- **teeth_height**: 1 (0.5 ~ 4.0 mm). Controls the individual thickness of the middle teeth, balancing flexibility and strength.
- **teeth_length**: 20 (8.0 ~ 40.0 mm). Determines how deep the comb can penetrate hair layers.
- **spine_length**: 6 (3.0 ~ 16.0 mm). Provides the structural backing required to support the teeth and prevent snapping under bending loads.

## Component Details

**Global Output Requirements**
1. The component must remain an independent, fully fused geometric body.
2. The exported STEP must remain a closed solid without internal intersecting faces.

**Global Modeling Steps**
1. Generate the lofted handle using the scaled profile sections.
2. Extrude the main spine along the Z-axis.
3. Generate the array of teeth, applying specific heights to the start and end teeth for reinforcement.
4. Boolean union all solids (handle, spine, teeth) and merge coplanar faces to form a single monolithic body.

---

### 1. comb_body
The single monolithic entity representing the entire comb.
* **Component Purpose**: Acts as both the ergonomic grip interface (handle) and the functional grooming interface (teeth and spine).
* **Assembly Direction**: N/A (Single independent component).
* **Connection & Kinematics**: Not applicable (Monolithic body with 0 Degrees of Freedom internally).

---

## Component Assembly Graph (Textual)
* **comb_body -> Self** | Joint: None | Note: Fused monolithic structure generated via boolean union of handle, spine, and teeth.
