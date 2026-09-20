# comb_guard_sleeve_pla (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Design a handheld comb with an integrated tapered handle and a matching protective guard sleeve for the teeth, optimized for 3D printing and portable storage.

## Geometry and Dimensions
Approx. 180.0 mm × 31.0 mm × 8.0 mm.

## Material
PLA

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Snap-fit

## Mechanical Condition
Handheld personal care and grooming, with a protective cover for safe storage and transport to prevent tooth breakage.

## Structural Features
Comb with integrated handle and teeth; hollow protective guard sleeve.

## Special Requirements
Keep assembly split unchanged. The guard cavity must maintain a zero-overlap tolerance with the teeth to ensure proper friction/snap-fit retention.

## Planned Component Quantity
2

## Component Names
- Comb with handle
- Tooth guard sleeve

## Adjustable Parameters
- **teeth_count**: 18 (10 ~ 50). Determines the density and overall functional width of the comb head.
- **tooth_width**: 3.2 (1.5 ~ 5.0 mm). Affects the structural strength and flexibility of individual teeth.
- **gap**: 2.4 (1.0 ~ 5.0 mm). Controls the spacing between teeth for optimal hair passage.
- **tooth_length**: 28.0 (15.0 ~ 50.0 mm). Determines the combing depth and the required depth of the guard sleeve.
- **spine_depth**: 10.0 (5.0 ~ 20.0 mm). Provides structural rigidity to the comb head to withstand bending moments during use.
- **thickness**: 4.0 (2.0 ~ 8.0 mm). Overall thickness of the comb, ensuring sufficient stiffness for FDM printing.
- **handle_length**: 70.0 (50.0 ~ 120.0 mm). Provides an ergonomic grip length for handheld operation.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. Comb with handle
The main functional grooming tool.
* **Component Purpose**: Used for combing hair; features a tapered handle for ergonomic grip and an array of rounded teeth embedded into a rigid spine.
* **Assembly Direction**: Inserted downwards along the -Y axis into the tooth guard sleeve.
* **Connection & Kinematics**: Snap-fit (Fully constrained in all directions (locking)).

### 2. Tooth guard sleeve
The protective cover for the comb head.
* **Component Purpose**: Protects the comb teeth from mechanical damage and prevents snagging during transport. Features a custom cavity that exactly matches the teeth volume.
* **Assembly Direction**: Receives the comb from the +Y direction through the top mouth opening.
* **Connection & Kinematics**: Snap-fit (Fully constrained in all directions (locking)).

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 2-component model:

* **Comb with handle -> Tooth guard sleeve** | Joint: Snap-fit | Note: Comb teeth slide into the guard sleeve's internal cavity through the top mouth opening, locking in place via friction/snap-fit.
