# stool_pentagon_five_leg (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a five-leg pentagonal stool with a continuous mortise-and-tenon rail loop (stretcher) designed for wood-based assembly.

## Geometry and Dimensions
Approx. 364.0 mm × 364.0 mm × 463.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating.

## Structural Features
Seat panel; five legs; five stretchers forming a continuous rail loop.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
11

## Component Names
- Seat panel
- Leg 01
- Leg 02
- Leg 03
- Leg 04
- Leg 05
- Stretcher 01
- Stretcher 02
- Stretcher 03
- Stretcher 04
- Stretcher 05

## Adjustable Parameters
- **seat_thickness**: 17.0 (10.0 ~ 31.0 mm). Determines the structural strength of the seat and the maximum depth for leg tenons.
- **leg_height**: 446.0 (326.0 ~ 606.0 mm). Sets the seating height, adhering to ergonomic standards for stools.
- **tenon_height**: 8.0 (5.0 ~ 12.0 mm). Determines the bite depth of the leg-to-seat physical connections.
- **seat_polygon_radius**: 182.0 (142.0 ~ 227.0 mm). Defines the overall seating area and footprint of the stool.
- **leg_top_radius**: 11.5 (8.0 ~ 16.5 mm). Controls the thickness of the leg at the top connection point.
- **leg_bottom_radius**: 13.5 (10.0 ~ 19.5 mm). Controls the thickness of the leg at the base for ground contact stability.
- **tenon_radius**: 5.0 (4.0 ~ 8.0 mm). Sets the thickness of the cylindrical tenon connecting the leg to the seat.
- **stretcher_z**: 180.0 (130.0 ~ 260.0 mm). Defines the vertical placement of the stretcher loop for structural rigidity and footrest ergonomics.
- **stretcher_bar_width**: 14.0 (10.0 ~ 20.0 mm). Determines the vertical stiffness of the stretcher bars.
- **stretcher_bar_thickness**: 10.0 (8.0 ~ 14.0 mm). Determines the horizontal stiffness of the stretcher bars.

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
* **Component Purpose**: Acts as the main load-bearing base and provides localization references and mechanical interfaces (sockets) for the five legs.
* **Assembly Direction**: Fixed base component, positioned at absolute $Z = leg\_height$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Bottom features five circular sockets arranged in a radial layout.

### 2~6. Five Legs (Leg 01 to Leg 05)
The supporting entities of the stool.
* **Component Purpose**: Vertical support. Transfers the seat load to the ground, ensuring anti-overturning stability in the X-Y plane. Also provides mortises for the stretcher loop.
* **Assembly Direction**: Inserted upwards along the +Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Top features a cylindrical tenon of height `tenon_height` that interference-fits into the bottom sockets of the seat panel. The sides feature mortises to receive the stretcher tenons.

### 7~11. Five Stretchers (Stretcher 01 to Stretcher 05)
The horizontal bracing entities of the stool.
* **Component Purpose**: Horizontal support. Connects the legs together to form a rigid continuous loop, preventing leg splay and increasing overall structural integrity under load.
* **Assembly Direction**: Inserted horizontally into the side mortises of adjacent legs.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends feature tenons that fit into the corresponding mortises on the legs.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 11-component model:

* **Leg 01 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 1.
* **Leg 02 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 2.
* **Leg 03 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 3.
* **Leg 04 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 4.
* **Leg 05 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 5.
* **Stretcher 01 -> Leg 01 & Leg 02** | Joint: interlocking | Note: Connects adjacent legs to form the rail loop.
* **Stretcher 02 -> Leg 02 & Leg 03** | Joint: interlocking | Note: Connects adjacent legs to form the rail loop.
* **Stretcher 03 -> Leg 03 & Leg 04** | Joint: interlocking | Note: Connects adjacent legs to form the rail loop.
* **Stretcher 04 -> Leg 04 & Leg 05** | Joint: interlocking | Note: Connects adjacent legs to form the rail loop.
* **Stretcher 05 -> Leg 05 & Leg 01** | Joint: interlocking | Note: Connects adjacent legs to form the rail loop.
* **Seat Panel -> All Legs** | Joint: Support Base | Note: Acts as the core hub; all connection sockets generated via boolean cut.
