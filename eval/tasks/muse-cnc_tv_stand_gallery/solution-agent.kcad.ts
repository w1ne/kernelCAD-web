// MUSE 'cnc_tv_stand_gallery' — gallery-style CNC timber TV stand: top and
// bottom panels locked onto two outer side panels and two center dividers
// by interlocking tab/mortise joints. 6 independent components with
// clearance fits; the lower bay stays open for baskets/consoles.

const W = 1720;        // overall width (x)
const D = 420;         // depth (y)
const H = 440;         // overall height (z)
const T = 18;          // vertical panel thickness
const TOP_T = 18;      // top panel thickness
const BOT_T = 18;      // bottom panel thickness
const TAB_W = 120;     // interlocking tab width (y direction)
const DIV_D = 360;     // center divider depth
const CLR = 0.2;       // assembly clearance per side
const TAB_H = 17.8;    // tab reach into the panel (just shy of through)

const stand = assembly('tv-stand');

// Vertical panel x-centers: sides inset half a thickness from the ends,
// dividers split the span into three roughly equal bays.
const sideX = W / 2 - T / 2;           // 851
const divX = W / 6;                    // ~287
const verticals = [
  ['left_side_panel', -sideX, D],
  ['right_side_panel', sideX, D],
  ['center_divider_01', -divX, DIV_D],
  ['center_divider_02', divX, DIV_D],
] as const;
const tabCenters = [-TAB_W, TAB_W]; // two tabs per edge at +/- 120 in y

const zBot = BOT_T;          // top of the bottom panel
const zTop = H - TOP_T;      // bottom of the top panel

// --- Horizontal panels with mortises for every vertical's tabs ------------
function horizontalPanel(zBase: number, thick: number) {
  let panel = box(W, D, thick, true).translate(0, 0, zBase + thick / 2);
  for (const [, vx] of verticals) {
    for (const ty of tabCenters) {
      const mortise = box(T + 2 * CLR, TAB_W + 2 * CLR, TAB_H + CLR, true).translate(
        vx,
        ty,
        zBase === 0 ? thick - (TAB_H + CLR) / 2 + 0.01 : zBase + (TAB_H + CLR) / 2 - 0.01,
      );
      panel = panel.subtract(mortise);
    }
  }
  return panel.color('plate');
}
const bottom = stand.part('bottom_panel', horizontalPanel(0, BOT_T));
const top = stand.part('top_panel', horizontalPanel(zTop, TOP_T));

// --- Vertical panels: plates with top + bottom tabs ------------------------
for (const [name, vx, depth] of verticals) {
  let v = box(T, depth, zTop - zBot, true).translate(vx, 0, (zBot + zTop) / 2);
  for (const ty of tabCenters) {
    const tabBot = box(T, TAB_W, TAB_H, true).translate(vx, ty, zBot - TAB_H / 2);
    const tabTop = box(T, TAB_W, TAB_H, true).translate(vx, ty, zTop + TAB_H / 2);
    v = v.union(tabBot, tabTop);
  }
  const part = stand.part(name, v.color('beam'));
  // Connector pairs at the bottom and top interfaces.
  part.connector('tabs-bottom', { type: 'frame', origin: { kind: 'vec3', value: [vx, 0, zBot] }, axis: [0, 0, -1] });
  part.connector('tabs-top', { type: 'frame', origin: { kind: 'vec3', value: [vx, 0, zTop] }, axis: [0, 0, 1] });
  bottom.connector(`mortise-${name}`, { type: 'frame', origin: { kind: 'vec3', value: [vx, 0, zBot] }, axis: [0, 0, -1] });
  top.connector(`mortise-${name}`, { type: 'frame', origin: { kind: 'vec3', value: [vx, 0, zTop] }, axis: [0, 0, 1] });
  stand.mate(`${name}-to-bottom`, `bottom_panel.mortise-${name}`, `${name}.tabs-bottom`, 'fastened');
  stand.mate(`${name}-to-top`, `top_panel.mortise-${name}`, `${name}.tabs-top`, 'fastened');
}

return stand.solvedModel({});
