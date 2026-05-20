# pocket-watch-v2 — iteration log

Each entry: the focused change + side-by-side diff against `/tmp/refcrop/watch_close.png`.

## iter 0 — initial vision-driven blockout

**What changed vs the v0.7 pocket-watch build:**
- Body downsized to ~22 mm flat-to-flat (was ~50 mm tip-to-tip).
- Frame extended above the case as a sculpted *trapezoidal horn* + flat *tab*, both fillet-fused with the case to read as one continuous pink body.
- Crown moved to the +X SIDE of the horn (hex prism, axis along X), not the top axis.
- Bail authored as a revolved torus with the through-hole facing the camera.
- Crystal shipped as a flatter NURBS dome with glass material (transmission 0.95, ior 1.5).
- Strap reduced to a short stub above the bail.

**Render:** `/tmp/pwv2_iter0_iso.pose-30-15.png`

**Diff against the reference:**

| What | Status |
|---|---|
| Octagonal pink frame | OK shape, but rendered colour is too dark and saturated — reads as oxblood, not coral |
| Yellow inner case + 8 black hex screws | OK |
| Pink horn + tab on top, integrated with case | Geometry there, but the strap visually overpowers it |
| Bail visible as a through-hole ring at the iso pose | OK |
| Strap | A floating thick rectangle ABOVE the bail (looks disconnected from the body); composition jams the watch to the right because the strap stretches the bbox vertically |
| Crown on the side, yellow knurled | Visible but reads as a tiny yellow cube — not knurled |
| Dome crystal — dial visible through glass | Dome barely visible at this pose; dial reads as opaque |
| Sub-dial + tapisserie | Hard to see in the iso pose; would need front view to inspect |

**3 worst issues, ranked:**
1. Frame colour rendering as dark oxblood rather than the bright coral pink of the reference — single-pixel sample suggests the material's `metalness/clearcoat` defaults are darkening the base colour. Need to either use `.material({ baseColor, metalness: 0, roughness: 0.6 })` explicitly or pick a brighter `#`.
2. Strap floats above the bail like a tongue depressor. The reference shows the strap *wrapping through* the bail and folding back. For now, dropping the strap entirely will give the body room to breathe and centre the composition.
3. Crystal dome reads as opaque from this pose. The transmission material needs the HDRI environment to be present at render time; without it the glass falls back to the diffuse base colour.

**Decision:** commit and continue. Drop the strap next, brighten the frame colour, and address the crystal in iter 2.
