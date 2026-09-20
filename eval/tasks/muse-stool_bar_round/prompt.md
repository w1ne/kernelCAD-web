# stool_bar_round (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a tall round bar stool with mortise-and-tenon footrest rails designed for wood-based assembly.

## Geometry and Dimensions
Approx. 320.0 mm × 320.0 mm × 760.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating (elevated bar stool posture) with footrest load-bearing requirements.

## Structural Features
Round seat panel; four tapered round legs; four footrest stretchers.

## Special Requirements
Keep assembly split unchanged. The exported STEP must remain a closed solid.

## Planned Component Quantity
9

## Component Names
- seat_panel
- leg_01
- leg_02
- leg_03
- leg_04
- stretcher_01
- stretcher_02
- stretcher_03
- stretcher_04

## Adjustable Parameters
- **seat_thickness**: 18.0 (10.0 ~ 32.0 mm). Ensures adequate load-bearing capacity and provides sufficient depth for the leg tenon sockets.
- **leg_height**: 742.0 (622.0 ~ 902.0 mm). Determines the overall seating height, strictly following ergonomic standards for bar stools.
- **tenon_height**: 9.0 (6.0 ~ 13.0 mm). Determines the bite depth of the physical connections between the legs and the seat panel.
- **seat_radius**: 160.0 (120.0 ~ 205.0 mm). Defines the seating area; constrained to prevent tipping caused by an unbalanced top-heavy ratio.
- **leg_top_radius**: 11.0 (8.0 ~ 16.0 mm). Defines the upper thickness of the leg, ensuring enough material to form the top tenon.
- **leg_bottom_radius**: 14.0 (10.0 ~ 20.0 mm). Defines the base footprint of the leg, providing anti-overturning stability.
- **tenon_radius**: 5.0 (4.0 ~ 8.0 mm). Controls the thickness of the connection joint to prevent shear failure.
- **stretcher_z**: 304.0 (254.0 ~ 384.0 mm). Sets the vertical placement of the footrest rails for ergonomic comfort and structural bracing.
- **stretcher_bar_width**: 15.0 (11.0 ~ 21.0 mm). Ensures the footrest can withstand vertical stepping loads.
- **stretcher_bar_thickness**: 10.0 (8.0 ~ 14.0 mm). Provides horizontal stiffness to the stretcher rails.

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
The central hub and top surface of the stool.
* **Component Purpose**: Acts as the main load-bearing base for seating and provides localization references and mechanical interfaces (sockets) for the four legs.
* **Assembly Direction**: Fixed base component, positioned at absolute $Z = leg\_height$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). The bottom face features four circular sockets arranged radially.

### 2~5. Four Legs (leg_01, leg_02, leg_03, leg_04)
The primary vertical supporting entities of the stool.
* **Component Purpose**: Transfers the seat load to the ground. Features a tapered round profile for aesthetics and stability. Contains side mortises to receive the stretchers.
* **Assembly Direction**: Inserted upwards along the +Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). The top features a round tenon that fits into the seat panel. The sides feature angled mortises to connect with the stretchers.

### 6~9. Four Stretchers (stretcher_01, stretcher_02, stretcher_03, stretcher_04)
The horizontal bracing and footrest entities.
* **Component Purpose**: Connects the legs together to prevent splaying under load and provides an ergonomic resting place for the user's feet.
* **Assembly Direction**: Inserted horizontally between the legs at height `stretcher_z`.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends feature oriented tenons that insert into the side mortises of the corresponding legs.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 9-component model:

* **leg_01 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's bottom socket 1.
* **leg_02 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's bottom socket 2.
* **leg_03 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's bottom socket 3.
* **leg_04 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's bottom socket 4.
* **stretcher_01 -> leg_01 & leg_02** | Joint: interlocking | Note: Stretcher tenons inserted into side mortises of leg 1 and leg 2.
* **stretcher_02 -> leg_02 & leg_03** | Joint: interlocking | Note: Stretcher tenons inserted into side mortises of leg 2 and leg 3.
* **stretcher_03 -> leg_03 & leg_04** | Joint: interlocking | Note: Stretcher tenons inserted into side mortises of leg 3 and leg 4.
* **stretcher_04 -> leg_04 & leg_01** | Joint: interlocking | Note: Stretcher tenons inserted into side mortises of leg 4 and leg 1.
