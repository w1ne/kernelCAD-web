# stool_low_round (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a four-legged low round stool with a near-floor stretcher loop designed for wood-based assembly.

## Geometry and Dimensions
Approx. 372.0 mm × 372.0 mm × 320.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating.

## Structural Features
Round seat panel; four legs; four stretchers forming a stabilizing loop.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
9

## Component Names
- Seat panel
- Leg 01
- Leg 02
- Leg 03
- Leg 04
- Stretcher 01
- Stretcher 02
- Stretcher 03
- Stretcher 04

## Adjustable Parameters
- **seat_thickness**: 20.0 (12.0 ~ 34.0 mm). Determines the load-bearing capacity of the seat and provides adequate depth for the leg tenons.
- **leg_height**: 300.0 (250.0 ~ 460.0 mm). Sets the overall seating height of the stool.
- **tenon_height**: 8.0 (5.0 ~ 12.0 mm). Determines the bite depth of the physical connections between the legs and the seat panel.
- **seat_radius**: 186.0 (146.0 ~ 231.0 mm). Defines the seating area and the overall width/depth footprint of the stool.
- **leg_top_size**: 30.0 (22.0 ~ 40.0 mm). Defines the structural thickness of the leg at the seat junction.
- **leg_bottom_size**: 34.0 (26.0 ~ 46.0 mm). Defines the structural thickness of the leg at the floor contact point, ensuring stability.
- **tenon_size**: 10.0 (7.0 ~ 14.0 mm). Controls the cross-sectional area of the leg tenons to balance joint strength and prevent breaking.
- **stretcher_z**: 106.0 (80.0 ~ 186.0 mm). Sets the vertical position of the stretcher loop from the floor to optimize anti-splaying leverage.
- **stretcher_bar_width**: 16.0 (12.0 ~ 22.0 mm). Defines the vertical stiffness of the stretcher bars.
- **stretcher_bar_thickness**: 10.0 (8.0 ~ 14.0 mm). Defines the horizontal stiffness of the stretcher bars.

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

### 2~5. Four Legs (Leg 01, Leg 02, Leg 03, Leg 04)
The supporting entities of the stool.
* **Component Purpose**: Vertical support. Transfers the seat load to the ground, ensuring anti-overturning stability in the X-Y plane.
* **Assembly Direction**: Inserted upwards along the +Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Top features a tenon that interference-fits into the bottom sockets of the seat panel. Sides feature mortises to receive the stretcher tenons.

### 6~9. Four Stretchers (Stretcher 01, Stretcher 02, Stretcher 03, Stretcher 04)
The stabilizing loop of the stool.
* **Component Purpose**: Horizontal bracing. Connects the legs near the floor in a cyclic loop to prevent splaying and increase overall structural rigidity.
* **Assembly Direction**: Inserted horizontally into the side mortises of the legs.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends feature angled tenons that fit into the corresponding leg mortises.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 9-component model:

* **Leg 01 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 1.
* **Leg 02 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 2.
* **Leg 03 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 3.
* **Leg 04 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 4.
* **Stretcher 01 -> Leg 01 & Leg 02** | Joint: interlocking | Note: Stretcher ends inserted into side mortises of adjacent legs.
* **Stretcher 02 -> Leg 02 & Leg 03** | Joint: interlocking | Note: Stretcher ends inserted into side mortises of adjacent legs.
* **Stretcher 03 -> Leg 03 & Leg 04** | Joint: interlocking | Note: Stretcher ends inserted into side mortises of adjacent legs.
* **Stretcher 04 -> Leg 04 & Leg 01** | Joint: interlocking | Note: Stretcher ends inserted into side mortises of adjacent legs.
* **Seat Panel -> All Components** | Joint: Support Base | Note: Acts as the core hub; all connection sockets generated via boolean cut.
