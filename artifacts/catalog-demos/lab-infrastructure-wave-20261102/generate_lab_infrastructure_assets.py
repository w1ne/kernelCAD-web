#!/usr/bin/env python3
"""Generate original, low-poly laboratory infrastructure catalog sources."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog" / "kits" / "lab-infrastructure"

# id, title, description, recipe, dimensions/options
ASSETS = [
    ("wall-lab-bench", "Wall laboratory bench", "Wall-mounted laboratory workbench with a chemical-resistant top, base units and rear service upstand.", "bench", {"w": 1500, "d": 650, "h": 900, "cabs": 2, "back": 1}),
    ("center-island-lab-bench", "Center island laboratory bench", "Double-sided island bench with a broad worktop, four base bays and central service spine.", "bench", {"w": 1800, "d": 1200, "h": 920, "cabs": 4, "spine": 1}),
    ("l-shaped-laboratory-bench", "L-shaped laboratory bench", "Corner laboratory bench with a return worktop, underbench storage and a raised end panel.", "l_bench", {"w": 1400, "d": 620, "h": 900, "return": 900, "cabs": 2}),
    ("wet-lab-sink-bench", "Wet-lab sink bench", "Wet bench with an inset wash basin, high-neck faucet, splashback and two storage bays.", "bench", {"w": 1500, "d": 700, "h": 900, "cabs": 2, "sink": 1, "back": 1}),
    ("laboratory-washup-station", "Laboratory wash-up station", "Deep wash-up sink with raised drainboard, splash panel and open pipe chase below.", "bench", {"w": 1250, "d": 720, "h": 900, "cabs": 1, "sink": 1, "drainboard": 1}),
    ("balance-isolation-bench", "Balance isolation bench", "Compact weighing station with a heavy isolated stone slab, rigid frame and lower shelf.", "bench", {"w": 850, "d": 650, "h": 850, "cabs": 0, "shelf": 1, "slab": 1}),
    ("vibration-isolation-table", "Vibration isolation table", "Laboratory isolation table with a thick top plate, pneumatic-looking supports and cross-braced base.", "bench", {"w": 1000, "d": 800, "h": 820, "cabs": 0, "brace": 1, "slab": 1}),
    ("stainless-lab-bench", "Stainless laboratory bench", "Open stainless-style workbench with a raised rear rail, tubular legs and lower wire shelf.", "bench", {"w": 1600, "d": 700, "h": 900, "cabs": 0, "shelf": 1, "back": 1}),
    ("cantilever-lab-bench", "Cantilever laboratory bench", "Wall-supported cantilever bench with knee space, a thick work surface and service rail.", "bench", {"w": 1400, "d": 650, "h": 900, "cabs": 0, "cantilever": 1, "back": 1}),
    ("laboratory-base-cabinet", "Laboratory base cabinet", "Modular underbench cabinet with paired doors, recessed plinth, pulls and an inset worktop.", "cabinet", {"w": 900, "d": 570, "h": 870, "doors": 2}),
    ("laboratory-drawer-cabinet", "Laboratory drawer cabinet", "Underbench drawer unit with four stacked fronts, label slots and a protective top.", "cabinet", {"w": 600, "d": 570, "h": 820, "drawers": 4}),
    ("mobile-underbench-cabinet", "Mobile underbench cabinet", "Compact rolling laboratory storage unit with two drawers, side pull and visible casters.", "cabinet", {"w": 500, "d": 520, "h": 720, "drawers": 2, "wheels": 1}),
    ("laboratory-sink-base-cabinet", "Laboratory sink base cabinet", "Open-back sink base cabinet with paired doors, plumbing clearance and a robust top rim.", "cabinet", {"w": 800, "d": 600, "h": 860, "doors": 2, "open_back": 1}),
    ("wall-reagent-cabinet", "Wall reagent cabinet", "Wall-hung reagent cabinet with glazed-looking paired doors, side rails and a deep canopy.", "cabinet", {"w": 1000, "d": 360, "h": 720, "doors": 2, "wall": 1}),
    ("glassware-drying-cabinet", "Glassware drying cabinet", "Tall draining cabinet with perforated-looking shelves, paired doors and a lower drip tray.", "cabinet", {"w": 850, "d": 520, "h": 1450, "doors": 2, "shelves": 4}),
    ("acid-corrosive-storage-cabinet", "Acid and corrosive storage cabinet", "Low corrosive-storage cabinet with a raised spill lip, paired doors and hazard-color plinth.", "cabinet", {"w": 700, "d": 550, "h": 780, "doors": 2, "hazard": 1}),
    ("flammable-liquid-storage-cabinet", "Flammable-liquid storage cabinet", "Double-door chemical storage cabinet with contrasting warning panel, vents and raised feet.", "cabinet", {"w": 900, "d": 600, "h": 1100, "doors": 2, "hazard": 1, "vents": 1}),
    ("solvent-storage-cabinet", "Solvent storage cabinet", "Tall solvent cabinet with a vented crown, two compartments and visible door pulls.", "cabinet", {"w": 750, "d": 560, "h": 1250, "doors": 2, "vents": 1}),
    ("laboratory-gas-cylinder-cabinet", "Laboratory gas-cylinder cabinet", "Tall ventilated gas-cylinder enclosure with a pair of doors, top duct and retaining rail.", "cabinet", {"w": 900, "d": 650, "h": 1900, "doors": 2, "vents": 1, "duct": 1}),
    ("reagent-wall-shelf", "Reagent wall shelf", "Wall-mounted reagent shelf with a raised spill rail, support brackets and bottle stops.", "shelf", {"w": 1200, "d": 300, "h": 430, "levels": 2, "bottles": 6}),
    ("open-laboratory-shelving", "Open laboratory shelving", "Freestanding storage frame with five adjustable-looking shelves and cross-braced uprights.", "shelf", {"w": 1100, "d": 520, "h": 1900, "levels": 5, "braced": 1}),
    ("overhead-reagent-shelf", "Overhead reagent shelf", "Bench-top overhead shelf with twin posts, a broad tray and a lower service ledge.", "shelf", {"w": 1300, "d": 350, "h": 850, "levels": 2, "bottles": 4}),
    ("bench-service-pegboard", "Bench service pegboard", "Raised laboratory bench backboard with a perforated-looking panel, rails and utility clips.", "panel", {"w": 1200, "d": 80, "h": 720, "slots": 7}),
    ("laboratory-service-spine", "Laboratory service spine", "Vertical bench service spine with separated power, data and utility panels.", "service", {"w": 260, "d": 160, "h": 680, "ports": 6}),
    ("overhead-service-bridge", "Overhead laboratory service bridge", "Raised service bridge with twin support posts, cable tray and parallel utility lines.", "bridge", {"w": 1500, "d": 380, "h": 1250, "lines": 4}),
    ("ceiling-service-carrier", "Ceiling service carrier", "Ceiling-hung carrier rail with end hangers, utility tray and repeating service drops.", "bridge", {"w": 1800, "d": 300, "h": 1500, "lines": 3, "drops": 4}),
    ("lab-gas-manifold-panel", "Laboratory gas manifold panel", "Wall panel with paired inlet headers, isolation wheels and capped outlet points.", "manifold", {"w": 850, "d": 160, "h": 700, "ports": 4}),
    ("laboratory-vacuum-service-panel", "Laboratory vacuum service panel", "Bench service panel with several vacuum outlets, labeled controls and a lower manifold rail.", "service", {"w": 900, "d": 150, "h": 520, "ports": 5}),
    ("laboratory-electrical-service-rail", "Laboratory electrical service rail", "Long bench power rail with separated outlet blocks, end caps and wall brackets.", "service_rail", {"w": 1400, "d": 110, "h": 180, "ports": 6}),
    ("laboratory-water-service-console", "Laboratory water service console", "Compact sink-side water console with twin taps, valve knobs and a raised splash shield.", "water_console", {"w": 680, "d": 300, "h": 520, "taps": 2}),
    ("laboratory-utility-turret", "Laboratory utility turret", "Floor-to-ceiling service turret with layered panels, utility sockets and a cap rail.", "turret", {"w": 280, "d": 240, "h": 2100, "ports": 5}),
    ("laboratory-faucet-set", "Laboratory faucet set", "Bench-mounted faucet assembly with a tall neck, paired handles and a projecting spout.", "faucet", {"w": 300, "d": 200, "h": 480, "taps": 2}),
    ("laboratory-floor-drain-trough", "Laboratory floor-drain trough", "Long floor trough with a grated top, end outlet and raised cleaning rim.", "floor_drain", {"w": 1200, "d": 220, "h": 100, "bars": 10}),
    ("laboratory-fume-hood", "Laboratory fume hood", "Full-size bench fume enclosure with a work chamber, framed sash, base storage and exhaust crown.", "hood", {"w": 1200, "d": 800, "h": 2200, "style": "bench"}),
    ("walk-in-fume-hood", "Walk-in laboratory fume hood", "Large walk-in extraction enclosure with full-height side cheeks, floor pan and overhead duct.", "hood", {"w": 1500, "d": 1100, "h": 2300, "style": "walk-in"}),
    ("ductless-fume-enclosure", "Ductless fume enclosure", "Compact countertop enclosure with a clear-front frame, top filter housing and lower controls.", "hood", {"w": 900, "d": 650, "h": 1050, "style": "ductless"}),
    ("benchtop-extraction-enclosure", "Benchtop extraction enclosure", "Small extraction chamber with a raised front lip, side panels and replaceable-looking top module.", "hood", {"w": 700, "d": 560, "h": 780, "style": "benchtop"}),
    ("chemical-weighing-enclosure", "Chemical weighing enclosure", "Compact shielded enclosure with three clear-looking sides, a low sill and overhead filter box.", "hood", {"w": 680, "d": 600, "h": 850, "style": "weighing"}),
    ("laminar-flow-workbench", "Laminar-flow workbench enclosure", "Open-front clean work enclosure with side panels, upper filter head and integrated bench.", "hood", {"w": 1100, "d": 700, "h": 1500, "style": "flow"}),
    ("articulated-extraction-snorkel", "Articulated extraction snorkel", "Bench-mounted local extraction arm with a pivot stack, horizontal reach and flared intake hood.", "snorkel", {"w": 900, "d": 240, "h": 850}),
    ("canopy-extraction-hood", "Canopy extraction hood", "Suspended canopy hood with a broad capture canopy, paired posts and raised exhaust outlet.", "canopy", {"w": 1250, "d": 700, "h": 1900}),
    ("fume-exhaust-riser", "Fume exhaust riser", "Vertical laboratory exhaust riser with inspection band, support feet and a terminal cap.", "riser", {"w": 420, "d": 420, "h": 2100, "bands": 3}),
    ("cleanroom-pass-through-chamber", "Cleanroom pass-through chamber", "Wall pass-through cabinet with opposed doors, perimeter frame and flush handle bars.", "pass_through", {"w": 750, "d": 620, "h": 720}),
    ("cleanroom-partition-panel", "Cleanroom partition panel", "Modular cleanroom wall panel with vertical edge channels and a shallow bottom rail.", "partition", {"w": 1200, "d": 100, "h": 2400, "window": 0}),
    ("cleanroom-viewing-window", "Cleanroom viewing window panel", "Tall sealed wall panel with a framed observation window and reinforced edge channels.", "partition", {"w": 1200, "d": 100, "h": 2400, "window": 1}),
    ("cleanroom-single-door-module", "Cleanroom single-door module", "Cleanroom doorway assembly with a flush door leaf, side frame and overhead header.", "partition", {"w": 1300, "d": 120, "h": 2400, "door": 1}),
    ("cleanroom-gowning-bench", "Cleanroom gowning bench", "Hygiene-zone bench with a divided clean-side seat, shoe shelf and stable tubular base.", "bench", {"w": 1200, "d": 500, "h": 500, "cabs": 0, "shelf": 1}),
    ("cleanroom-gowning-locker-bank", "Cleanroom gowning locker bank", "Four-bay gowning locker lineup with ventilated doors, label strips and a shared plinth.", "cabinet", {"w": 1200, "d": 520, "h": 1850, "doors": 4, "vents": 1}),
    ("cleanroom-shoe-cubby", "Cleanroom shoe cubby rack", "Low footwear rack with six divided cubbies, raised feet and a wipe-clean top.", "shelf", {"w": 1200, "d": 430, "h": 620, "levels": 2, "cubbies": 6}),
    ("cleanroom-tacky-mat-tray", "Cleanroom tacky-mat tray", "Low entry tray with a raised perimeter, layered removable mat sheets and corner tabs.", "mat", {"w": 900, "d": 650, "h": 55, "layers": 4}),
    ("cleanroom-fan-filter-unit", "Cleanroom fan-filter ceiling module", "Recessed ceiling filter module with a faceted grille, perimeter frame and indicator block.", "filter_unit", {"w": 900, "d": 900, "h": 280, "slats": 7}),
    ("cleanroom-ceiling-light-panel", "Cleanroom ceiling light panel", "Flush ceiling luminaire cassette with a framed diffuser and shallow service rim.", "ceiling_panel", {"w": 1200, "d": 600, "h": 90}),
    ("laboratory-wall-eyewash-station", "Laboratory wall eyewash station", "Wall-mounted wash station with paired bowls, twin spray heads and a marked backplate.", "eyewash", {"w": 520, "d": 220, "h": 420, "wall": 1}),
    ("laboratory-refrigerator", "Laboratory refrigerator", "Tall laboratory cold-storage cabinet with a thick door, status panel and lower grille.", "cold", {"w": 760, "d": 760, "h": 1950, "doors": 1, "freezer": 0}),
    ("ultra-low-temperature-freezer", "Ultra-low-temperature freezer", "Upright deep-freezer enclosure with insulated paired doors, latch bars and a top display.", "cold", {"w": 920, "d": 850, "h": 1900, "doors": 2, "freezer": 1}),
    ("undercounter-laboratory-freezer", "Undercounter laboratory freezer", "Compact underbench cold-storage cabinet with an insulated door, toe kick and controller.", "cold", {"w": 700, "d": 700, "h": 850, "doors": 1, "freezer": 1}),
    ("cold-room-wall-panel", "Cold-room wall panel", "Insulated modular cold-room panel with edge cams, panel joints and a floor channel.", "partition", {"w": 1200, "d": 120, "h": 2300, "window": 0}),
    ("cold-room-door-module", "Cold-room door module", "Insulated walk-in cold-room door with thick frame, exterior pull and protective kick plate.", "partition", {"w": 1200, "d": 150, "h": 2200, "door": 1}),
    ("cryogenic-dewar-storage-rack", "Cryogenic dewar storage rack", "Floor rack for sample dewars with paired retaining hoops, shelves and anchor feet.", "dewar_rack", {"w": 1000, "d": 480, "h": 1450, "vessels": 3}),
    ("laboratory-safety-shower", "Laboratory safety shower", "Floor-mounted emergency shower fixture with pull rod, overhead spray head and eyewash bowls.", "shower", {"w": 560, "d": 430, "h": 2250, "eyewash": 1}),
]


def f(value):
    return f"{value:.3f}".rstrip("0").rstrip(".")


class Parts:
    def __init__(self):
        self.lines = []

    def box(self, name, x, y, z, w, d, h, color="body"):
        if w <= 0 or d <= 0 or h <= 0:
            return
        name = re.sub(r"[^A-Za-z0-9_-]+", "-", str(name)).strip("-")
        self.lines.append(
            f"add('{name}', box({f(w)}, {f(d)}, {f(h)}, true).translate({f(x)}, {f(y)}, {f(z + h / 2)}), {color});"
        )

    def cyl(self, name, x, y, z, h, r, color="body", segments=8):
        if h <= 0 or r <= 0:
            return
        name = re.sub(r"[^A-Za-z0-9_-]+", "-", str(name)).strip("-")
        self.lines.append(
            f"add('{name}', cylinder({f(h)}, {f(r)}, {segments}).translate({f(x)}, {f(y)}, {f(z)}), {color});"
        )


def build(asset):
    aid, _, _, recipe, d = asset
    p = Parts()
    w, dep, h = d.get("w", 1000), d.get("d", 600), d.get("h", 900)

    if recipe == "bench":
        top = 36 if d.get("slab") else 32
        p.box("worktop", 0, 0, h - top, w, dep, top, "accent")
        if d.get("cabs", 0):
            bays = d["cabs"]
            p.box("cabinet-kick-plinth", 0, 0, 0, w * 0.9, dep * 0.82, 80, "accent")
            gap = w * 0.88 / bays
            for i in range(bays):
                x = -w * 0.44 + gap * (i + 0.5)
                cw = gap * 0.86
                p.box(f"base-carcass-{i}", x, 0, 80, cw, dep * 0.78, h - 150, "body")
                p.box(f"base-door-{i}", x, -dep * 0.4, 90, cw * 0.92, 18, h - 185, "accent")
                p.box(f"door-pull-{i}", x + cw * 0.32, -dep * 0.43, h * 0.52, 12, 18, 110, "body")
        else:
            legs = 6 if w > 1450 else 4
            for i in range(legs):
                x = -w * 0.43 + i * (w * 0.86 / max(1, legs - 1))
                for y in (-dep * 0.4, dep * 0.4):
                    p.box(f"leg-{i}-{y}", x, y, 0, 42, 42, h - top, "body")
            p.box("lower-cross-rail", 0, 0, h * 0.24, w * 0.86, 36, 28, "accent")
            if d.get("shelf"):
                p.box("lower-shelf", 0, 0, h * 0.24 + 18, w * 0.82, dep * 0.72, 24, "accent")
            if d.get("brace"):
                for side in (-1, 1):
                    p.box(f"cross-brace-{side}", 0, side * dep * 0.35, h * 0.5, w * 0.7, 20, 22, "accent")
            if d.get("cantilever"):
                for x in (-w * 0.38, w * 0.38):
                    p.box(f"wall-bracket-{x}", x, dep * 0.42, h * 0.58, 28, dep * 0.8, 40, "body")
        if d.get("back"):
            p.box("splashback", 0, dep * 0.46, h + 125, w, 32, 250, "body")
        if d.get("sink"):
            x = w * 0.22
            p.box("sink-basin", x, 0, h - top - 85, w * 0.34, dep * 0.45, 80, "body")
            p.box("sink-well", x, -dep * 0.02, h - top - 70, w * 0.25, dep * 0.32, 48, "accent")
            p.cyl("faucet-riser", x, dep * 0.28, h + 20, 185, 13, "accent")
            p.box("faucet-spout", x, dep * 0.14, h + 190, 135, 22, 20, "accent")
        if d.get("spine"):
            p.box("service-spine", 0, 0, h, w * 0.12, 90, 360, "body")
            for i in range(4):
                p.box(f"spine-outlet-{i}", 0, -52, h + 48 + i * 68, 52, 14, 34, "accent")
        if d.get("drainboard"):
            p.box("drainboard", -w * 0.29, 0, h - 3, w * 0.32, dep * 0.88, 20, "body")
            for i in range(5):
                p.box(f"drain-groove-{i}", -w * 0.29, -dep * 0.3 + i * dep * 0.15, h + 8, w * 0.26, 8, 8, "accent")

    elif recipe == "l_bench":
        t = 34
        p.box("long-top", 0, 0, h - t, w, dep, t, "accent")
        p.box("return-top", w * 0.44, dep * 0.42, h - t, d["return"], dep, t, "accent")
        for x in (-w * 0.42, w * 0.42):
            for y in (-dep * 0.4, dep * 0.4):
                p.box(f"leg-{x}-{y}", x, y, 0, 42, 42, h - t, "body")
        for i in range(d["cabs"]):
            x = -w * 0.28 + i * w * 0.56 / max(1, d["cabs"] - 1)
            p.box(f"return-cabinet-{i}", x, 0, 70, w * 0.25, dep * 0.76, h - 140, "body")
            p.box(f"return-door-{i}", x, -dep * 0.39, 90, w * 0.23, 18, h - 190, "accent")
        p.box("end-splash", w * 0.47, dep * 0.45, h + 105, 34, dep, 210, "body")

    elif recipe == "cabinet":
        bottom = 55 if d.get("wheels") else 0
        p.box("cabinet-shell", 0, 0, bottom, w, dep, h - bottom, "body")
        p.box("cabinet-plinth", 0, 0, 0, w * 0.92, dep * 0.9, bottom + 22, "accent")
        doors = d.get("doors", 0)
        drawers = d.get("drawers", 0)
        count = max(doors, drawers, 1)
        for i in range(count):
            x = -w * 0.44 + (i + 0.5) * w * 0.88 / count
            panel_w = w * 0.86 / count
            if drawers:
                n = drawers
                for j in range(n):
                    z = bottom + (h - bottom) * (j + 0.5) / n
                    p.box(f"drawer-front-{i}-{j}", x, -dep * 0.51, z - 5, panel_w * 0.94, 18, (h - bottom) / n - 12, "accent" if j % 2 == 0 else "body")
                    p.box(f"drawer-pull-{i}-{j}", x, -dep * 0.55, z, panel_w * 0.28, 12, 14, "body")
            else:
                p.box(f"door-{i}", x, -dep * 0.51, bottom + (h - bottom) / 2, panel_w * 0.96, 18, h - bottom - 30, "accent" if d.get("hazard") else "body")
                p.box(f"door-pull-{i}", x + panel_w * 0.32, -dep * 0.55, h * 0.52, 14, 14, h * 0.16, "accent")
        if d.get("shelves"):
            for i in range(d["shelves"]):
                z = bottom + (h - bottom) * (i + 1) / (d["shelves"] + 1)
                p.box(f"inner-shelf-{i}", 0, 0, z, w * 0.88, dep * 0.86, 18, "accent")
        if d.get("vents"):
            for i in range(5):
                p.box(f"vent-slot-{i}", 0, -dep * 0.52, h * 0.78 + i * 26, w * 0.32, 10, 9, "accent")
        if d.get("duct"):
            p.box("exhaust-neck", 0, 0, h - 5, w * 0.3, dep * 0.4, 220, "accent")
        if d.get("wall"):
            for side in (-1, 1):
                p.box(f"wall-bracket-{side}", side * w * 0.35, dep * 0.2, 0, 35, dep * 0.55, 170, "accent")
        if d.get("open_back"):
            p.box("plumbing-clearance", 0, dep * 0.35, h * 0.48, w * 0.62, 18, h * 0.5, "accent")
        if d.get("wheels"):
            for x in (-w * 0.38, w * 0.38):
                for y in (-dep * 0.38, dep * 0.38):
                    p.cyl(f"caster-{x}-{y}", x, y, 0, 55, 34, "accent")
        if d.get("hazard"):
            p.box("warning-band", 0, -dep * 0.53, h * 0.87, w * 0.92, 12, 50, "accent")

    elif recipe == "shelf":
        levels = d.get("levels", 3)
        for x in (-w * 0.46, w * 0.46):
            for y in (-dep * 0.42, dep * 0.42):
                p.box(f"upright-{x}-{y}", x, y, 0, 34, 34, h, "body")
        for i in range(levels):
            z = 90 + (h - 150) * (i + 0.5) / levels
            p.box(f"shelf-deck-{i}", 0, 0, z, w * 0.98, dep * 0.94, 28, "accent")
            p.box(f"front-stop-{i}", 0, -dep * 0.45, z + 30, w * 0.95, 18, 36, "body")
            if d.get("bottles") and i == levels - 1:
                n = d["bottles"]
                for j in range(n):
                    x = -w * 0.38 + (j + 0.5) * w * 0.76 / n
                    p.cyl(f"reagent-bottle-{j}", x, 0, z + 30, 115, 25, "body")
                    p.cyl(f"bottle-cap-{j}", x, 0, z + 145, 22, 18, "accent")
        if d.get("braced"):
            for side in (-1, 1):
                p.box(f"rear-brace-{side}", 0, dep * 0.4, h * 0.5, w * 0.8, 22, 24, "accent")
        if d.get("cubbies"):
            n = d["cubbies"]
            for i in range(1, n):
                x = -w * 0.48 + w * i / n
                p.box(f"divider-{i}", x, 0, 0, 16, dep * 0.9, h, "body")

    elif recipe == "panel":
        p.box("backplate", 0, 0, 0, w, dep, h, "body")
        p.box("top-rail", 0, -dep * 0.62, h - 35, w * 1.04, 18, 70, "accent")
        p.box("bottom-rail", 0, -dep * 0.62, 35, w * 1.04, 18, 70, "accent")
        for i in range(d.get("slots", 6)):
            x = -w * 0.42 + i * w * 0.84 / max(1, d.get("slots", 6) - 1)
            for j in range(3):
                p.box(f"service-clip-{i}-{j}", x, -dep * 0.65, h * (0.28 + j * 0.19), 24, 20, 46, "accent")
        for x in (-w * 0.4, w * 0.4):
            p.box(f"support-bracket-{x}", x, dep, h * 0.42, 55, dep * 2, 28, "accent")

    elif recipe == "service":
        p.box("service-panel", 0, 0, 0, w, dep, h, "body")
        p.box("header", 0, -dep * 0.55, h - 45, w * 1.05, 20, 90, "accent")
        p.box("lower-manifold", 0, -dep * 0.58, h * 0.18, w * 0.86, 30, 44, "accent")
        n = d.get("ports", 4)
        for i in range(n):
            x = -w * 0.37 + i * w * 0.74 / max(1, n - 1)
            z = h * (0.35 + (i % 2) * 0.26)
            p.box(f"port-block-{i}", x, -dep * 0.62, z, 74, 24, 70, "accent")
            p.cyl(f"control-knob-{i}", x, -dep * 0.77, z - 18, 36, 14, "body")

    elif recipe == "bridge":
        for side in (-1, 1):
            p.box(f"support-post-{side}", side * w * 0.43, 0, 0, 50, 55, h, "body")
            p.box(f"base-foot-{side}", side * w * 0.43, 0, 0, 170, 150, 24, "accent")
        p.box("carrier-rail", 0, 0, h - 80, w, dep * 0.4, 80, "accent")
        for i in range(d.get("lines", 3)):
            y = -dep * 0.28 + i * dep * 0.56 / max(1, d.get("lines", 3) - 1)
            p.box(f"service-line-{i}", 0, y, h - 150 - i * 28, w * 0.94, 24, 24, "body")
        for i in range(d.get("drops", 0)):
            x = -w * 0.36 + i * w * 0.72 / max(1, d.get("drops", 0) - 1)
            p.box(f"service-drop-{i}", x, 0, 90, 28, 28, h - 180, "accent")

    elif recipe == "manifold":
        p.box("mounting-plate", 0, 0, 0, w, dep, h, "body")
        p.box("main-header", 0, -dep, h * 0.48, w * 0.84, 45, 52, "accent")
        for i in range(d.get("ports", 4)):
            x = -w * 0.34 + i * w * 0.68 / max(1, d.get("ports", 4) - 1)
            p.cyl(f"valve-riser-{i}", x, -dep, h * 0.48, h * 0.25, 17, "body")
            p.box(f"valve-handle-{i}", x, -dep * 1.1, h * 0.76, 66, 20, 16, "accent")
            p.box(f"outlet-{i}", x, -dep * 0.85, h * 0.88, 38, 70, 35, "body")
        for side in (-1, 1):
            p.box(f"wall-mount-{side}", side * w * 0.42, dep * 0.55, h * 0.22, 45, 150, 100, "accent")

    elif recipe == "service_rail":
        p.box("mounting-rail", 0, 0, 0, w, dep, h, "body")
        for i in range(d.get("ports", 6)):
            x = -w * 0.42 + i * w * 0.84 / max(1, d.get("ports", 6) - 1)
            p.box(f"outlet-module-{i}", x, -dep * 0.65, h * 0.52, 110, 35, h * 0.62, "accent")
            p.box(f"socket-{i}", x, -dep * 0.85, h * 0.52, 45, 10, 48, "body")
        for side in (-1, 1):
            p.box(f"end-cap-{side}", side * w * 0.52, 0, 0, 50, dep * 1.2, h * 1.3, "accent")

    elif recipe == "water_console":
        p.box("splash-panel", 0, dep * 0.32, 0, w, 40, h, "body")
        p.box("mounting-base", 0, 0, 0, w, dep, 40, "accent")
        for i in range(d.get("taps", 2)):
            x = -w * 0.27 + i * w * 0.54 / max(1, d.get("taps", 2) - 1)
            p.cyl(f"tap-riser-{i}", x, 0, 40, h * 0.72, 12, "accent")
            p.box(f"tap-spout-{i}", x + 45, -16, h * 0.72 + 15, 95, 25, 18, "accent")
            p.box(f"valve-handle-{i}", x - 38, -10, h * 0.45, 68, 22, 16, "body")

    elif recipe == "turret":
        p.box("turret-core", 0, 0, 0, w, dep, h, "body")
        p.box("base-plinth", 0, 0, 0, w * 1.5, dep * 1.5, 75, "accent")
        p.box("service-cap", 0, 0, h - 30, w * 1.3, dep * 1.3, 60, "accent")
        for i in range(d.get("ports", 5)):
            z = 180 + i * (h - 360) / max(1, d.get("ports", 5) - 1)
            p.box(f"turret-port-{i}", 0, -dep * 0.55, z, w * 0.62, 22, 64, "accent")
            p.box(f"port-socket-{i}", 0, -dep * 0.7, z, w * 0.22, 12, 30, "body")

    elif recipe == "faucet":
        p.box("mounting-deck", 0, 0, 0, w, dep, 40, "body")
        p.cyl("riser", 0, 0, 40, h * 0.74, 24, "accent")
        p.box("spout", 145, 0, h * 0.74 + 10, 210, 32, 22, "accent")
        for side in (-1, 1):
            x = side * w * 0.33
            p.cyl(f"tap-stem-{side}", x, 0, 40, h * 0.4, 15, "body")
            p.box(f"tap-handle-{side}", x, 0, h * 0.4 + 45, 82, 30, 18, "accent")

    elif recipe == "floor_drain":
        p.box("drain-trough", 0, 0, 0, w, dep, h, "body")
        p.box("grate-lip", 0, 0, h, w * 1.04, dep * 1.04, 20, "accent")
        for i in range(d.get("bars", 10)):
            x = -w * 0.45 + i * w * 0.9 / max(1, d.get("bars", 10) - 1)
            p.box(f"grate-bar-{i}", x, 0, h + 20, 12, dep * 0.9, 10, "body")
        p.cyl("end-outlet", w * 0.42, 0, 0, h * 1.3, 30, "accent")

    elif recipe == "hood":
        style = d["style"]
        base_h = h * (0.3 if style in ("ductless", "benchtop", "weighing") else 0.38)
        p.box("base-cabinet", 0, 0, 0, w, dep, base_h, "body")
        p.box("work-surface", 0, 0, base_h, w * 1.04, dep * 1.05, 34, "accent")
        chamber_h = h - base_h - 150
        for side in (-1, 1):
            p.box(f"side-cheek-{side}", side * w * 0.47, 0, base_h + 34, w * 0.06, dep, chamber_h, "body")
        p.box("rear-chamber-wall", 0, dep * 0.46, base_h + 34, w * 0.88, dep * 0.08, chamber_h, "body")
        p.box("sash-header", 0, -dep * 0.49, h - 170, w, 30, 100, "accent")
        p.box("sash-rail", 0, -dep * 0.5, base_h + chamber_h * 0.45, w * 0.88, 28, 34, "accent")
        p.box("upper-housing", 0, 0, h - 170, w * 0.88, dep * 0.78, 170, "accent")
        p.box("exhaust-neck", 0, dep * 0.12, h, w * 0.22, dep * 0.22, 150, "body")
        for i in range(3):
            p.box(f"control-button-{i}", -w * 0.32 + i * w * 0.1, -dep * 0.54, base_h * 0.45, 30, 12, 24, "accent")
        if style == "walk-in":
            p.box("floor-pan", 0, 0, 18, w * 0.9, dep * 0.88, 36, "accent")
            p.box("wide-sash", 0, -dep * 0.52, base_h + chamber_h * 0.22, w * 0.82, 25, chamber_h * 0.45, "accent")
        elif style == "flow":
            p.box("workbench-legs", 0, 0, 0, w * 0.88, dep * 0.75, base_h * 0.6, "accent")
            p.box("filter-grille", 0, 0, h - 215, w * 0.68, dep * 0.14, 55, "body")
        elif style in ("ductless", "benchtop", "weighing"):
            p.box("lower-control-panel", 0, -dep * 0.54, base_h * 0.72, w * 0.76, 18, 40, "accent")

    elif recipe == "snorkel":
        p.box("mounting-base", 0, 0, 0, w * 0.42, dep * 0.72, 55, "accent")
        p.cyl("pedestal", 0, 0, 55, h * 0.54, 30, "body")
        p.box("lower-arm", w * 0.18, 0, h * 0.55, w * 0.48, 34, 36, "accent")
        p.cyl("pivot", w * 0.42, 0, h * 0.52, 70, 48, "body")
        p.box("upper-arm", w * 0.62, 0, h * 0.7, w * 0.43, 30, 32, "body")
        p.box("intake-hood", w * 0.84, 0, h * 0.71, 250, 190, 90, "accent")
        p.box("intake-flare", w * 0.84, 0, h * 0.65, 300, 240, 30, "body")

    elif recipe == "canopy":
        for side in (-1, 1):
            p.box(f"canopy-post-{side}", side * w * 0.36, 0, 0, 55, 55, h - 300, "body")
        p.box("capture-canopy", 0, 0, h - 330, w, dep, 110, "accent")
        p.box("canopy-lip", 0, -dep * 0.46, h - 400, w * 0.92, 24, 45, "body")
        p.box("exhaust-riser", 0, 0, h - 220, w * 0.28, dep * 0.32, 300, "body")

    elif recipe == "riser":
        p.box("duct-foot", 0, 0, 0, w * 1.3, dep * 1.3, 45, "accent")
        p.box("riser-shaft", 0, 0, 45, w, dep, h - 120, "body")
        for i in range(d.get("bands", 3)):
            z = 160 + i * (h - 300) / max(1, d.get("bands", 3) - 1)
            p.box(f"inspection-band-{i}", 0, 0, z, w * 1.12, dep * 1.12, 24, "accent")
        p.box("terminal-cap", 0, 0, h - 75, w * 1.28, dep * 1.28, 90, "accent")

    elif recipe == "pass_through":
        p.box("support-plinth", 0, 0, 0, w * 0.92, dep * 0.94, 70, "accent")
        p.box("chamber", 0, 0, 70, w, dep, h - 140, "body")
        p.box("inner-transfer-box", 0, 0, 110, w * 0.72, dep * 0.72, h - 220, "accent")
        for side in (-1, 1):
            p.box(f"access-door-{side}", side * (w * 0.5 + 12), 0, h * 0.5, 24, dep * 0.82, h * 0.8, "body")
            p.box(f"door-handle-{side}", side * (w * 0.53 + 10), -dep * 0.25, h * 0.5, 14, 28, h * 0.3, "accent")
        for z in (70, h - 70):
            p.box(f"mount-frame-{z}", 0, 0, z, w * 1.1, dep * 1.1, 28, "accent")

    elif recipe == "partition":
        if d.get("door"):
            p.box("outer-frame-left", -w * 0.42, 0, 0, 85, dep, h, "accent")
            p.box("outer-frame-right", w * 0.42, 0, 0, 85, dep, h, "accent")
            p.box("header", 0, 0, h - 80, w, dep, 160, "accent")
            p.box("door-leaf", 0, -dep * 0.12, h * 0.48, w * 0.62, dep * 0.65, h * 0.88, "body")
            p.box("door-vision-panel", 0, -dep * 0.48, h * 0.68, w * 0.3, 18, h * 0.22, "accent")
            p.box("door-push-plate", w * 0.21, -dep * 0.52, h * 0.45, 40, 12, 170, "accent")
        else:
            p.box("wall-core", 0, 0, 0, w, dep, h, "body")
            for x in (-w * 0.48, w * 0.48):
                p.box(f"edge-channel-{x}", x, 0, 0, 42, dep * 1.2, h, "accent")
            p.box("floor-track", 0, 0, 0, w * 1.03, dep * 1.25, 52, "accent")
            p.box("head-track", 0, 0, h - 35, w * 1.03, dep * 1.25, 70, "accent")
            if d.get("window"):
                p.box("window-frame", 0, -dep * 0.55, h * 0.62, w * 0.48, 24, h * 0.25, "accent")
                p.box("window-infill", 0, -dep * 0.57, h * 0.62, w * 0.4, 12, h * 0.18, "body")

    elif recipe == "mat":
        p.box("tray-base", 0, 0, 0, w, dep, h, "body")
        for i in range(d.get("layers", 4)):
            z = h + i * 6
            p.box(f"replaceable-sheet-{i}", 0, 0, z, w * (0.96 - i * 0.012), dep * (0.96 - i * 0.012), 5, "accent" if i % 2 == 0 else "body")
        for x in (-w * 0.44, w * 0.44):
            for y in (-dep * 0.42, dep * 0.42):
                p.box(f"corner-tab-{x}-{y}", x, y, h + d.get("layers", 4) * 6, 42, 36, 18, "accent")

    elif recipe == "filter_unit":
        p.box("filter-housing", 0, 0, 0, w, dep, h, "body")
        p.box("perimeter-frame", 0, 0, h - 26, w * 1.08, dep * 1.08, 52, "accent")
        n = d.get("slats", 7)
        for i in range(n):
            y = -dep * 0.4 + i * dep * 0.8 / max(1, n - 1)
            p.box(f"filter-slat-{i}", 0, y, h + 10, w * 0.83, 18, 22, "accent")
        p.box("indicator", w * 0.39, -dep * 0.3, h + 16, 54, 35, 24, "body")

    elif recipe == "ceiling_panel":
        p.box("cassette", 0, 0, 0, w, dep, h, "body")
        p.box("diffuser", 0, 0, h, w * 0.9, dep * 0.9, 24, "accent")
        for side in (-1, 1):
            p.box(f"long-rim-{side}", 0, side * dep * 0.48, 0, w * 1.06, 28, h * 1.4, "accent")

    elif recipe == "eyewash":
        p.box("wall-backplate", 0, 0, 0, w, 45, h, "body")
        p.box("basin-rim", 0, -dep * 0.56, h * 0.16, w * 0.94, dep * 0.52, 36, "accent")
        p.box("basin", 0, -dep * 0.48, h * 0.13, w * 0.76, dep * 0.34, 30, "body")
        for side in (-1, 1):
            x = side * w * 0.28
            p.cyl(f"spray-post-{side}", x, -dep * 0.35, h * 0.18, h * 0.58, 12, "accent")
            p.cyl(f"spray-head-{side}", x, -dep * 0.35, h * 0.75, 34, 24, "body")
        p.box("activation-handle", 0, -dep * 0.68, h * 0.5, w * 0.46, 22, 22, "accent")

    elif recipe == "cold":
        p.box("insulated-cabinet", 0, 0, 32, w, dep, h - 32, "body")
        p.box("toe-kick", 0, 0, 0, w * 0.92, dep * 0.86, 64, "accent")
        doors = d.get("doors", 1)
        for i in range(doors):
            x = -w * 0.45 + (i + 0.5) * w * 0.9 / doors
            p.box(f"insulated-door-{i}", x, -dep * 0.53, h * 0.52, w * 0.88 / doors, 30, h * 0.87, "accent")
            p.box(f"door-gasket-{i}", x, -dep * 0.55, h * 0.52, w * 0.8 / doors, 12, h * 0.78, "body")
            p.box(f"latch-{i}", x + w * 0.3 / doors, -dep * 0.59, h * 0.58, 32, 22, h * 0.25, "body")
        p.box("controller", w * 0.34, -dep * 0.58, h * 0.82, w * 0.2, 24, 110, "accent")
        for i in range(5):
            p.box(f"vent-{i}", -w * 0.3 + i * w * 0.15, -dep * 0.55, 100 + i % 2 * 24, 44, 10, 14, "body")
        if d.get("freezer"):
            p.box("compressor-grille", 0, dep * 0.52, h * 0.18, w * 0.62, 24, h * 0.2, "accent")

    elif recipe == "dewar_rack":
        p.box("base-frame", 0, 0, 0, w, dep, 38, "accent")
        for x in (-w * 0.42, w * 0.42):
            p.box(f"upright-{x}", x, 0, 0, 38, 38, h, "body")
        p.box("top-retainer", 0, 0, h - 85, w, 34, 50, "accent")
        n = d.get("vessels", 3)
        for i in range(n):
            x = -w * 0.31 + i * w * 0.62 / max(1, n - 1)
            p.cyl(f"dewar-body-{i}", x, 0, 45, h * 0.72, 95, "body", 10)
            p.cyl(f"dewar-neck-{i}", x, 0, h * 0.72 + 45, h * 0.12, 40, "accent", 10)
            p.box(f"retaining-strap-{i}", x, -dep * 0.46, h * 0.55, 180, 20, 22, "accent")

    elif recipe == "shower":
        p.box("base-plate", 0, 0, 0, w, dep, 28, "accent")
        p.cyl("shower-column", 0, 0, 20, h - 120, 28, "body")
        p.box("overhead-arm", 0, 0, h - 145, w * 0.86, 42, 38, "accent")
        p.cyl("shower-head", 0, 0, h - 190, 45, 92, "body", 10)
        p.box("pull-rod", -w * 0.28, 0, h * 0.56, 22, 22, h * 0.42, "accent")
        p.box("pull-handle", -w * 0.28, 0, h * 0.55, 190, 30, 24, "body")
        if d.get("eyewash"):
            for side in (-1, 1):
                x = side * w * 0.34
                p.cyl(f"eyewash-stand-{side}", x, 0, 35, 340, 18, "accent")
                p.cyl(f"eyewash-bowl-{side}", x, 0, 350, 38, 62, "body", 10)
                p.cyl(f"spray-head-{side}", x, 0, 388, 30, 26, "accent")

    else:
        raise ValueError(f"unknown recipe: {recipe}")

    return p.lines


def source_for(asset):
    aid, title, description, recipe, _ = asset
    safe = re.sub(r"[^A-Za-z0-9_-]+", "-", aid).strip("-")
    parts = build(asset)
    lines = [
        "// SPDX-License-Identifier: CC0-1.0",
        f"// Original kernelCAD low-poly {title.lower()} scene prop, modeled from scratch.",
        "meta({",
        f"  name: '{safe}',",
        "  license: 'CC0-1.0',",
        f"  title: '{title}',",
        f"  description: '{description} Knobs: overall scale, body color and accent color.',",
        "  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],",
        "  kit: 'lab-infrastructure',",
        f"  category: '{'structure' if recipe in ('bridge', 'partition', 'canopy', 'riser') else 'prop'}',",
        "  origin: 'base',",
        "  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],",
        "  triangleBudget: 1800",
        "});",
        "",
        "const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });",
        "const body = param('body', '#829092', { label: 'Body color' });",
        "const accent = param('accent', '#39a89b', { label: 'Accent color' });",
        f"const p = assembly('{safe}');",
        "const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));",
        *parts,
        "",
        "return p.model();",
        "",
    ]
    return "\n".join(lines)


def write_readme():
    rows = [
        "# Laboratory Infrastructure kit",
        "",
        "Sixty original low-poly room-planning props for laboratory work areas, storage, service distribution, local extraction, cleanroom transitions and cold rooms. Sources use millimetres, Z up and a ground-level base origin. Each asset exposes `scale`, `body` and `accent` controls and declares a 1,800 triangle budget. The models are visual scene props, not engineering, safety or compliance specifications.",
        "",
        "The [laboratory infrastructure wave demo bundle](../../../artifacts/catalog-demos/lab-infrastructure-wave-20261102/README.md) retains the generator, capture settings, audit evidence and inspected MP4. It shows local catalog behavior; deployment and physical acceptance are separate states.",
        "",
        "| id | asset | description | knobs |",
        "| --- | --- | --- | --- |",
    ]
    for aid, title, description, _, _ in ASSETS:
        rows.append(f"| `{aid}` | {title} | {description} | scale · body · accent |")
    rows.extend([
        "",
        "## Use a catalog asset",
        "",
        "Search the catalog for a laboratory fixture, or open a known asset in Studio with `?catalog=lab-infrastructure/<id>`. For example, `?catalog=lab-infrastructure/laboratory-fume-hood` opens the original source with its scale and palette controls.",
        "",
        "## Rebuild and verify",
        "",
        "```sh",
        "python3 -B artifacts/catalog-demos/lab-infrastructure-wave-20261102/generate_lab_infrastructure_assets.py",
        "npx tsx scripts/buildAssetCatalog.ts",
        "npx eslint catalog/",
        "npx vitest run tests/integration/catalog/",
        "npx tsx scripts/renderCatalogPreviews.ts " + " ".join(asset[0] for asset in ASSETS),
        "npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-lab-infrastructure-pages",
        "```",
        "",
        "## Licence and provenance",
        "",
        "All assets are dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Geometry is created from kernelCAD primitives; no external meshes, textures or product images are included.",
        "",
    ])
    (KIT / "README.md").write_text("\n".join(rows), encoding="utf-8")


def main():
    if len(ASSETS) != 60 or len({asset[0] for asset in ASSETS}) != len(ASSETS):
        raise SystemExit("expected 60 assets with unique ids")
    KIT.mkdir(parents=True, exist_ok=True)
    for asset in ASSETS:
        (KIT / f"{asset[0]}.kcad.ts").write_text(source_for(asset), encoding="utf-8")
    (KIT / "kit.json").write_text(
        '{\n  "title": "Laboratory Infrastructure",\n'
        '  "description": "Original low-poly laboratory work surfaces, service systems, extraction enclosures, cleanroom fixtures and cold-room props with editable scale and palette controls."\n}\n',
        encoding="utf-8",
    )
    write_readme()
    print(f"wrote {len(ASSETS)} laboratory infrastructure assets to {KIT}")


if __name__ == "__main__":
    main()
