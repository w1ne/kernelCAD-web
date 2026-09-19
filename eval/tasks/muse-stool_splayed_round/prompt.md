# stool_splayed_round (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a round stool with splayed round legs and a square stretcher loop designed for wood-based assembly.

## Geometry and Dimensions
Approx. 352.0 mm × 352.0 mm × 465.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating.

## Structural Features
Round seat panel; four splayed round legs; four rectangular stretchers forming a continuous loop.

## Special Requirements
Keep assembly split unchanged.

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
- **seat_thickness**: 17.0 (10.0 ~ 31.0 mm). Must be thick enough to accommodate the insertion depth of the leg tenons without breaking through the top surface.
- **leg_height**: 448.0 (328.0 ~ 608.0 mm). Determines the overall height of the stool, strictly following ergonomic standards for seating posture.
- **tenon_height**: 8.0 (5.0 ~ 12.0 mm). Determines the bite depth of the physical connections between the legs and the seat panel.
- **seat_radius**: 176.0 (136.0 ~ 221.0 mm). Defines the seating area; constrains the extreme values to prevent tipping caused by an unbalanced base-to-seat ratio.
- **leg_top_radius**: 12.0 (8.0 ~ 17.0 mm). Ensures sufficient material at the top of the leg to support the tenon and bear the vertical load.
- **leg_bottom_radius**: 15.0 (11.0 ~ 21.0 mm). Provides a stable footprint and structural stiffness at the base of the stool.
- **tenon_radius**: 5.5 (4.0 ~ 8.5 mm). Controls the thickness of the connecting tenon to balance joint strength and prevent snapping.
- **stretcher_z**: 176.0 (126.0 ~ 256.0 mm). Sets the vertical position of the stretcher loop to provide optimal bracing against leg splay under load.
- **stretcher_bar_width**: 15.0 (11.0 ~ 21.0 mm). Ensures the horizontal bracing members have adequate stiffness to resist bending.
- **stretcher_bar_thickness**: 10.0 (8.0 ~ 14.0 mm). Lower limit ensures load-bearing stiffness; upper limit prevents interference with the leg geometry.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. seat_panel
The central hub of the stool.
* **Component Purpose**: Acts as the main load-bearing base and provides localization references and mechanical interfaces (round sockets) for the four splayed legs.
* **Assembly Direction**: Fixed base component, positioned at absolute $Z = leg\_height$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Bottom features four round sockets arranged radially.

### 2~5. Four Legs (leg_01, leg_02, leg_03, leg_04)
The supporting entities of the stool.
* **Component Purpose**: Vertical and lateral support. Transfers the seat load to the ground, with a splayed angle ensuring anti-overturning stability in the X-Y plane.
* **Assembly Direction**: Inserted upwards along their respective splayed axes into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Top features a round tenon of height `tenon_height` that interference-fits into the bottom sockets of the seat panel. The mid-section features angled mortises to receive the stretchers.

### 6~9. Four Stretchers (stretcher_01, stretcher_02, stretcher_03, stretcher_04)
The horizontal bracing entities of the stool.
* **Component Purpose**: Structural reinforcement. Connects the four legs in a continuous square loop to prevent them from splaying outward under heavy vertical loads.
* **Assembly Direction**: Inserted horizontally between adjacent legs at height `stretcher_z`.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends feature rectangular tenons that insert into the corresponding mortises on the inner faces of the legs.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 9-component model:

* **leg_01 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 1.
* **leg_02 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 2.
* **leg_03 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 3.
* **leg_04 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 4.
* **stretcher_01 -> leg_01 & leg_02** | Joint: interlocking | Note: Connects adjacent legs to form the first side of the square loop.
* **stretcher_02 -> leg_02 & leg_03** | Joint: interlocking | Note: Connects adjacent legs to form the second side of the square loop.
* **stretcher_03 -> leg_03 & leg_04** | Joint: interlocking | Note: Connects adjacent legs to form the third side of the square loop.
* **stretcher_04 -> leg_04 & leg_01** | Joint: interlocking | Note: Connects adjacent legs to close the square loop.
* **seat_panel -> All Components** | Joint: Support Base | Note: Acts as the core hub; all connection sockets generated via boolean cut.
