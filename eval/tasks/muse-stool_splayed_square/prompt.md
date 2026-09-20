# stool_splayed_square (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a square stool with splayed legs and X-stretchers designed for wood-based assembly.

## Geometry and Dimensions
Approx. 320.0 mm × 320.0 mm × 446.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating.

## Structural Features
Seat panel; four splayed legs; two intersecting stretchers (X-stretcher layout).

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
7

## Component Names
- Seat panel
- Leg 01
- Leg 02
- Leg 03
- Leg 04
- Stretcher 01
- Stretcher 02

## Adjustable Parameters
- **seat_thickness**: 16.0 (10.0 ~ 30.0 mm). Determines the structural strength of the seat and provides adequate depth for the leg tenon sockets.
- **leg_height**: 430.0 (310.0 ~ 590.0 mm). Sets the overall seating height, strictly following ergonomic standards for stools.
- **tenon_height**: 8.0 (5.0 ~ 12.0 mm). Determines the insertion depth of the leg tenons into the seat panel.
- **seat_width**: 320.0 (230.0 ~ 410.0 mm). Defines the primary seating area width.
- **seat_depth**: 320.0 (230.0 ~ 410.0 mm). Defines the primary seating area depth.
- **leg_top_size**: 26.0 (18.0 ~ 36.0 mm). Defines the thickness of the leg at the top connection point to ensure joint stability.
- **leg_bottom_size**: 32.0 (24.0 ~ 44.0 mm). Defines the thickness of the leg at the floor contact point for load distribution.
- **tenon_size**: 9.5 (6.5 ~ 13.5 mm). Controls the cross-sectional size of the joint to balance tenon strength and mortise wall thickness.
- **stretcher_z**: 180.0 (130.0 ~ 260.0 mm). Sets the vertical position of the X-stretchers to optimize the bracing angle and leg clearance.
- **stretcher_bar_width**: 16.0 (12.0 ~ 22.0 mm). Ensures the cross-bracing has sufficient stiffness against bending.
- **stretcher_bar_thickness**: 10.0 (8.0 ~ 14.0 mm). Maintains the structural integrity of the stretcher while preventing interference at the X-intersection.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. Seat Panel
The central hub and primary interaction surface of the stool.
* **Component Purpose**: Acts as the main load-bearing base and provides localization references and mechanical interfaces (sockets) for the four splayed legs.
* **Assembly Direction**: Fixed base component, positioned at absolute $Z = leg\_height$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). The bottom face features four square sockets to receive the leg tenons.

### 2~5. Four Legs (Leg 01, Leg 02, Leg 03, Leg 04)
The supporting entities of the stool.
* **Component Purpose**: Vertical and lateral support. Transfers the seat load to the ground, utilizing a splayed angle to ensure anti-overturning stability.
* **Assembly Direction**: Inserted upwards along the splayed axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). The top features a tenon that interference-fits into the seat panel. The mid-section features mortises to receive the stretcher tenons.

### 6~7. Stretchers (Stretcher 01, Stretcher 02)
The cross-bracing structure of the stool.
* **Component Purpose**: Connects the legs diagonally in an X-pattern to prevent splaying under load and drastically increase the overall structural rigidity of the frame.
* **Assembly Direction**: Inserted horizontally/diagonally between opposite pairs of legs.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends feature tenons that insert into the corresponding mid-section mortises of the legs.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 7-component model:

* **Leg 01 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 1.
* **Leg 02 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 2.
* **Leg 03 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 3.
* **Leg 04 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 4.
* **Stretcher 01 -> Leg 01 & Leg 04** | Joint: interlocking | Note: Stretcher ends inserted into the mid-section mortises of opposite legs.
* **Stretcher 02 -> Leg 02 & Leg 03** | Joint: interlocking | Note: Stretcher ends inserted into the mid-section mortises of the other pair of opposite legs.
* **Seat Panel -> All Legs** | Joint: Support Base | Note: Acts as the core hub; all connection sockets generated via boolean cut.
