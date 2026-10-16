# Visual inspection — 2026-10-16

Inspected the H.264 video at 2, 7, and 12 seconds. The gear frame shows a continuous top face and 20 distinct teeth; the fillet frame shows uninterrupted rounded edge bands; the fallback frame shows the GT2 pulley with its central bore, toothed body, flange, and hub. Text is readable and states that the evidence is local validation with no deployment or hardware acceptance.

The fallback caption names the +0.438083% candidate STEP round-trip mismatch. The captured full GT2 import value is 1613.939256647417 mm³ after the guard returns the OCCT reference; the separate raw Node repro confirms that 0.3.1 direct import preserves the full input volume. The torus-face collapse and no-op differences are recorded in the linked 0.3.1 evaluation bundle, not implied to be fixed by this demo.

Limits: software-shaded mesh views do not certify analytic curvature, continuity, or manufacturing tolerances. The video replays captured local build results. It is not a live browser capture, deployed behavior, or hardware acceptance.

`ffprobe`: H.264, 1280×720, 24 fps, 20.000 seconds, 175428 bytes.
