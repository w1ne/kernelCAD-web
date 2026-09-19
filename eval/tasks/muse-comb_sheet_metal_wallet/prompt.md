# comb_sheet_metal_wallet (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Create a multi-functional, credit-card-sized everyday carry (EDC) wallet comb with integrated utility features including a bottle opener and lanyard hole.

## Geometry and Dimensions
Approx. 85.0 mm × 54.0 mm × 1.2 mm.

## Material
Sheet Metal

## Manufacturing Method
Laser Cutting

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Everyday carry (EDC) in a standard wallet card slot; grooming; light utility tasks such as opening bottles.

## Structural Features
Credit-card footprint plate; comb teeth array on the long edge; lanyard hole; bottle opener cutout.

## Special Requirements
Must maintain standard credit card outer dimensions (85x54mm) to fit in a wallet. Outer corners must be filleted (4.0mm radius) to prevent snagging on fabric or leather.

## Planned Component Quantity
1

## Component Names
- wallet_comb_plate

## Adjustable Parameters
- **thickness**: 1.2 (0.8 ~ 2.0 mm). Determines the rigidity of the sheet metal and ensures it fits comfortably within a standard wallet slot without bending.
- **teeth_count**: 26 (15 ~ 40). Defines the density of the comb for different hair types.
- **tooth_width**: 1.4 (1.0 ~ 3.0 mm). Balances individual tooth strength against grooming comfort.
- **gap**: 1.5 (1.0 ~ 3.0 mm). Controls the spacing between teeth for hair passage and laser cutting clearance.
- **slit_length**: 18.0 (10.0 ~ 25.0 mm). Determines the effective combing depth along the edge of the plate.
- **slit_escape**: 4.0 (2.0 ~ 8.0 mm). Provides a stress-relief radius at the root of the comb teeth to prevent fatigue fracture.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. wallet_comb_plate
The main and only body of the EDC tool.
* **Component Purpose**: Serves as a monolithic multi-tool, integrating comb teeth via edge slits and utility cutouts (bottle opener, lanyard hole) into a single flat profile.
* **Assembly Direction**: None (Standalone part).
* **Connection & Kinematics**: None (Fully constrained as a single solid body).

---

## Component Assembly Graph (Textual)
* **wallet_comb_plate -> Standalone** | Joint: None | Note: Single-piece monolithic design; no assembly required.
