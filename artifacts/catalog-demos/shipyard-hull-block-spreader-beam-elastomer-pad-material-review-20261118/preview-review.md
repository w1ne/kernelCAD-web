# Five-preview review ledger — 18 November 2026

The mesh envelopes below come from generated `catalog/index.json` and are visual-review context, not product specifications.
The public pages/source/previews were captured before the target source edit; local source and preview hashes identify this worktree state.

| Asset | Preview read and finding | Indexed envelope / triangles | Local source SHA-256 | Local preview SHA-256 | Live page / source / preview |
|---|---|---:|---|---|---|
| `hull-block-spreader-beam` | Horizontal beam, four drop links and end pads read as a generic spreader. The pads now have a separate elastomer finish. | 3.14 × 1.71 × 1.58 m / 380 tris | `fc3d0e795c81616872e29d6a6d9b2c2496cbc8702cf1f25de03389a3a1f0c264` | `9d3560a1f597b3104f743366c05d81fb21bc465d26bf2f250111f35d9b39a583` | HTTP 200/200/200 |
| `plate-pack-transfer-cart` | Low four-wheel carrier, deck rails and end stops read as a plate cart. The push bar appears disconnected from the cart frame; recorded, not changed. | 1.91 × 1.54 × 1.085 m / 372 tris | `e72a02618e227189a249a6112189a2d7707ffb2bccb612ff9a3934a36f58987d` | `7bbc3565e4d3df73f00bb21f94b6933f6cac1178bb7b984188793f3dd77ad09f` | HTTP 200/200/200 |
| `pipe-rack-fork-pocket` | Base skids, repeated dividers, retaining rail and fork-pocket blocks read as an empty pipe rack. | 2.735 × 1.005 × 1.38 m / 308 tris | `2d9d9487a03f8f5fc0fb3e79579c23e26ab332dc02a2e6db384bc9b92c19c64e` | `82b442f2f20675f2ee59c09cbadc06c3a5255a0a2670c49c3b41fbc0428f6ddc` | HTTP 200/200/200 |
| `weld-consumable-issue-cage` | Roof, posts, shelves and door read as a store, but no mesh infill is modeled despite the mesh-style description; recorded, not changed. | 2.05 × 1.87 × 1.175 m / 364 tris | `2259df65a99cb714f7d89a1a9b203770968b3f3573b807fbc0e05337b95230e9` | `e4a9df6b6780c8827851328742d69d9065550fc80c7cb75edb2ae50389a5be4e` | HTTP 200/200/200 |
| `shipfitter-tool-cabinet` | Paired doors, drawer bank and side tool rail read as a shipfitter cabinet; painted panels and metal rail/feet are distinct. | 1.445 × 1.55 × 0.8 m / 364 tris | `6ca47396fae161b1383f83a98d5ca352aa83f0cbe2a790f7795189e5dc63573a` | `317fa057a09d0dd3ed03995732674ca83c7770dc92f87c61d13cb23e8efc6f0c` | HTTP 200/200/200 |

## Selected material correction

`hull-block-spreader-beam/contact-shoe-0..3` were assigned `yardPaint` even though the source named them soft-contact shoes. They now use the editable `elastomer` control. The other sampled assets and their source files were not changed.

The cart push-bar separation and missing cage mesh infill are recorded as separate geometry/description issues for later work. This round changes one material mapping only.
