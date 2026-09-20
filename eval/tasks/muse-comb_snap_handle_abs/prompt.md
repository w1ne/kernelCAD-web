# comb_snap_handle_abs (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a two-part modular comb with a detachable handle, designed for rapid prototyping and assembly via an integrated locking mechanism.

## Geometry and Dimensions
Approx. 205.0 mm × 38.0 mm × 6.0 mm.

## Material
ABS

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Snap-fit

## Mechanical Condition
Handheld personal grooming tool, subject to light cantilever bending loads and shear forces during hair combing.

## Structural Features
Comb head with integrated teeth and spine; tapered ergonomic handle.

## Special Requirements
Keep assembly split unchanged. Ensure the retention bumps and recesses maintain appropriate tolerances to allow for elastic deformation during the snap-fit insertion.

## Planned Component Quantity
2

## Component Names
- snap_comb_head
- snap_handle_frame

## Adjustable Parameters
- **teeth_count**: 20 (10 ~ 40). Determines the combing density and the overall width of the comb head.
- **tooth_width**: 3.0 (1.5 ~ 5.0 mm). Ensures individual tooth strength against bending and snapping.
- **gap**: 2.3 (1.0 ~ 5.0 mm). Controls the spacing between teeth for optimal hair passage.
- **tooth_length**: 28.0 (15.0 ~ 50.0 mm). Defines the effective combing depth.
- **spine_depth**: 10.0 (5.0 ~ 20.0 mm). Provides structural rigidity to the comb head base to prevent bowing.
- **thickness**: 4.0 (2.0 ~ 8.0 mm). Overall thickness of the comb and handle, balancing stiffness and material usage.
- **handle_len**: 88.0 (50.0 ~ 150.0 mm). Ergonomic length for user grip and leverage.
- **tenon_len**: 18.0 (10.0 ~ 40.0 mm). Insertion depth for the snap-fit joint to ensure mechanical stability and prevent wobble.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. snap_comb_head
The functional grooming interface of the assembly.
* **Component Purpose**: Acts as the primary tool for combing, featuring 20 rounded teeth and a locking tenon with top and bottom retention bumps for secure attachment.
* **Assembly Direction**: Inserted horizontally along the +X axis into the handle frame.
* **Connection & Kinematics**: Snap-fit (Fully constrained in all directions (locking)). The extended tenon features cylindrical bumps that act as the male locking mechanism.

### 2. snap_handle_frame
The structural grip entity of the assembly.
* **Component Purpose**: Provides an ergonomic, tapered grip for the user. It contains the female mating geometry to securely anchor the comb head.
* **Assembly Direction**: Receives the comb head along the -X axis (fixed base relative to the head's insertion).
* **Connection & Kinematics**: Snap-fit (Fully constrained in all directions (locking)). Features an exact-size mortise with internal cylindrical recesses generated via boolean cut to capture the comb head's retention bumps.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 2-component model:

* **snap_comb_head -> snap_handle_frame** | Joint: Snap-fit | Note: Comb head tenon with retention bumps inserts into the handle's mortise and locks into the internal recesses.
