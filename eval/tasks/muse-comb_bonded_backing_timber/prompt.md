# comb_bonded_backing_timber (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a two-piece timber comb featuring a fine-tooth strip bonded to an ergonomic backing plate with an extended handle for personal grooming.

## Geometry and Dimensions
Approx. 213.0 mm × 58.0 mm × 4.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
Bonding (Glue)

## Mechanical Condition
Handheld personal care and grooming tool. Subject to bending forces and cantilever loads on the teeth during use.

## Structural Features
Tooth strip with embedded teeth; ergonomic backing plate with an extended handle.

## Special Requirements
Keep assembly split unchanged. Ensure mating faces (the top edge of the tooth strip and the bottom edge of the backing plate) are perfectly flush to maximize the surface area for bonding.

## Planned Component Quantity
2

## Component Names
- tooth_strip
- ergonomic_back_handle

## Adjustable Parameters
- **teeth_count**: 18 (10 ~ 40). Determines the total number of combing teeth; affects the overall length of the functional area.
- **tooth_width**: 3.4 (2.0 ~ 6.0 mm). Controls the thickness of individual teeth; must be large enough to prevent fracture during CNC milling and usage.
- **gap**: 2.8 (1.5 ~ 5.0 mm). Defines the spacing between teeth; constrained by the minimum tool radius of the CNC end mill.
- **tooth_length**: 28.0 (15.0 ~ 50.0 mm). Determines the penetration depth of the comb; longer teeth require careful feed rates during machining to avoid snapping.
- **strip_depth**: 8.0 (5.0 ~ 15.0 mm). The height of the continuous root bed that anchors the teeth before mating with the handle.
- **thickness**: 4.0 (3.0 ~ 10.0 mm). The global thickness of the timber stock used for both components.
- **back_depth**: 22.0 (15.0 ~ 40.0 mm). Defines the vertical height of the ergonomic backing plate, providing structural rigidity to the spine.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. tooth_strip
The functional grooming interface of the comb.
* **Component Purpose**: Provides the array of teeth for combing, embedded into a continuous root bed to distribute stress and prevent individual tooth failure.
* **Assembly Direction**: Coplanar, mates along its top edge (Y=8.0) to the backing plate.
* **Connection & Kinematics**: Bonding (Glue) (Fully constrained in all directions (permanent)). The top face of the root bed is glued to the bottom face of the ergonomic back handle.

### 2. ergonomic_back_handle
The structural support and user interface of the comb.
* **Component Purpose**: Acts as the rigid spine to support the tooth strip and extends horizontally past the teeth to form an ergonomic handle for the user.
* **Assembly Direction**: Coplanar, mates along its bottom edge (Y=8.0) to the tooth strip.
* **Connection & Kinematics**: Bonding (Glue) (Fully constrained in all directions (permanent)). The bottom face of the backing plate is glued to the top face of the tooth strip.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 2-component model:

* **tooth_strip -> ergonomic_back_handle** | Joint: Bonding (Glue) | Note: The top edge of the tooth strip's root bed is permanently bonded to the bottom edge of the ergonomic backing plate.
