# stool_cross_brace (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a square stool with crossing diagonal braces designed for wood-based assembly.

## Geometry and Dimensions
Approx. 330.0 mm × 330.0 mm × 456.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating.

## Structural Features
Seat panel; four legs; two crossing diagonal stretchers (braces).

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
7

## Component Names
- seat_panel
- leg_01
- leg_02
- leg_03
- leg_04
- stretcher_01
- stretcher_02

## Adjustable Parameters
- **seat_thickness**: 16.0 (10.0 ~ 30.0 mm). Determines the structural strength of the seat and the maximum depth for leg tenons.
- **leg_height**: 440.0 (320.0 ~ 600.0 mm). Sets the seating height according to ergonomic standards.
- **tenon_height**: 8.0 (5.0 ~ 12.0 mm). Determines the insertion depth of the leg tenons into the seat panel.
- **seat_width**: 330.0 (240.0 ~ 420.0 mm). Defines the lateral seating area.
- **seat_depth**: 330.0 (240.0 ~ 420.0 mm). Defines the longitudinal seating area.
- **leg_top_size**: 24.0 (18.0 ~ 34.0 mm). Controls the thickness of the leg at the top connection point.
- **leg_bottom_size**: 28.0 (20.0 ~ 40.0 mm). Controls the thickness of the leg at the floor contact point for stability.
- **tenon_size**: 9.0 (6.0 ~ 13.0 mm). Defines the cross-sectional size of the connecting tenons.
- **stretcher_z**: 182.0 (132.0 ~ 262.0 mm). Sets the vertical position of the cross braces to optimize structural rigidity and prevent leg splay.
- **stretcher_bar_width**: 16.0 (12.0 ~ 22.0 mm). Determines the vertical profile width of the stretcher bars.
- **stretcher_bar_thickness**: 10.0 (8.0 ~ 14.0 mm). Determines the horizontal thickness of the stretcher bars.

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
The central hub of the stool.
* **Component Purpose**: Acts as the main load-bearing base and provides localization references and mechanical interfaces (sockets) for the four legs.
* **Assembly Direction**: Fixed base component, positioned at absolute $Z = leg\_height$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Bottom features four sockets to receive the leg tenons.

### 2~5. Four Legs (leg_01, leg_02, leg_03, leg_04)
The supporting entities of the stool.
* **Component Purpose**: Vertical support. Transfers the seat load to the ground, ensuring anti-overturning stability. Features side mortises to receive the diagonal stretchers.
* **Assembly Direction**: Inserted upwards along the +Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Top features a tenon that interference-fits into the bottom sockets of the seat panel. Mid-section features angled mortises for the stretchers.

### 6~7. Stretchers (stretcher_01, stretcher_02)
The diagonal bracing entities of the stool.
* **Component Purpose**: Structural reinforcement. Connects opposite diagonal legs to form an 'X' brace, preventing leg splay and increasing overall torsional rigidity.
* **Assembly Direction**: Inserted horizontally/diagonally between the respective leg pairs.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends feature tenons that insert into the corresponding side mortises on the legs.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 7-component model:

* **leg_01 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket.
* **leg_02 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket.
* **leg_03 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket.
* **leg_04 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket.
* **stretcher_01 -> leg_01 & leg_04** | Joint: interlocking | Note: Stretcher ends inserted into side mortises on leg_01 and leg_04.
* **stretcher_02 -> leg_02 & leg_03** | Joint: interlocking | Note: Stretcher ends inserted into side mortises on leg_02 and leg_03.
* **seat_panel -> All Components** | Joint: Support Base | Note: Acts as the core hub; all top connection sockets generated via boolean cut.
