# kernelcad.com — Website + Brand v1

**Date:** 2026-05-04
**Owner:** w1ne
**Status:** spec, awaiting user review

---

## 1. Goal

Stand up `kernelcad.com` as a single-page marketing anchor for kernelCAD, plus the brand assets (avatar, X header, LinkedIn cover) needed so build-in-public posts on @KernelCAD have a real destination.

The site is the URL that daily X / LinkedIn posts link to. It should make a cold visitor understand kernelCAD in 5 seconds, and reward an engaged visitor with a "try it in your browser" path.

## 2. Scope

**In scope (v1):**
- Single landing page at `kernelcad.com` (no `/builds`, no `/docs`, no `/blog`)
- Brand identity: logo (mark + wordmark), palette, typography, dimension annotation system
- Three brand assets: profile avatar, X header (1500×500), LinkedIn company cover (1128×191)
- Auto-discovery of latest demo MP4 from `docs/demos/v*/` at build time
- Cloudflare Pages deploy with `kernelcad.com` (Namecheap CNAME)
- App link to `app.kernelcad.com` (separate deploy of existing Vite visual debugger)
- Asset upload to X profile, LinkedIn company page, GitHub repo social preview

**Out of scope (iteration 2+):**
- `/builds` page surfacing all `docs/demos/v*/` entries
- `/docs` mirror of `SKILL.md` and CLI usage
- Blog / journal / longform writing
- Newsletter signup
- Dark mode
- Mobile-specific design beyond responsive defaults

## 3. Visual identity

### 3.1 Logo

**Mark:** Stylized "K" (`K2` from brainstorm) with filleted internal corners. The K letterform IS the engineering detail — every interior junction is rounded with a real fillet radius. Path data:

```
M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40
Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z
```

ViewBox `0 0 84 84`. Renders cleanly at 14px (favicon) through 1500px+ (header banners).

**Wordmark:** `kernelCAD` in serif (Tiempos Headline / Source Serif Pro / Georgia fallback), weight 500, letter-spacing -0.02em. The `CAD` portion is set in blueprint blue.

**Lockup:** mark + wordmark side-by-side with 10px gap (nav scale) or stacked (hero scale).

**R 2 callout:** A small `R 2` fillet annotation appears next to the mark **only at large scale** (X header, brand-guide contexts). It is dropped at website hero, nav, favicon, and avatar scales — at small sizes it reads as clutter.

### 3.2 Palette

| Token | Hex | Use |
|---|---|---|
| `--vellum` | `#F4ECD7` | Page background — warm drafting-vellum cream |
| `--vellum-soft` | `#EFE5C9` | Subtle alt panels |
| `--ink` | `#0A1628` | Body text, primary buttons, mark fill |
| `--ink-soft` | `#3F4C5E` | Subhead text, meta |
| `--ink-faint` | `#97A0AC` | Tertiary text on dark backgrounds |
| `--blueprint` | `#1E5FA8` | Primary accent — CAD wordmark, primary CTA, headline italic |
| `--copper` | `#B87333` | Secondary accent — terminal `$` prompt, hover states |
| `--rule` | `#D6CDB4` | Border lines, dividers |
| `--code-bg` | `#0A1628` | Code blocks, install snippet, demo frame |
| `--code-text` | `#E5DFCB` | Code foreground |

**Theory:** vellum (warm yellow) + blueprint blue is **complementary**, not analogous — energizes the blue without saturation. Historically authentic to drafting-vellum-with-blue-ink, distinct from Anthropic's analogous warm-cream-+-terracotta.

### 3.3 Typography

| Role | Family | Notes |
|---|---|---|
| Headline | Tiempos Headline → Source Serif Pro → Georgia | weight 500, tight tracking, italic for accent words |
| Body | Söhne → Inter → system-ui | weight 400, 1.5 line-height |
| Mono | JetBrains Mono → IBM Plex Mono | meta, install snippet, code, dimension annotations |

Source Serif Pro is the open-source fallback of Tiempos and ships with a Google Fonts URL — use it as the actual served font (Tiempos is licensed). JetBrains Mono is open source.

### 3.4 Dimension annotation system

A reusable visual motif: thin horizontal line with end ticks + monospace label. Used for version stamps, mode lists, and brand metadata. Pattern:

```
| ────────  v0.21  ──────── |
```

End ticks are 1px × 6–8px; line is 1px high; label is monospace 9–11px in `--ink-soft`. Same primitive used at all scales.

## 4. Landing page

### 4.1 Structure

Top-to-bottom (single page, max-width 1040px):

1. **Nav** — small mark + wordmark left; `app ↗ · github · npm · @kernelcad` right (mono, 12px). `app` link in blueprint blue.
2. **Hero (centered)** — H1, subhead, modes line, primary CTAs, tertiary social links, install snippet.
3. **Demo block** — auto-loop muted MP4, 16:10 aspect ratio, dark frame with soft shadow. Meta strip above: `v{N} · live build` left, `prompt → code → 3D · auto-rotating` right.
4. **Code block** — narrow (max-width 720px), labeled `the agent writes this`, syntax-highlighted bracket+hole hello-world.
5. **Footer** — `kernelCAD · MIT` left, link bar right.

No "what it is" feature columns. The demo + code are the proof; bullet-grids after a real demo signal insecurity.

### 4.2 Hero copy

| Element | Copy |
|---|---|
| H1 | `CAD for ` + *agents* (italic blueprint blue) + `.` |
| Subhead | `A scriptable, headless-first CAD platform powered by the OpenCASCADE kernel.` |
| Modes line | `browser · terminal · MCP · open source` (mono, ink-faint, 12px, letter-spacing 0.06em) |
| Primary CTA | `Try in browser →` (blueprint blue button, white text) |
| Secondary CTA | `★ Star on GitHub` (transparent button, vellum/rule border) |
| Tertiary CTAs | `Follow on X · Follow on LinkedIn` (small mono text links) |
| Install | `$ npm install -g kernelcad` (dark code-bg pill with copper `$`) |

No "Day N · build-in-public" badge. A daily-update promise we can't keep on missed days = self-imposed liability.
No "honestly a prototype" footer line.
No specific tool counts ("13 MCP tools") in copy — numbers age badly.

### 4.3 Demo video — auto-update pipeline

Prebuild script `site/scripts/build-demo.mjs` runs at deploy time:

1. Reads `docs/demos/v*/` directory listing
2. Sorts by semver, picks the highest version
3. Copies that folder's `.mp4` → `site/public/demo.mp4`
4. Writes `site/public/demo.json` with `{ version, caption, source_path }`

The page reads `demo.json` at runtime, renders `<video src="/demo.mp4" autoplay muted loop playsinline preload="auto">` and the version badge. Release flow stays: drop a new MP4 in `docs/demos/v0.22/` → next deploy auto-promotes it. Same script reused for `/builds` in iteration 2 (lists all entries instead of picking max).

### 4.4 App link strategy

`Try in browser →` and `app ↗` both point to `https://app.kernelcad.com` — a separate Cloudflare Pages project deployed from the **root** of `kernelCAD-web` (the existing Vite visual debugger). Two CNAMEs from Namecheap:

- `kernelcad.com` → marketing pages project
- `app.kernelcad.com` → visual-debugger pages project

Subroute (`kernelcad.com/play`) was rejected because it forces the Vite app to know its own base path and complicates cache invalidation.

## 5. Brand assets

All three assets share: vellum background, faint blueprint grid (1px lines at 22–28px spacing, `rgba(10,22,40,0.04)` opacity), navy K mark, wordmark in serif, blueprint-blue tagline.

### 5.1 Profile avatar — 400 × 400

K mark centered on vellum background with subtle grid. No wordmark, no callout. Same file used for X profile (rendered as circle) and LinkedIn company logo (rendered as rounded square). Default = light variant. Inverted (dark navy bg, vellum K) shipped as alt for contexts where a light avatar disappears in feeds.

### 5.2 X header — 1500 × 500

Horizontal layout with avatar exclusion zone bottom-left (240px circle, 3% inset). Right two-thirds carries:

- K mark (~270px) with `R 2` blueprint-blue fillet callout — callout earns its place at this scale
- Wordmark `kernelCAD` (Tiempos 72px, CAD in blueprint)
- Italic tagline: `CAD for agents.` (Tiempos italic 38px, blueprint)
- Modes line: `browser · terminal · MCP · open source` (mono 18px, ink-soft)
- Top-right: `kernelcad.com` (mono 16px)
- Bottom-right: dimension annotation `| ─── v0.21 ─── |`

### 5.3 LinkedIn company cover — 1128 × 191

Brutally short (≈5.9:1). Logo overlay zone top-left (~125px square at 3% inset). Horizontal layout:

- Left (after logo zone): wordmark `kernelCAD` (44px) + italic tagline `CAD for agents.` (28px) baseline-aligned
- Right: `kernelcad.com` (mono, 16px, ink) + `browser · terminal · MCP` (mono, 14px, ink-soft) stacked

### 5.4 Asset rendering

PNG outputs are generated by `site/scripts/render-brand.mjs` — a **Puppeteer**-based script that opens each HTML template in headless Chromium at the exact viewport size and screenshots it. Puppeteer is chosen because rendering is deterministic, scriptable, and must run unattended (potentially in CI). chrome-devtools MCP is reserved for the upload step in §6 where the user must be logged in.

Generated outputs:

- `avatar-light.png` (400×400)
- `avatar-dark.png` (400×400)
- `x-header.png` (1500×500)
- `linkedin-cover.png` (1128×191)
- `github-social-preview.png` (1280×640) — same composition as X header retargeted

Outputs land in `site/public/brand/` (served by the site for hot-link / share-card usage) and a copy in `kernelCAD-web/brand/` for upload reference.

## 6. Asset deployment

After PNGs are generated, three platforms get the new assets. **All require the user logged in** in the browser used for upload — chrome-devtools MCP automates the navigation but cannot bypass auth.

| Platform | Where | Asset |
|---|---|---|
| X | x.com/settings/profile | profile pic (400×400 light) + header (1500×500) |
| LinkedIn (company) | linkedin.com/company/kernelcad/admin/ | logo (400×400 light) + cover (1128×191) |
| GitHub repo | github.com/w1ne/kernelCAD-web/settings → Social preview | `github-social-preview.png` (1280×640) |

The implementation plan covers a chrome-devtools-driven helper that walks each platform's upload flow with the user logged in.

## 7. Tech stack

- **Source location:** `kernelCAD-web/site/` (subfolder of existing repo)
- **Pages framework:** none — plain `index.html` + `style.css` + minimal vanilla JS for the demo-video swap and copy-button
- **Build script:** Node script `site/scripts/build-demo.mjs` (zero deps; uses `fs` and `path`)
- **Asset render script:** `site/scripts/render-brand.mjs` (Puppeteer-based, screenshots HTML templates → PNGs)
- **Deploy:** Cloudflare Pages, build dir `site/`, build command `node scripts/build-demo.mjs`, output dir `site/`
- **Domain:** Namecheap DNS CNAME `kernelcad.com → <project>.pages.dev`. App subdomain CNAME `app.kernelcad.com → <app-project>.pages.dev`.

Plain HTML chosen over Astro/Next/etc because: (a) zero build = zero things that break on Day 1, (b) iteration 2's `/builds` page can either stay vanilla or migrate to Astro then.

## 8. Directory layout

```
kernelCAD-web/
├── site/                              ← new
│   ├── index.html
│   ├── style.css
│   ├── scripts/
│   │   ├── build-demo.mjs             ← prebuild: pick latest demo MP4
│   │   ├── render-brand.mjs           ← prebuild: render PNG assets
│   │   ├── upload-x.mjs               ← chrome-devtools helper
│   │   ├── upload-linkedin.mjs        ← chrome-devtools helper
│   │   └── upload-github.mjs          ← chrome-devtools helper
│   ├── public/
│   │   ├── demo.mp4                   ← generated
│   │   ├── demo.json                  ← generated
│   │   ├── favicon.svg
│   │   └── brand/
│   │       ├── avatar-light.png
│   │       ├── avatar-dark.png
│   │       ├── x-header.png
│   │       ├── linkedin-cover.png
│   │       └── github-social-preview.png
│   └── brand-templates/               ← HTML templates the renderer screenshots
│       ├── avatar.html
│       ├── x-header.html
│       └── linkedin-cover.html
└── (existing kernelCAD-web tree)
```

## 9. Open questions

- **Default avatar variant** — light (K on vellum) is recommended; user did not explicitly confirm. Spec assumes light unless changed.
- **GitHub social preview** — same composition as X header retargeted to 1280×640. Confirm this is fine vs designing a separate one.
- **`@kernelcad` X handle** — assumed available. Spec assumes it; if taken, alternative handle needs decision (out of brainstorming scope).

## 10. Success criteria

- `kernelcad.com` resolves and renders the landing page within the day.
- A visitor arriving from an X post can identify kernelCAD's purpose in <5 seconds and find a `Try in browser →` button without scrolling.
- `app.kernelcad.com` opens the visual debugger.
- @KernelCAD on X has the new avatar + header.
- LinkedIn company page has the new logo + cover.
- The kernelCAD-web GitHub repo has the social preview image set.
- The next time a release ships (v0.22), the homepage demo updates with no manual edit.
