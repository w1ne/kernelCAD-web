# pegboard_slot (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a flat perforated pegboard panel featuring a regular grid of slots, designed for modular wall storage and tool organization.

## Geometry and Dimensions
Approx. 600.0 mm × 400.0 mm × 5.0 mm.

## Material
Timber

## Manufacturing Method
Laser Cutting

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Load-bearing storage (hanging tools, shelves, and accessories via external hooks).

## Structural Features
Flat rectangular panel; rounded outer corners; regular grid of vertical slots.

## Special Requirements
Ensure the slot grid remains centered relative to the outer board dimensions regardless of parameter adjustments.

## Planned Component Quantity
1

## Component Names
- perforated_panel

## Adjustable Parameters
- **width**: 600 (200.0 ~ 1200.0 mm). Defines the overall horizontal coverage area of the pegboard.
- **height**: 400 (200.0 ~ 1200.0 mm). Defines the overall vertical coverage area of the pegboard.
- **thickness**: 5 (3.0 ~ 24.0 mm). Determines the board's structural rigidity and compatibility with the insertion depth of external hooks.
- **board_corner_radius**: 10 (0.0 ~ 40.0 mm). Eliminates sharp corners to prevent injury during handling and installation.
- **spacing**: 25 (10.0 ~ 50.0 mm). Standardizes the modular grid pitch to ensure compatibility with standardized pegboard accessories.
- **slot_length**: 15 (6.0 ~ 30.0 mm). Defines the vertical opening size for inserting flat or angled hooks.
- **slot_width**: 6 (3.0 ~ 12.0 mm). Defines the horizontal opening size, ensuring a snug fit for the inserted tenons/hooks.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main rectangular profile of the board with rounded corners.
2. Generate the 2D grid of slot cutters based on the calculated rows, columns, and spacing.
3. Execute a boolean cut to subtract the slot grid from the main board body.

---

### 1. perforated_panel
The main structural body of the pegboard.
* **Component Purpose**: Acts as a modular mounting base, providing a standardized grid of sockets (slots) to support external hanging accessories.
* **Assembly Direction**: Fixed base component, typically mounted vertically against a wall.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). The internal slots act as mortises to receive the tenons of external hooks and brackets.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the single-component model and its intended use:

* **External Accessories -> perforated_panel** | Joint: interlocking | Note: External hooks/tenons are inserted into the panel's grid of slots to form a rigid or semi-rigid hanging connection.
