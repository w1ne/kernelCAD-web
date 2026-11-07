#!/usr/bin/env python3
"""Generate the authored, self-contained kernelCAD sources for the sports kit."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / 'catalog' / 'kits' / 'sports'


def asset(slug, title, description, tags, color, parts):
    return {
        'slug': slug,
        'title': title,
        'description': description,
        'tags': tags,
        'color': color,
        'parts': parts,
    }


SPORTS = [
    asset('basketball', 'Basketball', 'Low-poly basketball prop with a faceted spherical silhouette.', ['basketball', 'ball', 'court', 'indoor sport'], '#d47a32', [
        ('ball', 'sphere(62, 12).translate(0, 0, 62)'),
    ]),
    asset('basketball-hoop', 'Basketball hoop', 'Freestanding court hoop with backboard, support arm, hollow rim and weighted floor base.', ['basketball hoop', 'backboard', 'court', 'sports equipment'], '#647987', [
        ('base', 'box(120, 92, 18, true).translate(0, 0, 9)'),
        ('upright', 'cylinder(330, 13, 10)'),
        ('support-arm', 'box(100, 16, 16, true).translate(0, 0, 265)'),
        ('backboard', 'box(220, 14, 150, true).translate(0, 0, 340)'),
        ('rim', 'cylinder(8, 56, 16).subtract(cylinder(10, 43, 16).translate(0, 0, -1)).translate(0, 0, 236)'),
    ]),
    asset('soccer-ball', 'Soccer ball', 'Low-poly spherical ball prop for a football pitch or training scene.', ['soccer ball', 'football', 'ball', 'field sport'], '#ece8d6', [
        ('ball', 'sphere(58, 12).translate(0, 0, 58)'),
    ]),
    asset('soccer-goal', 'Soccer goal', 'Small freestanding soccer goal with posts, crossbar and a simplified open net frame.', ['soccer goal', 'football goal', 'net', 'field sport'], '#e5e9e7', [
        ('left-post', 'cylinder(210, 7, 10).translate(-145, 0, 0)'),
        ('right-post', 'cylinder(210, 7, 10).translate(145, 0, 0)'),
        ('crossbar', 'box(302, 14, 14, true).translate(0, 0, 210)'),
        ('net-roof', 'box(282, 90, 5, true).translate(0, 42, 205)'),
        ('net-side-left', 'box(5, 90, 205, true).translate(-140, 42, 105)'),
        ('net-side-right', 'box(5, 90, 205, true).translate(140, 42, 105)'),
        ('net-floor', 'box(282, 90, 5, true).translate(0, 42, 4)'),
    ]),
    asset('american-football', 'American football', 'Elongated low-poly football with a pointed oval profile.', ['american football', 'football', 'ball', 'field sport'], '#98552f', [
        ('ball', 'sphere(48, 12).scale([1.55, 0.82, 0.82]).translate(0, 0, 39.36)'),
    ]),
    asset('baseball', 'Baseball', 'Compact low-poly baseball prop with a faceted spherical form.', ['baseball', 'ball', 'bat and ball', 'field sport'], '#eee9dd', [
        ('ball', 'sphere(34, 12).translate(0, 0, 34)'),
    ]),
    asset('baseball-bat', 'Baseball bat', 'Upright low-poly baseball bat with a narrow grip and widened barrel.', ['baseball bat', 'bat', 'baseball', 'sports equipment'], '#9b7046', [
        ('grip', 'cylinder(125, 12, 10)'),
        ('taper', 'cylinder(90, 17, 10).translate(0, 0, 115)'),
        ('barrel', 'cylinder(250, 25, 12).translate(0, 0, 195)'),
        ('knob', 'cylinder(10, 19, 10).translate(0, 0, 0)'),
    ]),
    asset('baseball-glove', 'Baseball glove', 'Open mitt-shaped glove prop with a broad palm, wrist cuff and raised finger pads.', ['baseball glove', 'mitt', 'baseball', 'sports equipment'], '#9a5938', [
        ('wrist-cuff', 'box(70, 62, 38, true).translate(0, 0, 19)'),
        ('palm', 'sphere(66, 10).scale([1.12, 0.85, 0.58]).translate(0, 0, 86)'),
        ('finger-one', 'sphere(25, 8).translate(-47, 0, 142)'),
        ('finger-two', 'sphere(25, 8).translate(-16, 0, 153)'),
        ('finger-three', 'sphere(25, 8).translate(16, 0, 153)'),
        ('finger-four', 'sphere(25, 8).translate(47, 0, 142)'),
        ('thumb', 'sphere(29, 8).scale([0.82, 0.82, 1.35]).translate(73, -4, 100)'),
    ]),
    asset('batting-helmet', 'Batting helmet', 'Protective batting helmet prop with a domed shell, face brim and side guards.', ['batting helmet', 'helmet', 'baseball', 'sports equipment'], '#4c6f9d', [
        ('shell', 'sphere(72, 12).scale([1.12, 1, 0.82]).translate(0, 0, 59.04)'),
        ('brim', 'box(138, 100, 14, true).translate(20, -18, 7)'),
        ('ear-guard-left', 'box(16, 38, 48, true).translate(-67, 0, 24)'),
        ('ear-guard-right', 'box(16, 38, 48, true).translate(67, 0, 24)'),
    ]),
    asset('tennis-racket', 'Tennis racket', 'Low-poly tennis racket with an oval head and long handle.', ['tennis racket', 'racket', 'tennis', 'court sport'], '#5b6870', [
        ('head-frame', 'sphere(89).scale([0.68, 0.12, 1]).subtract(sphere(75).scale([0.67, 0.28, 1.1])).translate(0, 0, 125)'),
        ('throat', 'box(22, 16, 55, true).translate(0, 0, 77)'),
        ('handle', 'box(18, 20, 76, true).translate(0, 0, 38)'),
        ('butt-cap', 'box(24, 26, 8, true).translate(0, 0, 4)'),
        ('string-vertical-left-outer', 'box(3, 3, 132, true).translate(-24, 0, 125)'),
        ('string-vertical-left-inner', 'box(3, 3, 132, true).translate(-12, 0, 125)'),
        ('string-vertical-centre', 'box(3, 3, 132, true).translate(0, 0, 125)'),
        ('string-vertical-right-inner', 'box(3, 3, 132, true).translate(12, 0, 125)'),
        ('string-vertical-right-outer', 'box(3, 3, 132, true).translate(24, 0, 125)'),
        ('string-horizontal-1', 'box(78, 3, 3, true).translate(0, 0, 91)'),
        ('string-horizontal-2', 'box(78, 3, 3, true).translate(0, 0, 108)'),
        ('string-horizontal-3', 'box(78, 3, 3, true).translate(0, 0, 125)'),
        ('string-horizontal-4', 'box(78, 3, 3, true).translate(0, 0, 142)'),
        ('string-horizontal-5', 'box(78, 3, 3, true).translate(0, 0, 159)'),
    ]),
    asset('tennis-ball', 'Tennis ball', 'Compact low-poly tennis ball prop.', ['tennis ball', 'ball', 'tennis', 'court sport'], '#b6c84c', [
        ('ball', 'sphere(34, 12).translate(0, 0, 34)'),
    ]),
    asset('tennis-net', 'Tennis net', 'Practice tennis net with upright posts and a simplified rectangular mesh panel.', ['tennis net', 'net', 'tennis court', 'court sport'], '#6d7471', [
        ('left-post', 'cylinder(145, 7, 10).translate(-220, 0, 0)'),
        ('right-post', 'cylinder(145, 7, 10).translate(220, 0, 0)'),
        ('net-panel', 'box(430, 7, 116, true).translate(0, 0, 85)'),
        ('top-band', 'box(445, 12, 12, true).translate(0, 0, 145)'),
        ('base-left', 'box(72, 32, 8, true).translate(-220, 0, 4)'),
        ('base-right', 'box(72, 32, 8, true).translate(220, 0, 4)'),
    ]),
    asset('volleyball', 'Volleyball', 'Low-poly volleyball prop with a faceted spherical silhouette.', ['volleyball', 'ball', 'court sport'], '#e7e2d6', [
        ('ball', 'sphere(58, 12).translate(0, 0, 58)'),
    ]),
    asset('volleyball-net', 'Volleyball net', 'Portable volleyball net with posts, a broad mesh panel and ground feet.', ['volleyball net', 'net', 'volleyball', 'court sport'], '#697573', [
        ('left-post', 'cylinder(205, 8, 10).translate(-185, 0, 0)'),
        ('right-post', 'cylinder(205, 8, 10).translate(185, 0, 0)'),
        ('net-panel', 'box(358, 8, 180, true).translate(0, 0, 105)'),
        ('top-band', 'box(370, 14, 12, true).translate(0, 0, 200)'),
        ('base-left', 'box(90, 36, 10, true).translate(-185, 0, 5)'),
        ('base-right', 'box(90, 36, 10, true).translate(185, 0, 5)'),
    ]),
    asset('badminton-racket', 'Badminton racket', 'Lightweight low-poly badminton racket with a slim shaft and oval head.', ['badminton racket', 'racket', 'badminton', 'court sport'], '#596d62', [
        ('head-frame', 'sphere(76).scale([0.62, 0.1, 1]).subtract(sphere(63).scale([0.6, 0.25, 1.1])).translate(0, 0, 108)'),
        ('throat', 'box(14, 12, 45, true).translate(0, 0, 58)'),
        ('shaft', 'cylinder(86, 7, 8)'),
        ('grip', 'cylinder(84, 10, 8).translate(0, 0, 0)'),
        ('string-vertical-left', 'box(3, 3, 110, true).translate(-16, 0, 108)'),
        ('string-vertical-centre', 'box(3, 3, 110, true).translate(0, 0, 108)'),
        ('string-vertical-right', 'box(3, 3, 110, true).translate(16, 0, 108)'),
        ('string-horizontal-1', 'box(54, 3, 3, true).translate(0, 0, 75)'),
        ('string-horizontal-2', 'box(54, 3, 3, true).translate(0, 0, 95)'),
        ('string-horizontal-3', 'box(54, 3, 3, true).translate(0, 0, 115)'),
        ('string-horizontal-4', 'box(54, 3, 3, true).translate(0, 0, 135)'),
    ]),
    asset('shuttlecock', 'Shuttlecock', 'Low-poly badminton shuttlecock with a rounded cork tip and flared skirt.', ['shuttlecock', 'badminton', 'birdie', 'court sport'], '#e8e4d8', [
        ('cork', 'sphere(19, 8).translate(0, 0, 19)'),
        ('skirt', 'sphere(43, 10).scale([0.9, 0.9, 0.55]).translate(0, 0, 63)'),
        ('crown', 'cylinder(8, 39, 10).translate(0, 0, 91)'),
    ]),
    asset('cricket-bat', 'Cricket bat', 'Low-poly cricket bat with a wide flat blade, shoulders and slim handle.', ['cricket bat', 'bat', 'cricket', 'field sport'], '#9a754d', [
        ('blade', 'box(82, 28, 190, true).translate(0, 0, 95)'),
        ('shoulder', 'box(42, 24, 45, true).translate(0, 0, 203)'),
        ('handle', 'cylinder(145, 12, 10).translate(0, 0, 225)'),
        ('grip-cap', 'cylinder(8, 16, 10).translate(0, 0, 370)'),
    ]),
    asset('cricket-wicket', 'Cricket wicket', 'Three-stump wicket set on a low ground plate with two cross bails.', ['cricket wicket', 'stumps', 'cricket', 'field sport'], '#b18b5f', [
        ('ground-plate', 'box(116, 58, 6, true).translate(0, 0, 3)'),
        ('stump-left', 'cylinder(58, 4, 8).translate(-18, 0, 6)'),
        ('stump-middle', 'cylinder(58, 4, 8).translate(0, 0, 6)'),
        ('stump-right', 'cylinder(58, 4, 8).translate(18, 0, 6)'),
        ('bail-left', 'box(26, 6, 5, true).translate(-12, 0, 61)'),
        ('bail-right', 'box(26, 6, 5, true).translate(12, 0, 61)'),
    ]),
    asset('hockey-stick', 'Field hockey stick', 'Low-poly field hockey stick with a long shaft and hooked blade.', ['hockey stick', 'field hockey', 'stick', 'field sport'], '#8a6844', [
        ('shaft', 'box(18, 20, 620, true).translate(0, 0, 310)'),
        ('blade', 'box(112, 22, 22, true).translate(44, 0, 11)'),
        ('heel', 'box(34, 22, 54, true).translate(6, 0, 38)'),
    ]),
    asset('hockey-puck', 'Hockey puck', 'Low-poly cylindrical ice hockey puck prop.', ['hockey puck', 'puck', 'ice hockey', 'indoor sport'], '#383d42', [
        ('puck', 'cylinder(24, 38, 12)'),
    ]),
    asset('lacrosse-stick', 'Lacrosse stick', 'Low-poly lacrosse stick with a long shaft and broad oval head.', ['lacrosse stick', 'stick', 'lacrosse', 'field sport'], '#78756c', [
        ('shaft', 'cylinder(580, 9, 10)'),
        ('head', 'sphere(68, 12).scale([0.72, 1.05, 0.14]).translate(0, 0, 618)'),
        ('throat', 'box(16, 16, 42, true).translate(0, 0, 580)'),
    ]),
    asset('golf-club', 'Golf club', 'Low-poly golf club with a metal head, long shaft and top grip.', ['golf club', 'golf', 'sports equipment'], '#77828a', [
        ('club-head', 'box(118, 44, 28, true).translate(30, 0, 14)'),
        ('shaft', 'cylinder(660, 7, 8).translate(4, 0, 28)'),
        ('grip', 'cylinder(105, 12, 8).translate(4, 0, 590)'),
    ]),
    asset('golf-bag', 'Golf bag', 'Upright golf bag with a broad lower body, tapered-looking rim and club tops.', ['golf bag', 'golf', 'sports equipment'], '#42675d', [
        ('bag-body', 'cylinder(380, 65, 12).translate(0, 0, 0)'),
        ('base', 'cylinder(24, 76, 12).translate(0, 0, 0)'),
        ('rim', 'cylinder(14, 72, 12).translate(0, 0, 380)'),
        ('club-a', 'cylinder(180, 5, 8).translate(-28, -15, 392)'),
        ('club-b', 'cylinder(195, 5, 8).translate(0, 0, 392)'),
        ('club-c', 'cylinder(170, 5, 8).translate(28, 15, 392)'),
        ('strap', 'box(14, 40, 260, true).translate(68, 0, 190)'),
    ]),
    asset('skateboard', 'Skateboard', 'Low-poly skateboard deck with two trucks and four wheels.', ['skateboard', 'skateboarding', 'board sport'], '#a75e3b', [
        ('deck', 'box(310, 82, 18, true).translate(0, 0, 112)'),
        ('front-truck', 'box(74, 38, 18, true).translate(-96, 0, 73)'),
        ('rear-truck', 'box(74, 38, 18, true).translate(96, 0, 73)'),
        ('wheel-front-left', 'sphere(24, 8).translate(-100, -48, 24)'),
        ('wheel-front-right', 'sphere(24, 8).translate(-100, 48, 24)'),
        ('wheel-rear-left', 'sphere(24, 8).translate(100, -48, 24)'),
        ('wheel-rear-right', 'sphere(24, 8).translate(100, 48, 24)'),
    ]),
    asset('inline-skate', 'Inline skate', 'Low-poly inline skate boot with a cuff, chassis and three aligned wheels.', ['inline skate', 'roller skate', 'skating', 'sports equipment'], '#465c70', [
        ('boot', 'box(170, 84, 88, true).translate(0, 0, 116)'),
        ('cuff', 'box(92, 76, 42, true).translate(-28, 0, 174)'),
        ('chassis', 'box(158, 36, 14, true).translate(0, 0, 53)'),
        ('wheel-front', 'sphere(23, 8).translate(-54, 0, 23)'),
        ('wheel-middle', 'sphere(23, 8).translate(0, 0, 23)'),
        ('wheel-rear', 'sphere(23, 8).translate(54, 0, 23)'),
    ]),
    asset('jump-rope', 'Jump rope', 'Jump rope prop with a low-poly loop and two upright grip handles.', ['jump rope', 'skipping rope', 'training', 'gym'], '#bd5c4b', [
        ('rope-loop', 'cylinder(5, 168, 20).subtract(cylinder(7, 158, 20).translate(0, 0, -1))'),
        ('left-handle', 'cylinder(94, 9, 10).translate(-166, 0, 0)'),
        ('right-handle', 'cylinder(94, 9, 10).translate(166, 0, 0)'),
        ('left-grip', 'cylinder(50, 13, 10).translate(-166, 0, 20)'),
        ('right-grip', 'cylinder(50, 13, 10).translate(166, 0, 20)'),
    ]),
    asset('dumbbell', 'Dumbbell', 'Compact low-poly dumbbell with a horizontal handle and weighted ends.', ['dumbbell', 'free weights', 'gym', 'training'], '#69747a', [
        ('handle', 'box(115, 18, 18, true).translate(0, 0, 40)'),
        ('left-weight', 'sphere(40, 10).scale([0.68, 1, 1]).translate(-76, 0, 40)'),
        ('right-weight', 'sphere(40, 10).scale([0.68, 1, 1]).translate(76, 0, 40)'),
    ]),
    asset('kettlebell', 'Kettlebell', 'Low-poly kettlebell with a rounded body and raised ring handle.', ['kettlebell', 'free weights', 'gym', 'training'], '#555e63', [
        ('body', 'sphere(48, 10).scale([1, 1, 0.92]).translate(0, 0, 44.16)'),
        ('handle', 'cylinder(10, 34, 12).subtract(cylinder(12, 23, 12).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, 0, 104)'),
        ('handle-foot-left', 'sphere(13, 8).translate(-24, 0, 84)'),
        ('handle-foot-right', 'sphere(13, 8).translate(24, 0, 84)'),
    ]),
    asset('barbell', 'Barbell', 'Low-poly barbell with a long horizontal shaft and stacked spherical plate forms.', ['barbell', 'weight bar', 'gym', 'training'], '#56636c', [
        ('shaft', 'box(680, 16, 16, true).translate(0, 0, 78)'),
        ('left-inner-plate', 'sphere(58, 10).scale([0.28, 1, 1]).translate(-224, 0, 74)'),
        ('left-outer-plate', 'sphere(74, 10).scale([0.28, 1, 1]).translate(-280, 0, 74)'),
        ('right-inner-plate', 'sphere(58, 10).scale([0.28, 1, 1]).translate(224, 0, 74)'),
        ('right-outer-plate', 'sphere(74, 10).scale([0.28, 1, 1]).translate(280, 0, 74)'),
    ]),
    asset('weight-plate', 'Weight plate', 'Low-poly round gym weight plate with a central bore.', ['weight plate', 'weight', 'gym', 'training'], '#5b666b', [
        ('plate', 'cylinder(22, 82, 16).subtract(cylinder(24, 22, 12).translate(0, 0, -1))'),
    ]),
    asset('yoga-mat', 'Yoga mat', 'Rolled yoga mat prop with a flat practice surface and cylindrical roll.', ['yoga mat', 'fitness', 'yoga', 'training'], '#6b8978', [
        ('mat', 'box(300, 210, 8, true).translate(0, 0, 4)'),
        ('rolled-edge', 'cylinder(210, 28, 12).rotate([1, 0, 0], 90).translate(0, 105, 28)'),
    ]),
    asset('yoga-block', 'Yoga block', 'Simple low-poly foam yoga block with a broad rectangular profile.', ['yoga block', 'fitness', 'yoga', 'training'], '#8c6b78', [
        ('block', 'box(180, 105, 65, true).translate(0, 0, 32.5)'),
    ]),
    asset('exercise-ball', 'Exercise ball', 'Large low-poly exercise ball for a studio or gym scene.', ['exercise ball', 'fitness ball', 'gym', 'training'], '#5a9bb1', [
        ('ball', 'sphere(108, 14).translate(0, 0, 108)'),
    ]),
    asset('foam-roller', 'Foam roller', 'Low-poly cylindrical foam roller laid horizontally on the floor.', ['foam roller', 'fitness', 'gym', 'recovery'], '#a16c60', [
        ('roller', 'cylinder(220, 50, 12).rotate([1, 0, 0], 90).translate(0, 110, 50)'),
    ]),
    asset('gym-bench', 'Gym bench', 'Low-poly adjustable bench prop with padded top, support frame and floor feet.', ['gym bench', 'weight bench', 'gym', 'training'], '#555e65', [
        ('pad', 'box(330, 112, 30, true).translate(0, 0, 330)'),
        ('front-leg', 'box(24, 86, 290, true).translate(-102, 0, 145)'),
        ('rear-leg', 'box(24, 86, 252, true).translate(108, 0, 126)'),
        ('crossbar', 'box(220, 22, 18, true).translate(2, 0, 75)'),
        ('front-foot', 'box(105, 32, 12, true).translate(-102, 0, 6)'),
        ('rear-foot', 'box(105, 32, 12, true).translate(108, 0, 6)'),
    ]),
    asset('treadmill', 'Treadmill', 'Low-poly treadmill with running deck, front uprights, hand rails and console.', ['treadmill', 'cardio', 'gym', 'training'], '#46545c', [
        ('deck', 'box(360, 142, 36, true).translate(0, 0, 105)'),
        ('front-upright-left', 'box(18, 18, 245, true).translate(-126, 0, 242.5)'),
        ('front-upright-right', 'box(18, 18, 245, true).translate(126, 0, 242.5)'),
        ('console', 'box(300, 34, 40, true).translate(0, 0, 365)'),
        ('console-screen', 'box(160, 6, 44, true).translate(0, -20, 366)'),
        ('left-foot', 'box(420, 32, 12, true).translate(0, 0, 6)'),
    ]),
    asset('starting-block', 'Track starting block', 'Track starting block prop with a low base rail and two angled-looking foot pads.', ['starting block', 'track', 'athletics', 'field sport'], '#5d6d79', [
        ('base-rail', 'box(255, 62, 14, true).translate(0, 0, 7)'),
        ('front-pedal', 'box(65, 64, 44, true).translate(-72, 0, 36)'),
        ('rear-pedal', 'box(65, 64, 58, true).translate(70, 0, 43)'),
        ('front-heel-stop', 'box(12, 64, 50, true).translate(-110, 0, 53)'),
        ('rear-heel-stop', 'box(12, 64, 66, true).translate(107, 0, 62)'),
    ]),
    asset('track-hurdle', 'Track hurdle', 'Portable low-poly running hurdle with two feet, uprights and a crossbar.', ['track hurdle', 'hurdle', 'athletics', 'track'], '#c95748', [
        ('left-upright', 'cylinder(170, 6, 8).translate(-115, 0, 0)'),
        ('right-upright', 'cylinder(170, 6, 8).translate(115, 0, 0)'),
        ('crossbar', 'box(250, 16, 14, true).translate(0, 0, 170)'),
        ('left-foot', 'box(88, 24, 8, true).translate(-115, 0, 4)'),
        ('right-foot', 'box(88, 24, 8, true).translate(115, 0, 4)'),
    ]),
    asset('sports-water-bottle', 'Sports water bottle', 'Reusable sports bottle with tapered neck and screw cap.', ['sports bottle', 'water bottle', 'fitness', 'sports equipment'], '#4b8f9e', [
        ('body', 'cylinder(158, 38, 12)'),
        ('shoulder', 'sphere(38, 10).scale([1, 1, 0.52]).translate(0, 0, 150)'),
        ('neck', 'cylinder(28, 21, 10).translate(0, 0, 164)'),
        ('cap', 'cylinder(18, 24, 10).translate(0, 0, 190)'),
    ]),
    asset('trophy-cup', 'Trophy cup', 'Low-poly award cup with an open bowl, stem, handles and stepped base.', ['trophy cup', 'trophy', 'award', 'sports'], '#c59a43', [
        ('base', 'box(98, 72, 14, true).translate(0, 0, 7)'),
        ('stem', 'cylinder(54, 13, 10).translate(0, 0, 14)'),
        ('bowl', 'cylinder(74, 54, 12).subtract(cylinder(65, 43, 12).translate(0, 0, 20)).translate(0, 0, 68)'),
        ('left-handle', 'sphere(33, 8).scale([0.55, 0.8, 1.2]).translate(-68, 0, 106)'),
        ('right-handle', 'sphere(33, 8).scale([0.55, 0.8, 1.2]).translate(68, 0, 106)'),
        ('top-rim', 'cylinder(8, 57, 12).subtract(cylinder(10, 43, 12).translate(0, 0, -1)).translate(0, 0, 135)'),
    ]),
]


def render_source(item):
    tags = ', '.join(repr(tag) for tag in item['tags'] + ['low poly', 'CC0'])

    def source_expr(shape):
        return re.sub(r'sphere\(([^,()]+),\s*\d+\)', lambda match: f'sphere({match.group(1)})', shape)

    parts = '\n'.join(
        f"p.part({name!r}, {source_expr(shape)}.scale(scale).color(color));"
        for name, shape in item['parts']
    )
    return f'''meta({{
  name: {item['slug']!r},
  license: 'CC0-1.0',
  title: {item['title']!r},
  description: {item['description']!r},
  tags: [{tags}],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
}});

const scale = param('scale', 1, {{ label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 }});
const color = param('color', {item['color']!r}, {{ label: 'Asset color' }});
const p = assembly({item['slug']!r});
{parts}

return p.model();
'''


def main():
    if len(SPORTS) != 40 or len({item['slug'] for item in SPORTS}) != 40:
        raise SystemExit('the sports kit must contain 40 unique assets')
    KIT.mkdir(parents=True, exist_ok=True)
    kit_metadata = {
        'title': 'Sports',
        'description': 'Original low-poly court, field, racket, skating, fitness and award props with editable size and color controls.',
    }
    (KIT / 'kit.json').write_text(json.dumps(kit_metadata, indent=2) + '\n', encoding='utf-8')
    for item in SPORTS:
        path = KIT / f"{item['slug']}.kcad.ts"
        path.write_text(render_source(item), encoding='utf-8')
    print(f'generated {len(SPORTS)} sports asset sources in {KIT}')


if __name__ == '__main__':
    main()
