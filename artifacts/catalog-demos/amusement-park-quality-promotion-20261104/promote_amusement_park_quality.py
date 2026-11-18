#!/usr/bin/env python3
"""Promote the existing amusement-park sources with material and silhouette detail."""

from __future__ import annotations

import importlib.util
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/amusement-park"
GENERATOR = ROOT / "artifacts/catalog-demos/amusement-park-wave-20261103/generate_amusement_park_assets.py"

MATERIALS = {
    "acrylic": ("Tinted acrylic", "#63aab8", "#79c8d2", "#41768b"),
    "aluminum": ("Anodized aluminum", "#9caeb0", "#c2c9c5", "#718a94"),
    "anodizedAluminum": ("Anodized aluminum", "#859b9e", "#b7c4c3", "#576f78"),
    "canvas": ("Canvas", "#e0c98e", "#eddaa9", "#a85e4f"),
    "concrete": ("Concrete", "#92938b", "#aaa99e", "#6f7477"),
    "enamel": ("Baked enamel", "#cc684e", "#edb34d", "#385b81"),
    "fabric": ("Upholstery fabric", "#c77786", "#e4b765", "#557b8a"),
    "fiberglass": ("Painted fiberglass", "#4d8290", "#d7a83f", "#96566d"),
    "glass": ("Tinted glass", "#75b9bf", "#efce70", "#6387aa"),
    "galvanizedSteel": ("Galvanized steel", "#7e8d92", "#9aa7a8", "#586c73"),
    "leaves": ("Foliage", "#6d8d47", "#91a84e", "#456f42"),
    "nylon": ("Nylon", "#a98b58", "#d3a84f", "#627e8d"),
    "paintedTimber": ("Painted timber", "#92704e", "#be8a4e", "#5e7181"),
    "polymer": ("Molded polymer", "#586f7a", "#7d9b93", "#455e83"),
    "powderCoat": ("Powder-coated steel", "#477985", "#d47452", "#35576f"),
    "rubber": ("Rubber", "#292f33", "#3c4245", "#20262a"),
    "stainlessSteel": ("Stainless steel", "#b0b9b6", "#d1d1c6", "#788b91"),
    "steel": ("Painted steel", "#738087", "#9da3a0", "#4f626c"),
    "timber": ("Sealed timber", "#8a6748", "#ab8051", "#604b3b"),
    "rope": ("Braided rope", "#aa8c61", "#d1ad72", "#7b6347"),
}

# Three material controls per prop. These are deliberately object-specific:
# a park cart gets rubber and metal, while a kiosk gets glass and painted stock.
ROLE_OVERRIDES = {
    "park-entry-arch": ("concrete", "powderCoat", "enamel"),
    "ticket-window-booth": ("paintedTimber", "stainlessSteel", "glass"),
    "admission-turnstile-bank": ("stainlessSteel", "anodizedAluminum", "polymer"),
    "ticket-vending-kiosk": ("powderCoat", "stainlessSteel", "glass"),
    "guest-services-map-kiosk": ("paintedTimber", "stainlessSteel", "acrylic"),
    "wayfinding-pylon": ("powderCoat", "anodizedAluminum", "enamel"),
    "entrance-planter": ("concrete", "powderCoat", "leaves"),
    "stroller-parking-rack": ("powderCoat", "stainlessSteel", "acrylic"),
    "park-stroller": ("aluminum", "fabric", "rubber"),
    "family-locker-bank": ("powderCoat", "stainlessSteel", "polymer"),
    "wristband-checkin-desk": ("paintedTimber", "stainlessSteel", "acrylic"),
    "lost-child-kiosk": ("powderCoat", "paintedTimber", "fabric"),
    "first-aid-response-cart": ("powderCoat", "stainlessSteel", "rubber"),
    "accessible-entry-queue-gate": ("stainlessSteel", "powderCoat", "rubber"),
    "entrance-photo-frame": ("powderCoat", "aluminum", "acrylic"),
    "park-observation-wheel": ("concrete", "galvanizedSteel", "enamel"),
    "family-carousel": ("powderCoat", "stainlessSteel", "fiberglass"),
    "tea-cup-spinner-car": ("fiberglass", "stainlessSteel", "rubber"),
    "junior-coaster-train-car": ("fiberglass", "steel", "rubber"),
    "junior-coaster-track-section": ("steel", "timber", "concrete"),
    "bumper-car": ("fiberglass", "stainlessSteel", "rubber", "enamel"),
    "miniature-park-tram-engine": ("enamel", "steel", "rubber"),
    "miniature-park-tram-coach": ("enamel", "steel", "rubber"),
    "drop-tower-seat-ring": ("fiberglass", "steel", "rubber"),
    "log-flume-boat": ("fiberglass", "stainlessSteel", "rubber"),
    "pirate-ship-ride-car": ("timber", "steel", "canvas"),
    "splash-pad-jet-column": ("stainlessSteel", "rubber", "enamel"),
    "playground-climber": ("powderCoat", "steel", "rubber"),
    "rope-net-tunnel": ("steel", "nylon", "rubber"),
    "ride-load-platform": ("steel", "concrete", "rubber"),
    "ride-operator-console": ("powderCoat", "stainlessSteel", "acrylic"),
    "ride-photo-camera": ("powderCoat", "stainlessSteel", "glass"),
    "ride-photo-preview-kiosk": ("powderCoat", "stainlessSteel", "glass"),
    "height-check-marker": ("powderCoat", "steel", "acrylic"),
    "queue-switchback-rail": ("galvanizedSteel", "concrete", "enamel"),
    "queue-shade-canopy": ("steel", "canvas", "enamel"),
    "accessible-ride-transfer-bench": ("stainlessSteel", "fiberglass", "rubber"),
    "ring-toss-game-counter": ("paintedTimber", "steel", "enamel"),
    "water-race-game-lane": ("fiberglass", "stainlessSteel", "acrylic"),
    "duck-pond-game-trough": ("fiberglass", "enamel", "rubber"),
    "balloon-dart-gallery": ("paintedTimber", "steel", "rubber"),
    "skee-ball-lane": ("paintedTimber", "stainlessSteel", "enamel"),
    "ball-toss-target-wall": ("paintedTimber", "steel", "enamel"),
    "prize-wall-display": ("paintedTimber", "steel", "fabric"),
    "game-token-counter": ("paintedTimber", "steel", "glass"),
    "midway-scoreboard": ("steel", "enamel", "acrylic"),
    "midway-barker-microphone-stand": ("paintedTimber", "steel", "enamel"),
    "popcorn-warmer-kiosk": ("stainlessSteel", "enamel", "glass", "canvas"),
    "cotton-candy-cart": ("powderCoat", "stainlessSteel", "acrylic"),
    "pretzel-warmer-counter": ("stainlessSteel", "enamel", "glass"),
    "ice-cream-cart": ("powderCoat", "stainlessSteel", "rubber"),
    "lemonade-dispenser-cart": ("stainlessSteel", "acrylic", "rubber"),
    "churro-warmer-cart": ("stainlessSteel", "enamel", "rubber"),
    "funnel-cake-kiosk": ("stainlessSteel", "enamel", "powderCoat"),
    "soft-drink-fountain": ("stainlessSteel", "acrylic", "rubber"),
    "refillable-cup-rack": ("stainlessSteel", "polymer", "enamel"),
    "condiment-counter": ("stainlessSteel", "acrylic", "polymer"),
    "picnic-table-with-umbrella": ("timber", "steel", "canvas"),
    "park-water-fountain": ("stainlessSteel", "concrete", "acrylic"),
    "family-plaza-shade-pavilion": ("steel", "canvas", "concrete"),
    "family-rest-bench": ("timber", "steel", "rubber"),
    "stroller-service-station": ("steel", "stainlessSteel", "rubber"),
    "parade-rope-stanchion": ("stainlessSteel", "rope", "concrete"),
    "park-waste-sorting-station": ("powderCoat", "stainlessSteel", "enamel"),
    "park-pathway-bollard-light": ("stainlessSteel", "acrylic", "concrete"),
    "character-meet-backdrop": ("fabric", "timber", "powderCoat"),
    "character-meet-photo-easel": ("timber", "aluminum", "acrylic"),
    "park-maintenance-golf-cart": ("enamel", "steel", "rubber"),
    "ride-maintenance-tool-cart": ("powderCoat", "steel", "rubber"),
    "park-operations-radio-rack": ("powderCoat", "stainlessSteel", "acrylic"),
}

STRUCTURAL = re.compile(
    r"rail|post|support|frame|mast|axle|leg|handle|beam|bracket|pole|rod|rung|bar|"
    r"brace|keel|base-foot|pipe|column|hub|foot|wheel|rim|spoke|shaft|stanchion|"
    r"stand|cross|chain|strut|tripod|shelf|sill|plinth|foundation|anchor|gate|"
    r"canopy-post|awning-post|step|tread|latch|grate|cradle|nozzle|tray|drawer|"
    r"screen-frame|window-frame|case-roof|boiler|cabinet|chassis|underframe|floor-pan",
    re.I,
)


def load_generator():
    spec = importlib.util.spec_from_file_location("amusement_park_generator", GENERATOR)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {GENERATOR}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


GEN = load_generator()


def special_match(material: str, name: str) -> bool:
    patterns = {
        "rubber": r"wheel|bumper|roller|caster|grip|tire|tyre|footpad|buffer|gutter|stop",
        "glass": r"glass|window|screen|display|lens|glazing|case-front|case-side|sample-panel|map-panel",
        "acrylic": r"display|screen|map-panel|reader|marker|panel|target|lamp|button|indicator|ball|emblem|sign|sample|face|blade|slot|splashback|opening-rim",
        "canvas": r"canopy|awning|sail|shade|roof-panel|umbrella|curtain|fabric",
        "fabric": r"seat|cushion|curtain|plush|backdrop|upholstery|waiting-mark",
        "nylon": r"net|rope|strand|sail|tunnel",
        "rope": r"rope|span|clip",
        "leaves": r"shrub|foliage|leaf",
        "concrete": r"foundation|anchor-foot|weighted-base|base-foot|plinth|foot-plate|foot-\d",
        "enamel": r"seat|target|duck|balloon|score|emblem|lamp|door|lid|bin|badge|cap|crest|tab|flag|race-ball|bottle|cup-body|sail|awning|case-roof|serving-shelf|sun-shield|roof|\bgondola-\d+$",
        "fiberglass": r"hull|prow|stern|nose|fairing|cup-body|gondola|seat-ring|car-body|spinner-base|jet-column|boat",
        "polymer": r"handle|door|button|reader|cup-holder|lid|bin|seat|bottle|screen|bumper|turnstile-arm|grip",
        "paintedTimber": r"counter|booth|backboard|table|shelf|podium|plush|body|panel|plank|lane-base|backdrop|case",
        "timber": r"seat|bench|slat|table|plank|deck|mast|sail|hull|counter|shelf|beam|backdrop|floor|roof",
        "stainlessSteel": r"rail|post|support|frame|mast|axle|leg|handle|beam|bracket|pole|rod|rung|bar|brace|keel|pipe|column|hub|foot|wheel|rim|spoke|shaft|stanchion|stand|cross|chain|strut|tripod|tray|drawer|nozzle|bubbler|step|latch|grate|cradle|caster|steel|metal",
        "steel": r"rail|post|support|frame|mast|axle|leg|handle|beam|bracket|pole|rod|rung|bar|brace|keel|pipe|column|hub|foot|wheel|rim|spoke|shaft|stanchion|stand|cross|chain|strut|tripod|tray|drawer|nozzle|bubbler|step|latch|grate|cradle|caster|steel|metal",
        "galvanizedSteel": r"rail|post|support|frame|mast|axle|leg|handle|beam|bracket|pole|rod|rung|bar|brace|keel|pipe|column|hub|foot|wheel|rim|spoke|shaft|stanchion|stand|cross|chain|strut|tripod|tray|drawer|nozzle|step|latch|grate|cradle|caster",
        "anodizedAluminum": r"rail|post|support|frame|mast|axle|leg|handle|beam|bracket|pole|rod|rung|bar|brace|column|hub|shaft|stanchion|stand|tripod|wheel|rim|spoke|metal",
        "aluminum": r"rail|post|support|frame|mast|axle|leg|handle|beam|bracket|pole|rod|rung|bar|brace|column|hub|shaft|stanchion|stand|tripod|wheel|rim|spoke|metal",
    }
    pattern = patterns.get(material)
    return bool(pattern and re.search(pattern, name, re.I))


def role_assignment(item: dict, roles: tuple[str, str, str]) -> dict[str, str]:
    names = [part["name"] for part in item["parts"]]
    third = roles[2]
    third_names = [name for name in names if special_match(third, name)]
    if not third_names and item["id"] != "popcorn-warmer-kiosk":
        third_names = [names[-1]]

    second = roles[1]
    second_names = [name for name in names if name not in third_names and STRUCTURAL.search(name)]
    if not second_names:
        second_names = [name for name in names if name not in third_names][:1]

    assignment = {name: roles[0] for name in names}
    assignment.update({name: second for name in second_names})
    assignment.update({name: third for name in third_names})

    extras = {}
    if item["id"] == "park-observation-wheel":
        extras = {"wheel-rim": roles[1]}
    elif item["id"] == "bumper-car":
        extras = {
            "nose": roles[0],
            "seat-pan": roles[3], "seat-back": roles[3],
            "seat-bolster-left": roles[3], "seat-bolster-right": roles[3],
        }
    elif item["id"] in {"log-flume-boat", "pirate-ship-ride-car"}:
        extras = {"nose" if item["id"] == "bumper-car" else "hull": roles[0]}
    elif item["id"] == "popcorn-warmer-kiosk":
        extras = {
            "glass-left": roles[2], "glass-right": roles[2], "glass-back": roles[2],
            **{f"popcorn-kernel-{i}": roles[1] for i in range(5)},
            **{f"case-post-{i}": roles[0] for i in range(4)},
            "awning-stripe-0": roles[3], "awning-stripe-1": roles[1],
            "awning-stripe-2": roles[3], "awning-stripe-3": roles[1],
            "awning-stripe-4": roles[3],
        }
    assignment.update(extras)
    if item["id"] == "park-observation-wheel":
        for name in names:
            if name.startswith("gondola-"):
                assignment[name] = roles[2] if name.startswith("gondola-") and not name.startswith("gondola-hanger-") else roles[1]
    if item["id"] == "bumper-car":
        assignment["power-pickup"] = roles[1]
    for role in roles[3:]:
        selected = [name for name in names if special_match(role, name) and assignment[name] != roles[2]]
        if not selected:
            selected = [next((name for name in reversed(names) if assignment[name] == roles[0]), names[-1])]
        for name in selected:
            assignment[name] = role
    return assignment


def role_params(roles: tuple[str, ...], asset_id: str) -> str:
    rows = []
    for role in roles:
        label, default, _festival, _twilight = MATERIALS[role]
        if asset_id == "popcorn-warmer-kiosk" and role == "enamel":
            default = "#efb62e"
        rows.append(f'const {role} = param("{role}", "{default}", {{ label: "{label}" }});')
    return "\n".join(rows)


def presets_block(roles: tuple[str, ...]) -> str:
    festival = {role: MATERIALS[role][2] for role in roles}
    twilight = {role: MATERIALS[role][3] for role in roles}
    return "presets({\n  festival: " + json.dumps(festival, indent=4) + ",\n  twilight: " + json.dumps(twilight, indent=4) + ",\n});"


def place_helper_for_item(assignment: dict[str, str], roles: tuple[str, ...]) -> str:
    groups: dict[str, list[str]] = {role: [] for role in roles}
    for part_name, role in assignment.items():
        groups[role].append(part_name)
    first = roles[0]
    first_json = json.dumps(sorted(groups[first]), ensure_ascii=True)
    branches = []
    for role in reversed(roles[1:]):
        role_json = json.dumps(sorted(groups[role]), ensure_ascii=True)
        branches.append(f'  else if ({role_json}.includes(name)) p.part(name, positioned.color({role}));')
    return f'''const place = (name: string, shape: Shape, at: [number, number, number]) => {{
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if ({first_json}.includes(name)) p.part(name, positioned.color({first}));
{chr(10).join(branches)}
  else p.part(name, positioned.color({first}));
}};'''


def geometry_definitions(asset_id: str) -> str:
    if asset_id == "park-observation-wheel":
        return '''const gondolaLower = path().moveTo(-175, -150).lineTo(175, -150).lineTo(175, 150).lineTo(-175, 150).close();
const gondolaUpper = path().moveTo(-150, -130).lineTo(150, -130).lineTo(150, 130).lineTo(-150, 130).close();
const gondolaBody = gondolaLower.loft(gondolaUpper, { spacing: 330, ruled: true });'''
    if asset_id == "bumper-car":
        return '''const noseProfile = path().moveTo(-190, -150).lineTo(190, -150).lineTo(145, 120).lineTo(-135, 150).close();
const taperedNose = noseProfile.extrude(640).rotate([1, 0, 0], 90).rotate([0, 1, 0], -15).translate(0, 320, 0);
const carDeck = path().moveTo(-620, -420).lineTo(430, -420).lineTo(620, -270)
  .lineTo(620, 270).lineTo(430, 420).lineTo(-500, 420).lineTo(-620, 280).close().extrude(180);'''
    if asset_id in {"log-flume-boat", "pirate-ship-ride-car"}:
        return '''const boatHull = (length: number, width: number, height: number) =>
  path().moveTo(-length / 2, -height / 2).lineTo(length / 2, -height / 2)
    .lineTo(length / 2, -height * 0.12).lineTo(length * 0.68, height / 2)
    .lineTo(-length * 0.68, height / 2).lineTo(-length / 2, -height * 0.12).close()
    .extrude(width).rotate([1, 0, 0], 90).translate(0, width / 2, 0);'''
    return ""


def upgrade_geometry(item: dict, source: str) -> str:
    asset_id = item["id"]
    if asset_id == "park-observation-wheel":
        source = re.sub(r'^B\("rim-segment-\d+",.*?\);\n', "", source, flags=re.M)
        source = re.sub(
            r'^B\("gondola-(\d+)", \[350, 300, 330\], \[0, ([^,]+), ([^\]]+)\]\);$',
            lambda m: f'place("gondola-{m.group(1)}", gondolaBody, [0, {m.group(2)}, {float(m.group(3)) - 165:.6f}]);',
            source,
            flags=re.M,
        )
        source = source.replace(
            "return p.model();",
            'place("wheel-rim", cylinder(115, 1880, 32).subtract(cylinder(117, 1760, 32).translate(0, 0, -1)).rotate([0, 1, 0], 90), [-57.5, 0, 3720]);\n\nreturn p.model();',
        )
    elif asset_id == "bumper-car":
        source = source.replace('B("floor-pan", [1250, 940, 180], [0, 0, 280]);', 'place("floor-pan", carDeck, [0, 0, 190]);')
        source = source.replace(
            'B("seat", [420, 500, 300], [-120, 0, 500]);',
            '''B("seat-pan", [420, 400, 85], [-120, 0, 385]);
B("seat-back", [420, 90, 330], [-120, 170, 550], [-12, 0, 0]);
B("seat-bolster-left", [70, 360, 210], [-295, 15, 470]);
B("seat-bolster-right", [70, 360, 210], [55, 15, 470]);''',
        )
        source = re.sub(
            r'^B\("nose", \[380, 640, 300\], \[510, 0, 440\], \[0, -15, 0\]\);$',
            'place("nose", taperedNose, [510, 0, 440]);',
            source,
            flags=re.M,
        )
    elif asset_id == "log-flume-boat":
        source = source.replace('B("hull", [2080, 1040, 390], [0, 0, 420], [0, -7, 0]);', 'place("hull", boatHull(2080, 1040, 390).rotate([0, 1, 0], -7), [0, 0, 420]);')
    elif asset_id == "pirate-ship-ride-car":
        source = source.replace('B("hull", [2240, 720, 420], [0, 0, 500]);', 'place("hull", boatHull(2240, 720, 420), [0, 0, 500]);')
    elif asset_id == "popcorn-warmer-kiosk":
        source = source.replace('B("warming-case", [920, 740, 900], [0, -80, 1530]);\n', "")
        source = source.replace(
            "return p.model();",
            '''place("glass-back", box(800, 24, 710, true), [0, 294, 1530]);
place("glass-left", box(24, 650, 710, true), [-448, -80, 1530]);
place("glass-right", box(24, 650, 710, true), [448, -80, 1530]);
place("warming-tray", box(760, 610, 40, true), [0, -80, 1100]);
place("case-post-0", box(35, 35, 900, true), [-442, -420, 1530]);
place("case-post-1", box(35, 35, 900, true), [442, -420, 1530]);
place("case-post-2", box(35, 35, 900, true), [-442, 260, 1530]);
place("case-post-3", box(35, 35, 900, true), [442, 260, 1530]);
place("popcorn-kernel-0", sphere(105), [-170, -80, 1200]);
place("popcorn-kernel-1", sphere(105), [0, -80, 1200]);
place("popcorn-kernel-2", sphere(105), [170, -80, 1200]);
place("popcorn-kernel-3", sphere(95), [-85, -80, 1360]);
place("popcorn-kernel-4", sphere(95), [85, -80, 1360]);
place("awning-stripe-0", box(260, 1300, 16, true), [-780, 0, 2420]);
place("awning-stripe-1", box(260, 1300, 16, true), [-390, 0, 2420]);
place("awning-stripe-2", box(260, 1300, 16, true), [0, 0, 2420]);
place("awning-stripe-3", box(260, 1300, 16, true), [390, 0, 2420]);
place("awning-stripe-4", box(260, 1300, 16, true), [780, 0, 2420]);

return p.model();''',
        )
    definitions = geometry_definitions(asset_id)
    if definitions:
        source = source.replace(f'const p = assembly("{asset_id}");', f'const p = assembly("{asset_id}");\n\n{definitions}')
    return source


def promoted_source(item: dict) -> str:
    asset_id = item["id"]
    roles = ROLE_OVERRIDES[asset_id]
    assignment = role_assignment(item, roles)
    source = GEN.source_for(item)
    description = item["description"]
    if asset_id == "park-observation-wheel":
        description = description.replace("segmented rim", "faceted continuous rim")
    source = source.replace(
        "// Original amusement-park scene asset. Millimetres, Z up, base origin.",
        f'// {item["title"]}: {description}',
    )
    source = re.sub(
        r'const color = param\("color", "#[0-9a-fA-F]{6}", \{ label: "Asset color" \}\);',
        role_params(roles, asset_id) + "\n\n" + presets_block(roles),
        source,
    )
    old_helper = '''const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale).color(color));
};'''
    source = source.replace(old_helper, place_helper_for_item(assignment, roles))
    controls = ", ".join(roles)
    source = source.replace(
        item["description"] + " Editable overall scale and asset color.",
        description + f" Controls: overall scale, {controls}; festival and twilight material presets.",
    )
    source = upgrade_geometry(item, source)
    return source


def update_readme() -> None:
    path = KIT / "README.md"
    text = path.read_text(encoding="utf-8")
    text = re.sub(
        r"Seventy original low-poly props.*?CC0 1\.0\.",
        "Seventy original low-poly props for an amusement-park guest precinct and its supporting operations. Sources use millimetres and Z up. Each prop exposes overall scale, three material-named colour controls, and `festival` / `twilight` presets. Attraction and food-service silhouettes use faceted metalwork, tapered ride cabins and boat hulls, shaped car fairings, and a glazed popcorn warmer. Every asset keeps its 1,800-triangle ceiling. All geometry is dedicated to the public domain under CC0 1.0.",
        text,
        count=1,
        flags=re.S,
    )
    text = text.replace(
        "The [amusement-park wave bundle](../../../artifacts/catalog-demos/amusement-park-wave-20261103/README.md) contains the reproducible source generator, catalog audit, rendered previews, parameter check, and inspected MP4 walkthrough.",
        "The [amusement-park quality-promotion bundle](../../../artifacts/catalog-demos/amusement-park-quality-promotion-20261104/README.md) retains the source promotion, preview checks, catalog validation, and inspected MP4 walkthrough. The earlier [kit creation bundle](../../../artifacts/catalog-demos/amusement-park-wave-20261103/README.md) retains the original source generator.",
    )
    path.write_text(text, encoding="utf-8")


def main() -> None:
    items = GEN.ASSETS
    if len(items) != 70 or set(item["id"] for item in items) != set(ROLE_OVERRIDES):
        raise SystemExit("expected the 70 existing amusement-park IDs and one material recipe per asset")
    for item in items:
        (KIT / f'{item["id"]}.kcad.ts').write_text(promoted_source(item), encoding="utf-8")
    update_readme()
    print(f"promoted material controls and silhouettes on {len(items)} existing assets")


if __name__ == "__main__":
    main()
