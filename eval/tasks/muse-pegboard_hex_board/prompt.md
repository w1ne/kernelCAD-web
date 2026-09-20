# pegboard_hex_board (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a hexagonal perforated pegboard designed for modular storage, organization, and tool display.

## Geometry and Dimensions
Approx. 400.0 mm × 346.4 mm × 5.0 mm.

## Material
Timber

## Manufacturing Method
Laser Cutting

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Wall-mounted or stand-alone load-bearing storage and organization.

## Structural Features
Hexagonal main panel; hexagonal grid array of circular holes.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
1

## Component Names
- Perforated panel

## Adjustable Parameters
- **hex_size**: 200 (100.0 ~ 400.0 mm). Determines the overall footprint and storage capacity of the pegboard.
- **thickness**: 5 (3.0 ~ 24.0 mm). Controls the structural rigidity of the board and the insertion depth for external pegs.
- **spacing**: 25 (10.0 ~ 50.0 mm). Defines the density of the hole grid, affecting modular compatibility and structural integrity between holes.
- **hole_radius**: 3 (1.0 ~ 8.0 mm). Sets the size of the sockets to match standard external pegs, hooks, or dowels.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main hexagonal profile of the part based on the original script.
2. Complete key features by cutting the hexagonal grid array of circular holes.
3. Place the part back in its original position within the sample assembly.

---

### 1. Perforated Panel
The central hub and sole component of the model.
* **Component Purpose**: Acts as the main structural base and provides a standardized grid of sockets for attaching external hooks, pegs, or modular fixtures.
* **Assembly Direction**: Base component, generated flat on the XY plane and extruded along the +Z axis.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features an array of circular holes acting as mortises (sockets) for external components.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 1-component model:

* **External Attachments -> Perforated Panel** | Joint: interlocking | Note: External pegs or hooks (not included in the model) are inserted into the board's circular grid holes.
