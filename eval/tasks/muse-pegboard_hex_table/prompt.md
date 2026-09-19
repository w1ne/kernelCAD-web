# pegboard_hex_table (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a three-legged hexagonal pegboard table designed for modular storage, display, and organization.

## Geometry and Dimensions
Approx. 400.0 mm × 346.4 mm × 308.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Load-bearing storage and lightweight display stand.

## Structural Features
Hexagonal perforated tabletop panel; three vertical support legs.

## Special Requirements
Keep assembly split unchanged. Ensure pegboard holes do not intersect or interfere with the leg mortise sockets.

## Planned Component Quantity
4

## Component Names
- perforated_panel
- leg_01
- leg_02
- leg_03

## Adjustable Parameters
- **hex_size**: 200 (120.0 ~ 350.0 mm). Determines the overall tabletop area and footprint radius.
- **thickness**: 8 (5.0 ~ 15.0 mm). Controls the structural rigidity and load-bearing capacity of the tabletop panel.
- **spacing**: 25 (10.0 ~ 50.0 mm). Defines the density of the pegboard hole grid for accessory placement.
- **hole_radius**: 3 (1.0 ~ 8.0 mm). Sets the size of the pegboard holes to ensure compatibility with standard insertion pegs.
- **leg_height**: 300 (150.0 ~ 500.0 mm). Determines the elevation of the table surface from the ground.
- **leg_thickness**: 30 (20.0 ~ 50.0 mm). Ensures adequate vertical load-bearing stiffness and stability for the legs.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. perforated_panel
The central functional surface of the table.
* **Component Purpose**: Acts as the main load-bearing base for storage, provides a grid of holes for pegboard accessories, and houses the mechanical interfaces (sockets) for the legs.
* **Assembly Direction**: Fixed base component, positioned horizontally at absolute Z = `leg_height`.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). The underside features three rectangular sockets distributed at 120-degree intervals to receive the legs.

### 2~4. Three Legs (leg_01, leg_02, leg_03)
The supporting entities of the table.
* **Component Purpose**: Vertical support. Transfers the tabletop load to the ground, ensuring anti-overturning stability in the X-Y plane.
* **Assembly Direction**: Inserted upwards along the +Z axis into the perforated panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). The top of each leg features a rectangular tenon that interference-fits into the corresponding bottom sockets of the perforated panel.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 4-component model:

* **leg_01 -> perforated_panel** | Joint: interlocking | Note: Leg top tenon inserted into the panel's first socket (at 30 degrees).
* **leg_02 -> perforated_panel** | Joint: interlocking | Note: Leg top tenon inserted into the panel's second socket (at 150 degrees).
* **leg_03 -> perforated_panel** | Joint: interlocking | Note: Leg top tenon inserted into the panel's third socket (at 270 degrees).
* **perforated_panel -> All Components** | Joint: Support Base | Note: Acts as the core hub; all connection sockets generated via boolean cut.
