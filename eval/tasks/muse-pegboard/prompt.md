# pegboard (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a perforated panel (pegboard) designed for modular storage and organization, providing a standardized grid of holes for mounting hooks, pegs, and shelves.

## Geometry and Dimensions
Approx. 600.0 mm × 400.0 mm × 5.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
Dowel Joint

## Mechanical Condition
Wall-mounted load-bearing storage and tool organization.

## Structural Features
Single flat panel; regular grid of circular through-holes; rounded outer corners.

## Special Requirements
Keep assembly split unchanged. Ensure hole grid remains centered regardless of overall board dimensions.

## Planned Component Quantity
1

## Component Names
- perforated_panel

## Adjustable Parameters
- **width**: 600 (200.0 ~ 1200.0 mm). Defines the overall horizontal span of the board.
- **height**: 400 (200.0 ~ 1200.0 mm). Defines the overall vertical span of the board.
- **thickness**: 5 (3.0 ~ 24.0 mm). Determines the structural rigidity of the board and the insertion depth for external pegs.
- **board_corner_radius**: 10 (0.0 ~ 40.0 mm). Eliminates sharp corners for user safety and aesthetic purposes.
- **spacing**: 25 (10.0 ~ 50.0 mm). Controls the pitch/density of the hole grid, dictating accessory compatibility.
- **hole_radius**: 3 (1.0 ~ 8.0 mm). Determines the size of the compatible pegs or hooks that can be inserted into the board.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main rectangular profile of the part based on the width, height, and thickness.
2. Apply fillets to the four Z-axis edges to create the rounded corners.
3. Generate a centered 2D array of cylinders based on the spacing and hole radius, and subtract them from the main board using a boolean cut.

---

### 1. perforated_panel
The main structural body and sole component of the pegboard.
* **Component Purpose**: Acts as a universal mounting base, providing a standardized grid of female sockets for attaching various storage accessories.
* **Assembly Direction**: Standalone base component (typically mounted vertically in the user environment).
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). The through-holes act as receptacles for external cylindrical pegs or hooks.

---

## Component Assembly Graph (Textual)
External Accessories -> perforated_panel | Joint: Dowel Joint | Note: External pegs or hooks insert into the grid of cylindrical holes provided by the panel.
