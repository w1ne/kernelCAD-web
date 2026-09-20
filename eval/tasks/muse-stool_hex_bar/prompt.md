# stool_hex_bar (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a tall bar stool with a hexagonal seat and dual loops of stretchers, designed for wood-based assembly using mortise-and-tenon joints.

## Geometry and Dimensions
Approx. 344.0 mm × 344.0 mm × 720.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating (bar/tall stool).

## Structural Features
Hexagonal seat panel; four legs; eight stretchers (forming dual reinforcement loops).

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
13

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
- Stretcher 05
- Stretcher 06
- Stretcher 07
- Stretcher 08

## Adjustable Parameters
- **seat_thickness**: 18.0 (10.0 ~ 32.0 mm). Ensures adequate load-bearing capacity for the user and sufficient depth for leg tenon insertion.
- **leg_height**: 702.0 (582.0 ~ 862.0 mm). Determines the overall seating height, suitable for bar or counter-height applications.
- **tenon_height**: 9.0 (6.0 ~ 13.0 mm). Determines the bite depth of the physical connections into the seat panel.
- **seat_polygon_radius**: 172.0 (132.0 ~ 217.0 mm). Defines the seating area; constrained to prevent tipping caused by an unbalanced base-to-seat ratio.
- **leg_top_size**: 24.0 (18.0 ~ 34.0 mm). Controls the thickness of the leg at the top interface, ensuring sufficient material around the tenon.
- **leg_bottom_size**: 30.0 (22.0 ~ 42.0 mm). Controls the footprint thickness of the leg, providing a stable base and lowering the center of gravity.
- **tenon_size**: 9.0 (6.0 ~ 13.0 mm). Defines the cross-sectional strength of the joint connecting the legs to the seat.
- **stretcher_z**: 284.0 (234.0 ~ 364.0 mm). Sets the height of the lower stretcher loop, acting as a structural tie and an ergonomic footrest.
- **stretcher_secondary_z**: 596.0 (536.0 ~ 676.0 mm). Sets the height of the upper stretcher loop, providing critical anti-splay reinforcement near the top of the tall legs.
- **stretcher_bar_width**: 14.0 (10.0 ~ 20.0 mm). Determines the vertical stiffness of the stretchers.
- **stretcher_bar_thickness**: 10.0 (8.0 ~ 14.0 mm). Determines the horizontal stiffness of the stretchers and limits the mortise depth required in the legs.

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
The central hub and seating surface of the stool.
* **Component Purpose**: Acts as the main load-bearing base for the user and provides localization references and mechanical interfaces (sockets) for the four legs.
* **Assembly Direction**: Fixed base component, positioned at absolute $Z = leg\_height$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Bottom features four square sockets to receive the leg tenons.

### 2~5. Four Legs (Leg 01, Leg 02, Leg 03, Leg 04)
The primary vertical supporting entities of the stool.
* **Component Purpose**: Transfers the seat load to the ground. Tapered design (wider at the bottom) ensures anti-overturning stability. Contains mortises to receive stretcher tenons.
* **Assembly Direction**: Inserted upwards along the +Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Top features a square tenon that fits into the seat panel. Side faces feature mortises to receive the stretchers.

### 6~13. Eight Stretchers (Stretcher 01 to Stretcher 08)
The horizontal bracing entities forming dual structural loops.
* **Component Purpose**: Prevents the tall legs from splaying under load, significantly increasing the rigidity of the frame. The lower loop also functions as a footrest.
* **Assembly Direction**: Inserted horizontally between adjacent legs.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends feature tenons that insert into the corresponding mortises on the legs.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 13-component model:

* **Leg 01 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 1.
* **Leg 02 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 2.
* **Leg 03 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 3.
* **Leg 04 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 4.
* **Stretcher 01~04 -> Legs** | Joint: interlocking | Note: Lower loop stretchers inserted into the lower mortises of adjacent legs.
* **Stretcher 05~08 -> Legs** | Joint: interlocking | Note: Upper loop stretchers inserted into the upper mortises of adjacent legs.
* **Seat Panel -> All Components** | Joint: Support Base | Note: Acts as the core hub; leg connection sockets generated via boolean cut.
