# vase_wave_petal (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Create a decorative petal-mouth vase featuring a wavy, twisted outer surface and a hollow interior, designed with a calm lower body and stronger top ripples.

## Geometry and Dimensions
Approx. 90.0 mm × 90.0 mm × 214.0 mm.

## Material
PLA

## Manufacturing Method
FDM 3D Printing

## Connection Method (Joint Type)
N/A (Single monolithic body)

## Mechanical Condition
Freestanding decorative object, suitable for holding lightweight items (e.g., dried flowers) or serving as a standalone aesthetic model.

## Structural Features
Wavy outer shell; hollow interior cavity; solid bottom base; petal-shaped top opening.

## Special Requirements
The lofted inner and outer shells must be perfectly sewed into a closed, manifold solid to ensure printability without slicing errors.

## Planned Component Quantity
1

## Component Names
- vase_body

## Adjustable Parameters
- **height**: 214.0 (154.0 ~ 294.0 mm). Controls the overall vertical dimension of the vase.
- **wall_thickness**: 3.0 (1.8 ~ 5.0 mm). Ensures sufficient thickness for 3D printing perimeters and overall structural stability.
- **steps**: 18 (12.0 ~ 28.0). Determines the vertical resolution (number of layers) used to generate the lofted profiles.
- **pts_per_layer**: 120 (96.0 ~ 156.0). Defines the horizontal resolution of the spline curves to ensure smooth wave transitions.
- **wave_count**: 7 (5.0 ~ 11.0). Sets the number of primary petal folds (waves) around the vase circumference.
- **twist**: 0.015 (0.0 ~ 0.045). Controls the helical rotation of the wave pattern along the Z-axis from bottom to top.
- **secondary_amp**: 0.5 (0.0 ~ 1.7 mm). Defines the intensity of the secondary high-frequency surface ripples.
- **profile_radius**: (11.0 ~ 56.0 mm). Constrains the base radius scaling of the vase's vertical profile.
- **wave_amp**: (0.0 ~ 8.8 mm). Controls the maximum amplitude of the wave deformations at the petal mouth.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Generate the base profile points and wave amplitude functions.
2. Create inner and outer spline wires for each vertical step, applying twist and wave transformations.
3. Loft the outer wires and inner wires separately.
4. Cap the top and bottom with ruled surfaces and faces, then sew all surfaces into a single solid.

---

### 1. vase_body
The primary and sole structural entity of the model.
* **Component Purpose**: Acts as the decorative container, providing both the aesthetic exterior and the functional hollow interior.
* **Assembly Direction**: N/A (Freestanding base component, built vertically along the +Z axis).
* **Connection & Kinematics**: N/A (Single solid body).

---

## Component Assembly Graph (Textual)
* **vase_body -> Standalone** | Joint: N/A | Note: Single continuous solid body; no assembly required.
