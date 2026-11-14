# Design brief — standard-components cable gland and flange

**Date:** 2026-11-10
**Intent:** Improve two existing low-poly attachment assets without changing IDs or kit count. Each object should read in the catalog preview, expose distinct material controls, and let a useful fit dimension change the corresponding opening.

## Assets and choices

- `cable-gland`: preserve compact/standard/large housing scaling; add 4/6/8 mm nominal cable diameter choices that change the cable stub, seal opening and body bore. Keep the nominal cable diameter fixed as housing scale changes. Show the molded barrel ribs, stainless compression cap, rubber seal and cable PVC as separate colored parts.
- `square-mounting-flange`: preserve compact/standard/large housing scaling; add 10/14/18 mm through-bore choices that stay fixed as the housing changes size. Show the cast flange, stainless bore neck, rubber neck seal and four zinc-plated fasteners as separate colored parts.
- Keep three named presets per asset and an honest triangle budget. These are generic visualization dimensions, not vendor fit data.

## Verification artifacts

Source is the design authority. Preview PNGs, source-driven variant renders, the generated index, static pages and MP4 are evidence derived from those sources. The video caption distinguishes local software renders and validation from deployment or physical acceptance.
