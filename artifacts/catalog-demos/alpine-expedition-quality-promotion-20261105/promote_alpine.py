#!/usr/bin/env python3
"""Promote the existing alpine-expedition assets to material-separated models.

The script is intentionally asset-aware: it adds useful material controls,
maps named parts to their likely material, and corrects several silhouettes
that were unreadable in the original flat-color previews.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/alpine-expedition"

COLORS = {
    "nylon": "#4c7063",
    "polyester": "#bd7547",
    "webbing": "#d7a43e",
    "aluminium": "#b6c0c2",
    "steel": "#69747a",
    "rubber": "#30383d",
    "polymer": "#53676b",
    "glass": "#5c9eaa",
    "foam": "#d1c1a3",
    "polycarbonate": "#d47b3e",
    "silicone": "#465860",
    "stainlessSteel": "#c0c7c7",
    "silicon": "#315778",
}

LABELS = {
    "nylon": "Nylon fabric",
    "polyester": "Polyester fabric",
    "webbing": "Polyamide webbing",
    "aluminium": "Aluminium",
    "steel": "Steel",
    "rubber": "Rubber",
    "polymer": "Engineering polymer",
    "glass": "Glass",
    "foam": "Foam",
    "polycarbonate": "Polycarbonate",
    "silicone": "Silicone",
    "stainlessSteel": "Stainless steel",
    "silicon": "Silicon cells",
}

PALETTES: dict[str, tuple[str, ...]] = {
    "alpine-dry-bag": ("nylon", "webbing", "polymer"),
    "alpine-helmet": ("polycarbonate", "foam", "webbing"),
    "alpine-pack-cover": ("nylon", "polyester", "webbing"),
    "alpine-rescue-stretcher": ("nylon", "aluminium", "webbing"),
    "avalanche-probe": ("aluminium", "steel", "webbing"),
    "avalanche-shovel": ("aluminium", "steel", "rubber"),
    "avalanche-transceiver": ("polymer", "glass", "rubber"),
    "basecamp-dome-tent": ("nylon", "polyester", "aluminium"),
    "bear-canister": ("polymer", "stainlessSteel", "rubber"),
    "belay-device": ("aluminium", "steel"),
    "camp-cot": ("polyester", "aluminium"),
    "climbing-cam": ("aluminium", "steel", "nylon"),
    "climbing-chalk-bag": ("nylon", "polyester", "webbing"),
    "climbing-harness": ("nylon", "webbing", "aluminium"),
    "climbing-quickdraw": ("aluminium", "steel", "nylon"),
    "climbing-rope-coil": ("nylon", "polyester", "webbing"),
    "crampons": ("steel", "aluminium"),
    "expedition-duffel": ("nylon", "polyester", "webbing"),
    "expedition-headlamp": ("polymer", "glass", "nylon"),
    "expedition-power-bank": ("polymer", "aluminium", "rubber"),
    "expedition-radio": ("polymer", "glass", "rubber"),
    "expedition-solar-panel": ("polymer", "silicon", "aluminium"),
    "expedition-tarp": ("nylon", "polyester", "aluminium"),
    "expedition-water-filter": ("polymer", "silicone", "rubber"),
    "four-season-tent": ("nylon", "polyester", "aluminium"),
    "glacier-goggles": ("polycarbonate", "glass", "nylon"),
    "glacier-picket": ("steel", "aluminium"),
    "handheld-gps": ("polymer", "glass", "rubber"),
    "hydration-reservoir": ("nylon", "silicone", "rubber"),
    "ice-axe": ("aluminium", "steel", "rubber", "webbing"),
    "ice-screw": ("steel", "aluminium"),
    "insulated-flask": ("stainlessSteel", "polymer", "silicone"),
    "insulated-sleeping-pad": ("nylon", "foam", "silicone"),
    "locking-carabiner": ("aluminium", "steel"),
    "mountain-weather-meter": ("polymer", "aluminium", "polycarbonate"),
    "mountaineering-bivy": ("nylon", "polyester", "aluminium"),
    "nut-tool": ("steel", "aluminium", "rubber"),
    "rescue-bivy": ("nylon", "polyester", "webbing"),
    "rescue-pulley": ("aluminium", "steel"),
    "rope-haul-bag": ("nylon", "polyester", "webbing"),
    "satellite-messenger": ("polymer", "glass", "rubber"),
    "ski-touring-skins": ("nylon", "rubber", "aluminium"),
    "snow-anchor": ("aluminium", "steel"),
    "snow-saw": ("aluminium", "steel", "rubber"),
    "snow-wall-shovel": ("aluminium", "steel", "rubber"),
    "snowshoes": ("aluminium", "nylon", "rubber"),
    "summit-marker-post": ("steel", "aluminium", "polyester"),
    "tent-footprint": ("polyester", "nylon", "webbing"),
    "tent-pole-bundle": ("aluminium", "nylon", "steel"),
    "trail-gaiters": ("nylon", "rubber", "steel"),
}

NAME_PATTERNS = {
    "transparent": re.compile(r"screen|display|lens|window|glazing", re.I),
    "solar": re.compile(r"cell|solar", re.I),
    "webbing": re.compile(r"strap|sling|loop|cord|band|tab|keeper|leash|tie|harness|zipper|seam", re.I),
    "grippy": re.compile(r"grip|valve|seal|bumper|foot-pad|corner-guard|lining|liner|button|control|key", re.I),
    "sharpMetal": re.compile(r"blade|pick|adze|spike|tooth|thread|screw|pin|gate|cam|hook|tip|point|axle|hanger|sheave", re.I),
    "metal": re.compile(r"shaft|pole|mast|rail|frame|crossbar|bar|axle|pin|plate|anchor|picket|ferrule|vane|cup|buckle|clip|eye|rib|handle|ridge|support", re.I),
    "fabric": re.compile(r"bag|body|shell|cover|pouch|fly|floor|tarp|fabric|skin|bed|hood|panel|bladder|bivy|tent|deck|sheet|pad|apron|sack|web", re.I),
}

MATERIAL_CANDIDATES = {
    "transparent": ("glass", "polycarbonate", "silicon", "polymer"),
    "solar": ("silicon", "glass", "polycarbonate"),
    "webbing": ("webbing", "nylon", "polyester"),
    "grippy": ("rubber", "silicone", "foam", "polymer"),
    "sharpMetal": ("steel", "stainlessSteel", "aluminium", "polymer"),
    "metal": ("aluminium", "stainlessSteel", "steel", "polymer"),
    "fabric": ("nylon", "polyester", "polymer", "foam"),
}

PART_RE = re.compile(r"\.part\(\s*(?:'([^']+)'|\"([^\"]+)\"|`([^`]+)`)")


def material_for(asset_id: str, part_name: str, available: tuple[str, ...]) -> str:
    name = re.sub(r"\$\{[^}]+\}", "", part_name).lower()

    # These objects have face-specific material roles that are more precise
    # than broad name matching.
    if asset_id == "avalanche-transceiver":
        if "display" in name or "screen" in name:
            return "glass"
        if "control" in name or "speaker" in name:
            return "rubber" if "rubber" in available else "polymer"
        if "clip" in name:
            return "polymer"
        return "polymer"
    if asset_id == "expedition-radio":
        if "knob" in name or "push-to-talk" in name:
            return "rubber"
        if "front-face" in name:
            return "glass"
        return "polymer"
    if asset_id == "handheld-gps" and "key" in name:
        return "rubber"
    if asset_id == "ice-axe":
        if "grip" in name:
            return "rubber"
        if "strap" in name:
            return "webbing"
        if "shaft" in name:
            return "aluminium"
        return "steel"
    if asset_id == "alpine-helmet":
        if "liner" in name:
            return "foam"
        if "strap" in name:
            return "webbing"
        return "polycarbonate"
    if asset_id == "belay-device":
        return "steel" if "attachment-eye" in name else "aluminium"
    if asset_id == "ice-screw":
        if "cutting-tip" in name or "thread-rib" in name or "screw-tube" in name:
            return "steel"
        return "aluminium"
    if asset_id == "tent-pole-bundle":
        return "steel" if "ferrule" in name else "aluminium" if "pole" in name else "nylon"
    if asset_id == "glacier-goggles":
        if "lens-frame" in name:
            return "polycarbonate"
        if "lens" in name:
            return "glass"
        if "strap" in name:
            return "nylon"
    if asset_id == "mountain-weather-meter":
        if "wind-cup" in name or "direction-vane" in name or "vane-fin" in name:
            return "polycarbonate"
        if "base-foot" in name or "sensor-hub" in name or "wind-arm" in name:
            return "polymer"
        if "mast" in name:
            return "aluminium"
    if asset_id == "alpine-dry-bag" and "buckle-tab" in name:
        return "polymer"
    if asset_id == "alpine-pack-cover" and "apron" in name:
        return "polyester"
    if asset_id == "climbing-rope-coil":
        if "keeper" in name:
            return "webbing"
        if "rope-end-two" in name:
            return "polyester"
        if "rope" in name:
            return "nylon"
    if asset_id == "bear-canister":
        if "grip" in name:
            return "rubber"
        if "tab" in name:
            return "stainlessSteel"
    if asset_id == "hydration-reservoir":
        if "tube" in name or "fill-cap" in name:
            return "silicone"
        if "bite-valve" in name:
            return "rubber"
    if asset_id == "insulated-flask":
        if "body" in name or "neck" in name:
            return "stainlessSteel"
        if "cap" in name or "carry-loop" in name:
            return "polymer"
        if "guard" in name:
            return "silicone"
    if asset_id == "ski-touring-skins":
        if "skin-strip" in name or "tip-loop" in name:
            return "nylon"
        if "backing-tab" in name:
            return "rubber"
        if "clip" in name:
            return "aluminium"
    if asset_id == "snow-anchor" and "anchor-cable" in name:
        return "steel"
    if asset_id == "expedition-water-filter":
        if "body" in name:
            return "polymer"
        if "cap" in name:
            return "silicone"
        if "connector" in name:
            return "rubber"
    if asset_id == "snow-saw":
        if "blade-spine" in name:
            return "aluminium"
        if "handle" in name:
            return "rubber"
        if "blade" in name or "tooth" in name:
            return "steel"
    if asset_id == "snowshoes" and "binding" in name:
        return "rubber"
    if asset_id == "summit-marker-post":
        if "marker-post" in name or "post-cap" in name:
            return "steel"
        if "plaque" in name or "arrow-board" in name:
            return "polyester"
    if asset_id == "tent-footprint":
        if "sheet" in name:
            return "polyester"
        if "seam" in name:
            return "nylon"
        if "loop" in name:
            return "webbing"
    if asset_id == "trail-gaiters":
        if "shell" in name:
            return "nylon"
        if "strap" in name:
            return "rubber"
        if "hook" in name:
            return "steel"
    if asset_id in {"basecamp-dome-tent", "four-season-tent"}:
        if "pole" in name or "stake" in name:
            return "aluminium"
        if "floor" in name or "groundsheet" in name:
            return "polyester"
        if "inner" in name:
            return "nylon"
        if "fly" in name or "vestibule" in name or "door" in name:
            return "polyester"

    for role in ("transparent", "solar", "grippy", "webbing", "sharpMetal", "metal", "fabric"):
        if NAME_PATTERNS[role].search(name):
            for candidate in MATERIAL_CANDIDATES[role]:
                if candidate in available:
                    return candidate

    # Prefer the first listed material for the main structural component.
    return available[0]


def preset_color(material: str, bright: bool = False) -> str:
    if bright and material in {"nylon", "polyester", "webbing", "polymer", "polycarbonate", "foam"}:
        return "#e79135" if material != "webbing" else "#f1c64e"
    rgb = [int(COLORS[material][i : i + 2], 16) for i in (1, 3, 5)]
    factor = 0.78
    return "#" + "".join(f"{round(channel * factor):02x}" for channel in rgb)


def part_call_spans(src: str) -> list[tuple[str, int, int]]:
    """Return part name plus argument-expression bounds for every `.part(...)`."""
    spans: list[tuple[str, int, int]] = []
    for match in PART_RE.finditer(src):
        name = next(group for group in match.groups() if group is not None)
        open_pos = src.find("(", match.start())
        depth = 1
        quote: str | None = None
        escaped = False
        comma: int | None = None
        index = open_pos + 1
        while index < len(src):
            char = src[index]
            if quote:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == quote:
                    quote = None
            elif char in "'\"`":
                quote = char
            elif char == "(":
                depth += 1
            elif char == ")":
                depth -= 1
                if depth == 0:
                    if comma is None:
                        raise ValueError(f"part call has no shape expression: {name}")
                    start = comma + 1
                    end = index
                    while end > start and src[end - 1].isspace():
                        end -= 1
                    spans.append((name, start, end))
                    break
            elif char == "," and depth == 1 and comma is None:
                comma = index
            index += 1
        else:
            raise ValueError(f"unterminated part call: {name}")
    return spans


def replace_color_calls(src: str, assigned: dict[str, str], available: tuple[str, ...]) -> str:
    src = re.sub(r"\.color\(\s*color\s*\)", "", src)
    spans = part_call_spans(src)
    # Work backwards so insertions preserve all source offsets.
    for name, start, end in reversed(spans):
        material = assigned[name]
        src = src[:end] + f".color({material})" + src[end:]
    return src


def geometry_updates(asset_id: str, src: str) -> str:
    if asset_id == "four-season-tent":
        needle = 'p.part("tent-floor", b(0, 0, 0, 1550, 1880, 45, 0, 0, 0));'
        helper = '''const pitchedTent = () => path()
  .moveTo(-610, 0).lineTo(0, 585).lineTo(610, 0).close()
  .extrude(1530).rotateX(90).translate(0, 765, 45).scale(scale);

'''
        src = src.replace(needle, helper + needle)
        src = src.replace('p.part("inner-body", b(0, 0, 45, 1210, 1530, 545, 0, 0, 0));', 'p.part("inner-body", pitchedTent());')
        src = src.replace('p.part("left-fly", b(-180, 0, 505, 500, 1820, 32, 0, -42, 0));', 'p.part("left-fly", b(-320, 0, 300, 900, 1680, 24, 0, -40, 0));')
        src = src.replace('p.part("right-fly", b(180, 0, 505, 500, 1820, 32, 0, 42, 0));', 'p.part("right-fly", b(320, 0, 300, 900, 1680, 24, 0, 40, 0));')
        src = src.replace('p.part("door-flap", b(0, -785, 160, 540, 42, 390, 0, 0, 0));', 'p.part("door-flap", b(0, -770, 80, 380, 26, 340, 0, 0, 0));')
        src = src.replace('p.part("corner-stake-0",', 'p.part("pole-left", b(0, 0, 45, 18, 18, 850, 0, -40, 0));\np.part("pole-right", b(0, 0, 45, 18, 18, 850, 0, 40, 0));\np.part("corner-stake-0",')

    if asset_id == "basecamp-dome-tent":
        needle = 'p.part("groundsheet", b(0, 0, 0, 1900, 2300, 50, 0, 0, 0));'
        helper = '''const octagon = (rx: number, ry: number) => path()
  .moveTo(-rx * 0.72, -ry).lineTo(rx * 0.72, -ry)
  .lineTo(rx, -ry * 0.72).lineTo(rx, ry * 0.72)
  .lineTo(rx * 0.72, ry).lineTo(-rx * 0.72, ry)
  .lineTo(-rx, ry * 0.72).lineTo(-rx, -ry * 0.72).close();
const domeTent = () => {
  const sections = [[560, 700], [560, 700], [500, 620], [390, 500], [250, 340], [110, 165], [10, 15]];
  const heights = [50, 130, 360, 620, 920, 1120, 1180];
  const profiles = sections.map(([x, y]) => octagon(x, y));
  return profiles[0].loft(profiles.slice(1), {
    planes: heights.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  }).scale(scale);
};

'''
        src = src.replace(needle, helper + needle)
        src = src.replace(needle, 'p.part("groundsheet", b(0, 0, 0, 1600, 1900, 50, 0, 0, 0));')
        src = src.replace('p.part("inner-tent", b(0, 0, 50, 1450, 1750, 680, 0, 0, 0));', 'p.part("inner-tent", domeTent());')
        src = src.replace('p.part("left-fly-panel", b(-235, 0, 630, 620, 2240, 38, 0, -38, 0));\n', '')
        src = src.replace('p.part("right-fly-panel", b(235, 0, 630, 620, 2240, 38, 0, 38, 0));\n', '')
        src = src.replace('p.part("vestibule", b(0, -1260, 80, 1050, 650, 35, 0, -8, 0));', 'p.part("vestibule", b(0, -1010, 66, 760, 500, 20, 0, -10, 0));')
        src = src.replace('p.part("crossed-pole-left", c(0, 0, 60, 1120, 22, 8));', '''const tentArch = (y: number) => {
  const points: [number, number][] = [[-520, 60], [-470, 390], [-340, 760], [0, 1220], [340, 760], [470, 390], [520, 60], [485, 60], [440, 380], [315, 735], [0, 1180], [-315, 735], [-440, 380], [-485, 60]];
  let outline = path().moveTo(points[0][0], points[0][1]);
  for (const [x, z] of points.slice(1)) outline = outline.lineTo(x, z);
  return outline.close().extrude(24).rotateX(90).translate(0, y - 12, 0).scale(scale);
};
p.part("crossed-pole-left", tentArch(-320));
p.part("crossed-pole-right", tentArch(320));''')
        src = src.replace('Large expedition shelter with a raised floor, paired sloping fly panels, vestibule and crossed poles.', 'Spacious expedition dome with a raised groundsheet, faceted arched shell, vestibule and crossed support poles.')
        src = src.replace('Basecamp dome tent: Large expedition shelter with a raised floor, paired sloping fly panels, vestibule and crossed poles.', 'Basecamp dome tent: Faceted expedition dome with a raised groundsheet, vestibule and crossed support arches.')

    if asset_id == "alpine-helmet":
        needle = 'p.part("helmet-shell", c(0, 0, 60, 190, 175, 12));'
        helper = '''const helmetShell = () => path()
  .moveTo(0, 0).lineTo(148, 0).lineTo(174, 18).lineTo(166, 48)
  .lineTo(145, 82).lineTo(112, 119).lineTo(72, 148)
  .lineTo(34, 165).lineTo(0, 170).close()
  .revolve().translate(0, 0, 60).scale(scale);
const helmetLiner = () => cylinder(18, 132, 12)
  .subtract(cylinder(20, 116, 12).translate(0, 0, -1)).translate(0, 0, 40).scale(scale);
const helmetStrap = (side: number) => {
  const points: [number, number][] = [[side * 112, 66], [side * 96, 62], [side * 18, 0], [side * 4, 6]];
  let outline = path().moveTo(points[0][0], points[0][1]);
  for (const [x, z] of points.slice(1)) outline = outline.lineTo(x, z);
  return outline.close().extrude(14).rotateX(90).translate(0, -133, 0).scale(scale);
}

'''
        src = src.replace(needle, helper + 'p.part("helmet-shell", helmetShell());')
        src = src.replace('p.part("front-brim", b(0, -135, 60, 280, 110, 42, 0, 0, 0));', 'p.part("helmet-liner", helmetLiner());\np.part("front-brim", b(0, -145, 58, 160, 34, 10, 0, 0, 0));')
        src = src.replace('p.part("crown-rib-0", b(-95, 0, 235, 28, 250, 28, 0, 0, 0));\n', '')
        src = src.replace('p.part("crown-rib-1", b(0, 0, 235, 28, 250, 28, 0, 0, 0));\n', '')
        src = src.replace('p.part("crown-rib-2", b(95, 0, 235, 28, 250, 28, 0, 0, 0));\n', '')
        src = src.replace('Lightweight climbing helmet with a faceted shell, short brim, crown ribs and chin strap.', 'Faceted climbing helmet with a rounded dome, short visor, padded rim and visible chin straps.')
        src = src.replace('b(-100, 0, 0, 20, 210, 250, 0, 0, 0)', 'b(-110, -100, 0, 10, 14, 90, 0, 0, 0)')
        src = src.replace('b(100, 0, 0, 20, 210, 250, 0, 0, 0)', 'b(110, -100, 0, 10, 14, 90, 0, 0, 0)')
        src = src.replace('hx(0, -90, 35, 90, 18, 8)', 'b(0, -110, 22, 34, 14, 12, 0, 0, 0)')
        src = src.replace('p.part("chin-strap-0", b(-110, -100, 0, 10, 14, 90, 0, 0, 0));', 'p.part("chin-strap-0", helmetStrap(-1));')
        src = src.replace('p.part("chin-strap-1", b(110, -100, 0, 10, 14, 90, 0, 0, 0));', 'p.part("chin-strap-1", helmetStrap(1));')
        src = src.replace('p.part("helmet-liner", helmetLiner());', 'p.part("helmet-liner", helmetLiner());\np.part("ear-pad-left", b(-124, -35, 30, 38, 65, 32, 0, 0, 0));\np.part("ear-pad-right", b(124, -35, 30, 38, 65, 32, 0, 0, 0));')
        src = re.sub(r"^const c = \(x: number, y: number, z: number, h: number, r: number, n = 10\) => cylinder\(h, r, n\)\.translate\(x, y, z - baseZ\)\.scale\(scale\)\.color\(color\);\n", "", src, flags=re.M)
        src = re.sub(r"^const hx = \(x: number, y: number, z: number, length: number, r: number, n = 10\) => cylinder\(length, r, n\)\.alongAxis\(\[1, 0, 0\]\)\.translate\(x - length / 2, y, z - baseZ\)\.scale\(scale\)\.color\(color\);\n", "", src, flags=re.M)

    if asset_id == "avalanche-transceiver":
        needle = 'p.part("beacon-body", b(0, 0, 0, 170, 310, 58, 0, 0, 0));'
        helper = '''const beaconBody = () => path()
  .moveTo(-62, -155).lineTo(62, -155).lineTo(85, -132).lineTo(85, 132)
  .lineTo(62, 155).lineTo(-62, 155).lineTo(-85, 132).lineTo(-85, -132).close()
  .extrude(58).scale(scale);

'''
        src = src.replace(needle, helper + 'p.part("beacon-body", beaconBody());')
        src = src.replace('p.part("display-panel", b(0, -165, 20, 120, 24, 78, 0, 0, 0));', 'p.part("display-panel", b(0, -30, 58, 124, 104, 12, 0, 0, 0));\np.part("screen", b(0, -30, 70, 96, 70, 3, 0, 0, 0));')
        src = src.replace('c(-52, -190, 15, 28, 18, 8)', 'c(-52, 78, 58, 14, 14, 8)')
        src = src.replace('c(0, -190, 15, 28, 18, 8)', 'c(0, 78, 58, 14, 14, 8)')
        src = src.replace('c(52, -190, 15, 28, 18, 8)', 'c(52, 78, 58, 14, 14, 8)')
        src = src.replace('b(0, 145, 35, 130, 28, 90, 0, 0, 0)', 'b(0, 145, 42, 120, 30, 22, 0, 0, 0)')
        src = src.replace('c(0, -165, 4, 25, 46, 8)', 'b(0, 112, 58, 76, 28, 4, 0, 0, 0)')
        src = src.replace('return p.model();', '''for (let i = 0; i < 5; i++) {
  p.part(`speaker-slot-${i}`, b(-24 + i * 12, 112, 62, 4, 18, 2, 0, 0, 0));
}

return p.model();''')
        src = src.replace("Handheld avalanche beacon with a sloped display face, toggle control and carry clip.", "Handheld avalanche beacon with a chamfered case, raised screen, three controls, speaker grille and belt clip.")

    if asset_id == "basecamp-dome-tent":
        src = re.sub(r"^const c = \(x: number, y: number, z: number, h: number, r: number, n = 10\) => cylinder\(h, r, n\)\.translate\(x, y, z - baseZ\)\.scale\(scale\)\.color\(color\);\n", "", src, flags=re.M)

    if asset_id == "ice-axe":
        src = src.replace(
            'const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);\n',
            '''const xzProfile = (points: [number, number][], depth: number) => {
  let outline = path().moveTo(points[0][0], points[0][1]);
  for (const [x, z] of points.slice(1)) outline = outline.lineTo(x, z);
  return outline.close().extrude(depth).rotateX(90).translate(0, -depth / 2, 0).scale(scale);
};
''',
        )
        src = src.replace('p.part("shaft", c(0, 0, 0, 820, 26, 8));', 'p.part("shaft", c(0, 0, 0, 820, 18, 8));')
        src = src.replace('p.part("pick", hx(0, 0, 790, 390, 32, 8));', 'p.part("pick", xzProfile([[-205, 785], [-170, 815], [-125, 832], [-72, 824], [-20, 804], [45, 785], [112, 774], [190, 767], [183, 742], [100, 748], [24, 763], [-40, 786], [-92, 794], [-145, 782], [-180, 755]], 34));')
        src = src.replace('p.part("pick-tip", b(-195, 0, 765, 95, 42, 82, 0, -20, 0));', 'p.part("pick-tip", xzProfile([[-205, 785], [-170, 815], [-160, 780], [-178, 750]], 38));')
        src = src.replace('p.part("adze", b(200, 0, 750, 175, 170, 42, 0, 0, 0));', 'p.part("adze", xzProfile([[42, 802], [228, 816], [266, 790], [244, 748], [76, 758]], 42));')
        src = src.replace('p.part("lower-spike", c(0, 0, 0, 180, 32, 8));', 'p.part("lower-spike", xzProfile([[-20, 190], [20, 190], [11, 40], [0, 0], [-11, 40]], 34));\np.part("rubber-grip", c(0, 0, 10, 245, 32, 8));')
        src = src.replace('p.part("leash-strap", b(0, 70, 310, 40, 30, 240, 0, 0, 0));', '''p.part("leash-strap-side-left", b(-35, 70, 160, 12, 12, 150, 0, 0, 0));
p.part("leash-strap-side-right", b(35, 70, 160, 12, 12, 150, 0, 0, 0));
p.part("leash-strap-top", b(0, 70, 298, 82, 12, 12, 0, 0, 0));
p.part("leash-strap-bottom", b(0, 70, 160, 82, 12, 12, 0, 0, 0));''')

    if asset_id == "glacier-goggles":
        src = src.replace(
            'p.part("left-lens-frame", ring(-135, 0, 0, 48, 126, 30, 14, "y"));',
            'p.part("left-lens", b(-135, 0, -90, 184, 10, 180, 0, 0, 0));\np.part("left-lens-frame", ring(-135, 0, 0, 48, 126, 30, 14, "y"));',
        )
        src = src.replace(
            'p.part("right-lens-frame", ring(135, 0, 0, 48, 126, 30, 14, "y"));',
            'p.part("right-lens", b(135, 0, -90, 184, 10, 180, 0, 0, 0));\np.part("right-lens-frame", ring(135, 0, 0, 48, 126, 30, 14, "y"));',
        )

    return src


def promote(asset_id: str, path: Path) -> None:
    src = path.read_text()
    if "presets({" in src:
        return
    if asset_id not in PALETTES:
        raise ValueError(f"missing material palette for {asset_id}")
    available = PALETTES[asset_id]
    title_match = re.search(r'title:\s*["\']([^"\']+)', src)
    desc_match = re.search(r'description:\s*["\']([^"\']+)', src)
    if not title_match or not desc_match:
        raise ValueError(f"missing title/description in {path}")
    title = title_match.group(1)
    description = desc_match.group(1).split(" Knobs:")[0].rstrip(" .")

    src = geometry_updates(asset_id, src)
    desc_match = re.search(r'description:\s*["\']([^"\']+)', src)
    if not desc_match:
        raise ValueError(f"missing updated description in {path}")
    description = desc_match.group(1).split(" Knobs:")[0].rstrip(" .")
    src = re.sub(
        r"^// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0\.$",
        f"// {title}: {description}.\n// Model units: millimetres, Z up; the base sits at z = 0.",
        src,
        flags=re.M,
    )
    updated_description = (
        f"{description}. Knobs: overall scale plus "
        + ", ".join(available[:-1])
        + (" and " if len(available) > 1 else "")
        + available[-1]
        + " material colors."
    )
    src = src.replace(desc_match.group(1), updated_description)
    src, n = re.subn(r"^const color = param\('color',.*?\);\n", "", src, flags=re.M)
    if n != 1:
        raise ValueError(f"expected one generic color knob in {path}, got {n}")

    labels = [LABELS[key] for key in available]
    declarations = "".join(
        f"const {key} = param('{key}', '{COLORS[key]}', {{ label: '{LABELS[key]}' }});\n"
        for key in available
    )
    storm = ", ".join(f"{key}: '{preset_color(key)}'" for key in available)
    visible_values: dict[str, str] = {}
    textile = next((key for key in ("nylon", "polyester", "webbing", "polymer", "polycarbonate", "foam") if key in available), available[0])
    visible_values[textile] = preset_color(textile, bright=True)
    second = next((key for key in available if key != textile and key in {"webbing", "polyester", "rubber", "glass", "steel", "aluminium", "stainlessSteel"}), None)
    if second:
        visible_values[second] = "#f1c64e" if second in {"webbing", "polyester"} else COLORS[second]
    visibility = ", ".join(f"{key}: '{value}'" for key, value in visible_values.items())
    block = (
        declarations
        + "\npresets({\n"
        + f"  stormWorn: {{ {storm} }},\n"
        + f"  highVisibility: {{ {visibility} }},\n"
        + "});\n"
    )
    scale_match = re.search(r"^const scale = param\([^\n]+\);\n", src, flags=re.M)
    if not scale_match:
        raise ValueError(f"missing scale parameter in {path}")
    src = src[: scale_match.end()] + block + src[scale_match.end() :]

    spans = part_call_spans(re.sub(r"\.color\(\s*color\s*\)", "", src))
    if not spans:
        raise ValueError(f"no part calls in {path}")
    assignments: dict[str, str] = {}
    for name, _, _ in spans:
        assignments[name] = material_for(asset_id, name, available)
    # Material knobs must affect a semantically appropriate part. A palette
    # without a matching component is an authoring error, not a cue to recolor
    # an arbitrary neighboring piece.
    usage_hints = {
        "nylon": re.compile(r"bag|body|shell|cover|pouch|fly|floor|tent|bivy|strap|loop|rope|skin|panel|bed|hood|web", re.I),
        "polyester": re.compile(r"floor|fly|vestibule|tarp|sheet|panel|hood|webbing|bag|apron|end-cap|foot-panel|closure-collar|rolled-rim|rope-end", re.I),
        "webbing": re.compile(r"strap|loop|band|tab|sling|cord|keeper|leash|tie|harness|handle", re.I),
        "aluminium": re.compile(r"shaft|pole|rail|frame|axle|bar|mast|clip|handle|cross|ridge|spine", re.I),
        "steel": re.compile(r"blade|pick|tip|spike|tooth|gate|cam|plate|anchor|screw|hook|axle|pin|reinforced-head|marker-post", re.I),
        "rubber": re.compile(r"grip|valve|seal|guard|foot|control|button|pad|binding|handle", re.I),
        "polymer": re.compile(r"body|case|shell|clip|cap|guard|handle|buckle|base-foot", re.I),
        "glass": re.compile(r"screen|display|lens|window|front-face", re.I),
        "foam": re.compile(r"liner|pad|cushion|hood", re.I),
        "polycarbonate": re.compile(r"shell|lens|frame|visor|wind-cup|direction-vane|vane-fin", re.I),
        "silicone": re.compile(r"seal|valve|cap|hose|gasket|fill-cap", re.I),
        "stainlessSteel": re.compile(r"lid-tab|neck|hanger|pin|clip|handle", re.I),
        "silicon": re.compile(r"cell|solar", re.I),
    }
    for material in available:
        if material in assignments.values():
            continue
        hint = usage_hints.get(material)
        candidates = [name for name, _, _ in spans if hint and hint.search(name)]
        counts = {key: sum(value == key for value in assignments.values()) for key in set(assignments.values())}
        chosen = next((name for name in candidates if counts[assignments[name]] > 1), None)
        if chosen is None:
            raise ValueError(f"{asset_id}: no distinct semantic part available for {material}; candidates={candidates}")
        assignments[chosen] = material
    if set(assignments.values()) != set(available):
        raise ValueError(f"{asset_id}: material controls do not all reach parts: {sorted(set(available) - set(assignments.values()))}")

    src = replace_color_calls(src, assignments, available)
    path.write_text(src)


def main() -> int:
    paths = sorted(KIT.glob("*.kcad.ts"))
    ids = {path.name.removesuffix(".kcad.ts") for path in paths}
    if ids != set(PALETTES):
        raise SystemExit(f"palette/source ID mismatch: missing={sorted(ids - set(PALETTES))}, extra={sorted(set(PALETTES) - ids)}")
    for path in paths:
        promote(path.name.removesuffix(".kcad.ts"), path)
    summary = {
        "kit": "alpine-expedition",
        "assets": len(paths),
        "assetIds": [path.name.removesuffix(".kcad.ts") for path in paths],
        "materialControls": sum(len(PALETTES[path.name.removesuffix(".kcad.ts")]) for path in paths),
        "presetEntries": 2 * len(paths),
        "geometryUpdates": ["alpine-helmet", "avalanche-transceiver", "basecamp-dome-tent", "four-season-tent", "glacier-goggles", "ice-axe"],
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
