# bookshelf (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a multi-tier wooden bookshelf designed for load-bearing storage, utilizing a modular board-and-slat architecture with dowel-based assembly.

## Geometry and Dimensions
Approx. 600.0 mm × 280.0 mm × 1200.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
Nailing

## Mechanical Condition
Load-bearing storage for books and household items.

## Structural Features
Four vertical uprights; horizontal side rails (bottom, top, and intermediate tiers); horizontal shelf slats.

## Special Requirements
Keep assembly split unchanged. Ensure all dowel hole alignments remain strictly coaxial between mating parts.

## Planned Component Quantity
44

## Component Names
- right_front_upright
- right_back_upright
- left_front_upright
- left_back_upright
- right_bottom_rail
- left_bottom_rail
- right_top_rail
- left_top_rail
- tier_1_left_rail
- tier_1_right_rail
- tier_1_slat_01 to tier_1_slat_07
- tier_2_left_rail
- tier_2_right_rail
- tier_2_slat_01 to tier_2_slat_07
- tier_3_left_rail
- tier_3_right_rail
- tier_3_slat_01 to tier_3_slat_07
- tier_4_left_rail
- tier_4_right_rail
- tier_4_slat_01 to tier_4_slat_07

## Adjustable Parameters
- **shelf_width**: 600.0 (400.0 ~ 900.0 mm). Determines the overall width of the bookshelf and the span of the horizontal slats.
- **shelf_depth**: 280.0 (200.0 ~ 400.0 mm). Controls the footprint depth and determines the maximum number of slats per tier.
- **shelf_height**: 1200.0 (800.0 ~ 1800.0 mm). Sets the total vertical height and influences the spacing between tiers.
- **num_tiers**: 4 (2.0 ~ 6.0). Defines the number of intermediate storage levels (shelves) excluding the top and bottom structural rails.
- **board_thickness**: 10.0 (6.0 ~ 16.0 mm). Defines the material thickness for all uprights, rails, and slats, ensuring adequate structural rigidity.
- **board_width**: 30.0 (20.0 ~ 45.0 mm). Determines the width of the structural framing members and individual shelf slats.
- **slat_gap**: 7.0 (3.0 ~ 12.0 mm). Controls the spacing between adjacent slats on a tier to optimize material usage and aesthetics.
- **hole_radius**: 1.0 (0.5 ~ 3.0 mm). Sets the radius of the blind holes used for the dowel pins.
- **hole_depth**: 3.0 (1.0 ~ 8.0 mm). Determines the insertion depth of the dowel pins into the timber boards to ensure joint stability.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1~4. Uprights (Right Front, Right Back, Left Front, Left Back)
The primary vertical supports of the bookshelf.
* **Component Purpose**: Vertical structural support. Transfers the load of the shelves and stored items to the ground.
* **Assembly Direction**: Vertical base components, positioned along the Z-axis.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features blind holes on the inner Y-faces to receive the horizontal rails at the bottom, top, and all intermediate tier levels.

### 5~8. Bottom and Top Rails (Right & Left)
The outer horizontal framing members.
* **Component Purpose**: Structural framing. Connects the front and back uprights at the extreme top and bottom to prevent racking and ensure frame rigidity.
* **Assembly Direction**: Inserted horizontally along the Y-axis between the front and back uprights.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features dowel holes on the -Y and +Y end faces mating with the uprights.

### 9~16. Tier Rails (Left & Right for Tiers 1 to 4)
The intermediate horizontal supports for the shelves.
* **Component Purpose**: Load-bearing supports that connect the uprights at specific heights and provide a resting base and alignment interface for the shelf slats.
* **Assembly Direction**: Inserted horizontally along the Y-axis between the front and back uprights.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features holes on the end faces for upright connection, and upward-facing holes on the +Z face to align and secure the slats.

### 17~44. Shelf Slats (Tiers 1 to 4, Slats 01 to 07)
The horizontal surfaces of the bookshelf.
* **Component Purpose**: Forms the distributed load-bearing surface of the shelves for storing items.
* **Assembly Direction**: Placed downwards along the -Z axis onto the tier rails.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features blind holes on the bottom (-Z) face at each end to align with the corresponding holes on the tier rails.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 44-component model:

* **Bottom Rails -> Uprights** | Joint: Dowel Joint | Note: Rail ends connect to the inner faces of the front and back uprights at the base.
* **Top Rails -> Uprights** | Joint: Dowel Joint | Note: Rail ends connect to the inner faces of the front and back uprights at the top.
* **Tier Rails -> Uprights** | Joint: Dowel Joint | Note: Rail ends connect to the inner faces of the front and back uprights at evenly distributed Z-heights.
* **Shelf Slats -> Tier Rails** | Joint: Dowel Joint | Note: Slat bottom faces connect to the top faces of the left and right tier rails via dowel pins.
