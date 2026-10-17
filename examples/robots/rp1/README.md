# RP1.3.4 placed from the SolidWorks assembly

`rp1-7dof.kcad.ts` places every manufacturing STEP part that imports, using the
component transforms from `RP1.3.4整机.SLDASM`.

Each `swTransform` is a row-vector rigid pose. Translation in that file is
metres. The script turns the rotation into an axis and an angle, rotates the
part about its origin, then translates it in millimetres.

`./parts/` links to those STEP files. It is not in git.

A checked render of the feet, shins, lower thighs, hip sides, and waist shows
two shoes side by side and a leg standing on them. The shin meets the shoe.
The hip yokes sit above the thigh. The main thigh body `YCL.M000663` is the
gap: OCCT rejects that STEP file.

Ten part numbers in the assembly have no STEP file in the manufacturing tree.
The script does not add revolute mates yet. The parts are in the assembly pose.
