// Draws the directional views the enemy art pack does not ship.
//
//   node tools/art/enemy-views.mjs
//
// Every enemy was drawn from one view only (front for the blobs/bipeds, side
// for the two quadrupeds). This script re-draws each creature from the missing
// angles with the SAME palette, proportions and outline weights, and derives a
// three-frame gait for each view:
//
//   views/<key>_<view>.svg       resting pose
//   views/<key>_<view>_m1..m3    gait, played 1-2-3-2 (m1/m3 = opposite leg
//                                extremes, m2 = passing pose)
//
//   front-native  creature, bog_shambler, brute, drowned, blight_lancer
//                 → back + side
//   side-native   stalker, husk_wolf → front + back
//
// Side views face image-RIGHT (the game mirrors them for left). Back views show
// no face. The ground shadow is copied from the base art unchanged so the feet
// land on the same ground line in every view. Each view is one function of a
// pose { p, b }: p ∈ {-1, 0, 1} is the stride phase, b the body bob in px.
// Legs live in their own groups/paths so frames stay on-model.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../assets/sprites/views');

// ── helpers ─────────────────────────────────────────────────────────────────
const r2 = (n) => +(+n).toFixed(2);
const pt = ([x, y]) => `${r2(x)} ${r2(y)}`;
/** Polyline / polygon path from points. */
const pl = (pts, close = false) => `M${pts.map(pt).join('L')}${close ? 'Z' : ''}`;
const mv = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const P = (d, a) => `<path d="${d}" ${a}/>`;
const G = (tf, s) => (tf ? `<g transform="${tf}">${s}</g>` : `<g>${s}</g>`);
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n${body}\n</svg>\n`;

/**
 * Stroke leg hip → knee → foot. The hip rides with the body bob `b`; the foot
 * moves by `dx` and lifts by `lift`; the knee follows part-way.
 */
const legPts = ([h, k, f], { b = 0, dx = 0, lift = 0 }) => [
  [h[0], h[1] + b],
  [k[0] + dx * 0.55, k[1] + b * 0.5 - lift * 0.7],
  [f[0] + dx, f[1] - lift],
];

// Standard frame set: rest, then the stride. Per-type bob amplitude.
const frames = (bob) => [
  ['', { p: 0, b: 0 }],
  ['_m1', { p: -1, b: bob }],
  ['_m2', { p: 0, b: -bob }],
  ['_m3', { p: 1, b: bob }],
];

const out = [];
const emit = (key, view, w, h, draw, bob) => {
  for (const [suf, pose] of frames(bob)) out.push([`${key}_${view}${suf}`, svg(w, h, draw(pose))]);
};

// ── creature / bog_shambler (40×36, 4-legged blight crawler) ────────────────
const CRAWLER = {
  creature: { body: '#3e334e', plate: '#675371', belly: '#30293e', eye: '#c8a4e2', moss: false },
  bog_shambler: { body: '#435c4d', plate: '#6f8a66', belly: '#344d42', eye: '#d1b879', moss: true },
};
const CR_SHADOW = '<ellipse cx="20" cy="33" rx="14" ry="2" fill="#0e1016" opacity=".3"/>';
const CR_LEG = 'fill="none" stroke="#332942" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
const CR_LEG_HL = 'fill="none" stroke="#78548b" stroke-width=".65"';
const MOSS = 'fill="#7d9b69" stroke="#435744" stroke-width=".5"';
const crLeg = (pts, hl = true) =>
  P(pl(pts), CR_LEG) + (hl ? P(pl([lerp(pts[0], pts[1], 0.15), lerp(pts[0], pts[1], 0.85)]), CR_LEG_HL) : '');

// Front-style legs (used by the back view: the crawler is left/right symmetric).
const CR_LO = [[9, 23], [2, 26], [1, 31]], CR_LI = [[12, 24], [8, 30], [5, 32]];
const CR_RO = [[31, 23], [38, 26], [39, 31]], CR_RI = [[28, 24], [32, 30], [35, 32]];
function crawlerLegsSym({ p, b }) {
  // diagonal pairs: A = left-outer + right-inner, B = left-inner + right-outer
  const A = p < 0 ? 2 : 0, B = p > 0 ? 2 : 0;
  return crLeg(legPts(CR_LO, { b, lift: A, dx: -A * 0.4 })) + crLeg(legPts(CR_LI, { b, lift: B, dx: -B * 0.4 })) +
    crLeg(legPts(CR_RO, { b, lift: B, dx: B * 0.4 })) + crLeg(legPts(CR_RI, { b, lift: A, dx: A * 0.4 }));
}

function crawlerBack(c) {
  return ({ p, b }) => {
    const body =
      // horns on the far (head) end, bases hidden by the carapace
      P('M14 11 10 4l4 2 4 5m8 0 4-7-4 2-4 5', 'fill="#7a6390" stroke="#3f3251" stroke-width=".6"') +
      P('M7 22q0-10 10-14l6-1q12 5 11 15l-5 7-9 2-9-2Z', `fill="${c.body}" stroke="#211b2d" stroke-width=".9"`) +
      P('M9 21q1-10 11-12 10 2 11 12l-6 5H15Z', `fill="${c.plate}"`) +
      P('m12 25 8 2 8-2-3 4-5 2-5-2Z', `fill="${c.belly}"`) +
      P('M20 10v15m-8-9q8-3 16 0m-14 6q6-2 12 0', 'fill="none" stroke="#9a7aac" stroke-width=".8"') +
      (c.moss ? P('m8 13 3-6 2 5m16 1 3-6 1 6', MOSS) : '');
    return CR_SHADOW + '\n' + crawlerLegsSym({ p, b }) + '\n' + G(b ? `translate(0 ${b})` : '', body);
  };
}

// Side view: near legs drawn over far legs, both under the body.
const CR_S = {
  nf: [[25, 24], [35, 24], [37.5, 31]], nb: [[15, 24], [5, 24], [2.5, 31]],
  ff: [[23, 22], [32, 21.5], [34, 30]], fb: [[17, 22], [8, 21.5], [6, 30]],
};
function crawlerSide(c) {
  return ({ p, b }) => {
    // diagonal pairs: A = near-front + far-back, B = near-back + far-front
    const a = p < 0 ? 1 : p > 0 ? -1 : 0; // A forward when p<0
    const A = { b, dx: 1.6 * a, lift: a > 0 ? 1.6 : 0 }, B = { b, dx: -1.6 * a, lift: a < 0 ? 1.6 : 0 };
    const legs = crLeg(legPts(CR_S.ff, B), false) + crLeg(legPts(CR_S.fb, A), false) +
      crLeg(legPts(CR_S.nb, B)) + crLeg(legPts(CR_S.nf, A));
    const body =
      P('M20 10l-4-6 4 1 3 4Z', 'fill="#7a6390" stroke="#3f3251" stroke-width=".6"') +
      P('M7 24Q7 12 18 9l5-1q10 3 11 13l-3 7-10 3-10-2Z', `fill="${c.body}" stroke="#211b2d" stroke-width=".9"`) +
      P('M10 19q2-7 9-9h5q6 2 8 8l-8 3-12 1Z', `fill="${c.plate}"`) +
      P('M12 25l10-3h10l-3 5-8 3-8-2Z', `fill="${c.belly}"`) +
      P('M25 10l-4-7 4 2 4 5', 'fill="#7a6390" stroke="#3f3251" stroke-width=".6"') +
      P('m11 17 4-3 4 2 4-3 4 2m-15 6 4 1', 'fill="none" stroke="#9a7aac" stroke-width=".8"') +
      P('m27 17 4-2 3 3-4 3Z', `fill="${c.eye}"`) +
      '<circle cx="30.4" cy="18.4" r="1.1" fill="#2b2036"/>' +
      P('m28 26 4 1m-2 0 1 3', 'stroke="#171622" stroke-width="1.2" fill="none"') +
      (c.moss ? P('m10 15 3-6 2 5m4-4 3-6 1 6m8 16 2 4', MOSS) : '');
    return CR_SHADOW + '\n' + legs + '\n' + G(b ? `translate(0 ${b})` : '', body);
  };
}
for (const [key, c] of Object.entries(CRAWLER)) {
  emit(key, 'back', 40, 36, crawlerBack(c), 0.5);
  emit(key, 'side', 40, 36, crawlerSide(c), 0.5);
}

// ── brute (56×54, heavy horned biped with huge arms) ────────────────────────
const BR_SHADOW = '<ellipse cx="28" cy="50" rx="21" ry="2.5" fill="#0e1016" opacity=".35"/>';
const BR_LEG = 'fill="#30273e" stroke="#1b1725" stroke-width=".8"';
const BR_ARM = 'fill="#3c304b" stroke="#211a2b" stroke-width=".8"';
const BR_HORNS = 'fill="#8b6b9e" stroke="#4a365c" stroke-width=".8"';
// leg block with its foot lifted (top stays on the hip line, which bobs)
const brLegFront = (q, b, lift) => pl([[q[0][0], q[0][1] + b], [q[1][0], q[1][1] + b], [q[2][0], q[2][1] - lift], [q[3][0], q[3][1] - lift]], true);
const BR_LL = [[17, 40], [27, 40], [25, 49], [13, 49]], BR_RL = [[30, 40], [40, 40], [43, 49], [31, 49]];
const brArmsFront = (swing) =>
  G(`rotate(${r2(swing)} 10 25)`, P('M8 24q-6 1-6 8l2 12 8 3 5-5-3-15Z', BR_ARM) + P('m4 41 8 2-2 5-6-1Z', 'fill="#6a5477"')) +
  G(`rotate(${r2(swing)} 46 25)`, P('M48 24q6 1 6 8l-2 12-8 3-5-5 3-15Z', BR_ARM) + P('m52 41-8 2 2 5 6-1Z', 'fill="#6a5477"'));

function bruteBack({ p, b }) {
  // heavy stomp: one foot up, weight shifts over the planted leg
  const lL = p < 0 ? 3 : 0, lR = p > 0 ? 3 : 0, sx = p < 0 ? 0.8 : p > 0 ? -0.8 : 0;
  const tilt = p * -1.5;
  const legs = P(brLegFront(BR_LL, b, lL), BR_LEG) + P(brLegFront(BR_RL, b, lR), BR_LEG);
  const body =
    P('M10 10 6 1l6 4 5 7m29-2 4-9-6 4-5 7m-15-4-1-7 5 5 4-5 1 7', BR_HORNS) +
    P('M9 22q1-8 8-10l12-4 12 4q8 4 9 14l-4 18-14 4-14-2-10-7Z', 'fill="#41344f" stroke="#211a2b" stroke-width="1"') +
    P('M13 23q2-11 15-13 13 2 15 13l-5 8H18Z', 'fill="#695576"') +
    P('m18 31 10-2 10 2-3 12-7 4-7-4Z', 'fill="#564366"') +
    P('M28 11v34m-12-15 5-2m14 0 5 2m-20 15 8 2 8-2m-14-31 6 3 6-3', 'stroke="#8d7098" stroke-width=".8" fill="none"') +
    brArmsFront(p * 2);
  return BR_SHADOW + '\n' + legs + '\n' + G(`translate(${sx} ${b}) rotate(${r2(tilt)} 28 46)`, body);
}

// side: legs and arms rotate about hip/shoulder, the far pair drawn under the body
const BR_SLEG = P('M-5 0h10l2 9H-5Z', BR_LEG);
const BR_SARM = P('M4 0q6 1 6 8L8 20 0 23-5 18-2 3Z', BR_ARM) + P('M8 17 0 19 2 24 8 23Z', 'fill="#6a5477"');
function bruteSide({ p, b }) {
  const nearLeg = G(`translate(31 ${40 + b - (p < 0 ? 2.5 : 0)}) rotate(${-14 * -p})`, BR_SLEG);
  const farLeg = G(`translate(22 ${40 + b - (p > 0 ? 2.5 : 0)}) rotate(${-14 * p})`, BR_SLEG);
  // arms swing against the legs: near arm back while the near leg is forward
  const farArm = G(`translate(30 ${24 + b}) rotate(${r2(12 * p - 3)})`, BR_SARM);
  const nearArm = G(`translate(27 ${25 + b}) rotate(${r2(-12 * p)})`, BR_SARM);
  const body =
    P('m30 12 1-11 4 5 2 6Z', BR_HORNS) +
    P('M12 30Q12 14 25 9l7-1q13 2 15 14l-1 14-6 9-14 3-11-4Z', 'fill="#41344f" stroke="#211a2b" stroke-width="1"') +
    P('M16 23q4-11 15-12l8 2q6 4 6 10l-10 5H18Z', 'fill="#695576"') +
    P('m20 33 12-3 12 3-3 10-11 4-9-4Z', 'fill="#564366"') +
    P('m21 10-1-7 4 4 3-5 1 7m6 4 1-13 6 6 2 8Z', BR_HORNS) +
    P('m37 18 6-2 3 5-5 3Z', 'fill="#d5b4e6"') +
    '<circle cx="41.5" cy="20.5" r="1.4" fill="#271b33"/>' +
    P('M37 33q6 1 10-3l-1 8-7 1Z', 'fill="#1b1722"') +
    P('m38 34 1 3 1-2 1 3 1-3 1 2 1-3 1 2 1-3', 'fill="#e5d9e3"') +
    P('m17 29 5-2m-4 17 8 2 8-2', 'stroke="#8d7098" stroke-width=".8" fill="none"');
  return BR_SHADOW + '\n' + farLeg + farArm + nearLeg + '\n' + G(b ? `translate(0 ${b})` : '', body) + nearArm;
}
emit('brute', 'back', 56, 54, bruteBack, 0.7);
emit('brute', 'side', 56, 54, bruteSide, 0.7);

// ── drowned (42×38, finned blob on flippers) ────────────────────────────────
const DR_SHADOW = '<ellipse cx="21" cy="35" rx="15" ry="1.9" fill="#112831" opacity=".3"/>';
const DR_FLIP = 'fill="#2c6579" stroke="#1a4355" stroke-width=".6"';
const DR_FIN = 'fill="#2d6b80" stroke="#1a4355" stroke-width=".7"';
function drownedBack({ p, b }) {
  // waddle: rock onto one flipper, the other lifts
  const lL = p < 0 ? 2 : 0, lR = p > 0 ? 2 : 0;
  const flips =
    G(`translate(0 ${-lL}) rotate(${lL * 4} 11 27)`, P('m8 25-5 5 4 4 7-5Z', DR_FLIP)) +
    G(`translate(0 ${-lR}) rotate(${-lR * 4} 31 27)`, P('m34 25 5 5-4 4-7-5Z', DR_FLIP));
  const body =
    P('M9 13 5 4l7 5Zm24 0 4-9-7 5Z', DR_FIN) +
    P('M5 22q0-11 11-15l10 0q11 4 11 15l-6 9-11 3-11-3Z', 'fill="#32748b" stroke="#174052" stroke-width=".8"') +
    P('M8 21q1-10 9-12h8q8 2 9 12l-8 4H16Z', 'fill="#5699a7"') +
    P('m11 25 10-1 10 1-6 7h-9Z', 'fill="#2c6179"') +
    P('m12 14 9 3 9-3m-16 5 7 2 7-2m-7-10v3', 'fill="none" stroke="#8dc3bf" stroke-width=".8"') +
    P('m7 23 4 1m20 0 4-1', 'stroke="#94c5bf" stroke-width=".7"');
  return DR_SHADOW + '\n' + flips + '\n' + G(`translate(0 ${b}) rotate(${p * 4} 21 34)`, body);
}
function drownedSide({ p, b }) {
  const back = G(`translate(${-p * 2} ${p < 0 ? -1.5 : 0})`, P('M15 28 8 31l2 4 7-3Z', DR_FLIP));
  const front = G(`translate(${p * 2} ${p > 0 ? -1.5 : 0})`, P('m27 28 7 3-2 4-7-3Z', DR_FLIP));
  const body =
    P('M17 11 9 3l12 5Z', DR_FIN) +
    P('M6 23Q6 11 17 8h8q11 4 11 15l-5 8-10 3-10-2Z', 'fill="#32748b" stroke="#174052" stroke-width=".8"') +
    P('M10 19q2-7 8-9h8q6 3 8 9l-10 3H12Z', 'fill="#5699a7"') +
    P('m13 26 11-3 10 2-5 6-9 2-7-2Z', 'fill="#2c6179"') +
    P('M22 11 15 2l12 7Z', DR_FIN) +
    P('m12 13 4-2m4 1 4 3', 'fill="none" stroke="#8dc3bf" stroke-width=".8"') +
    P('m27 16 5-1 2 4-5 2Z', 'fill="#b9e8e8"') +
    '<circle cx="30.4" cy="17.8" r="1.1" fill="#213f4b"/>' +
    P('m27 27 7-2m-5 1 0 3m3-3 1 2', 'stroke="#102f3e" stroke-width="1.1" fill="none"') +
    P('m8 23 4 1', 'stroke="#94c5bf" stroke-width=".7"');
  return DR_SHADOW + '\n' + back + front + '\n' + G(`translate(0 ${b}) rotate(${p * 2.5} 21 33)`, body);
}
emit('drowned', 'back', 42, 38, drownedBack, 0.5);
emit('drowned', 'side', 42, 38, drownedSide, 0.5);

// ── blight_lancer (52×72, tripod with a glowing chest core) ─────────────────
const LA_SHADOW = '<ellipse cx="26" cy="68" rx="18" ry="3" fill="#101019" opacity=".3"/>';
const LA_LEG = 'fill="none" stroke="#352a40" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"';
const LA_ARM = 'fill="none" stroke="#42314f" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"';
const LA_SPIKES = 'fill="#a16bb6" stroke="#4e365e" stroke-width=".7"';
const LA_L = [[17, 47], [12, 65], [9, 68]], LA_C = [[23, 48], [25, 66], [24, 68]], LA_R = [[35, 47], [40, 65], [44, 68]];
const LA_LF = [[11, 65], [16, 67], [12, 69], [7, 69]], LA_CF = [[21, 67], [26, 67], [24, 69], [19, 69]], LA_RF = [[37, 67], [42, 65], [46, 69], [39, 69]];
const laLeg = (pts, foot, b, lift) => P(pl(legPts(pts, { b, lift })), LA_LEG) + P(pl(mv(foot, 0, -lift), true), 'fill="#54415d"');
function lancerBack({ p, b }) {
  // slow tripod charge: left, centre, right, centre
  const lL = p < 0 ? 3 : 0, lR = p > 0 ? 3 : 0, lC = p === 0 && b < 0 ? 2 : 0;
  const legs = laLeg(LA_L, LA_LF, b, lL) + laLeg(LA_C, LA_CF, b, lC) + laLeg(LA_R, LA_RF, b, lR);
  const sw = p * 2;
  const body =
    P('M15 16 12 4l5 5 4 8m5-2V1l3 13m6 3 4-13-5 5-4 8', LA_SPIKES) +
    P('M12 29q1-12 14-14 13 2 14 14l3 18-9 6-17 0-8-6Z', 'fill="#4b3657" stroke="#251d2f" stroke-width=".9"') +
    P('M15 28q2-9 11-11 9 2 11 11l-4 9H19Z', 'fill="#725282"') +
    P('m15 37 11 0 11 0-3 13-8 3-8-3Z', 'fill="#392c46"') +
    G(`rotate(${r2(sw)} 11 34)`, P('m10 34-8 10 6 7 7-5', LA_ARM) + P('m10 42-5 5', 'stroke="#ad79c0" stroke-width=".8"')) +
    G(`rotate(${r2(sw)} 41 34)`, P('m42 34 8 10-6 7-7-5', LA_ARM) + P('m42 42 5 5', 'stroke="#ad79c0" stroke-width=".8"')) +
    // the core's glow leaking through a seam in the back plate
    P('m26 22-2 4 2.5 3-2 4 1.5 4m-2-11-3-1m5.5 4 3-1', 'fill="none" stroke="#9b5fa8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"') +
    P('m26 22-2 4 2.5 3-2 4 1.5 4', 'fill="none" stroke="#f5b5ee" stroke-width=".7" stroke-linejoin="round"') +
    P('M26 17v3m0 21v5m-7-25 4 3m10-3-4 3m-8 22 5 2 5-2', 'stroke="#b387bf" stroke-width=".8" fill="none"');
  return LA_SHADOW + '\n' + legs + '\n' + G(b ? `translate(0 ${b})` : '', body);
}
// side legs: rotated about the hip; foot points right
const LA_SLEG = P('M0 0V18', LA_LEG) + P('m-2 17 5 1 4 3-1 1h-9Z', 'fill="#54415d"');
function lancerSide({ p, b }) {
  // rest angles (deg, negative = foot forward): far-front, rear, near-front
  const lift = (on) => (on ? 2.5 : 0);
  const aFar = -6 + p * 10, aNear = -10 - p * 10, aRear = 12;
  const rearLift = p === 0 && b < 0;
  const far = G(`translate(29 ${47 + b - lift(p > 0)}) rotate(${r2(aFar)})`, LA_SLEG);
  const rear = G(`translate(20 ${48 + b - lift(rearLift)}) rotate(${r2(rearLift ? 2 : aRear)})`, LA_SLEG);
  const near = G(`translate(27 ${48 + b - lift(p < 0)}) rotate(${r2(aNear)})`, LA_SLEG);
  // arms: elbow out behind the body, forearm bent forward (the front view's
  // bowed arms seen side-on); far arm swings opposite the near one
  const farArm = G(`translate(0 ${b}) rotate(${r2(p * 7)} 25 33)`, P('m25 33-11 8 4 9 7-1', LA_ARM));
  const nearArm = G(`translate(0 ${b}) rotate(${r2(-p * 7)} 26 34)`,
    P('m26 34-11 9 5 9 8-3', LA_ARM) + P('m16 45 3 5', 'stroke="#ad79c0" stroke-width=".8"'));
  const body =
    P('m21 17-6-12 6 4 3 8Z', LA_SPIKES) +
    P('M14 30q1-13 12-15 11 2 12 14l1 18-7 6H19l-6-6Z', 'fill="#4b3657" stroke="#251d2f" stroke-width=".9"') +
    P('M17 27q3-8 10-10 7 2 9 9l-5 10H19Z', 'fill="#725282"') +
    P('m17 37 9 0 10 0-2 13-8 3-7-3Z', 'fill="#392c46"') +
    P('m23 16-1-14 4 13m3 3-1-13 5 6-1 8Z', LA_SPIKES) +
    '<ellipse cx="36" cy="31" rx="4" ry="10" fill="#1c1829" stroke="#9b5fa8" stroke-width="1"/>' +
    '<ellipse cx="36.6" cy="31" rx="2.8" ry="7" fill="#a63ac1" opacity=".65"/>' +
    '<ellipse cx="37" cy="31" rx="1.7" ry="4" fill="#f5b5ee"/>' +
    '<ellipse cx="37.3" cy="31" rx=".8" ry="1.6" fill="white"/>' +
    P('m20 22 4 3m-4 22 6 2 5-2', 'stroke="#b387bf" stroke-width=".8" fill="none"');
  return LA_SHADOW + '\n' + far + rear + farArm + near + '\n' + G(b ? `translate(0 ${b})` : '', body) + nearArm;
}
emit('blight_lancer', 'back', 52, 72, lancerBack, 0.6);
emit('blight_lancer', 'side', 52, 72, lancerSide, 0.6);

// ── stalker (44×30, low spined prowler; native view = side) ─────────────────
const ST_SHADOW = '<ellipse cx="22" cy="27" rx="17" ry="1.8" fill="#0e1016" opacity=".3"/>';
const ST_LEG = 'fill="#30273e" stroke="#171722" stroke-width=".6"';
const ST_SPIKE = 'fill="#79648d" stroke="#42334f" stroke-width=".6"';
// leg polygons in image space; `lift` raises the whole leg (its top is hidden)
const stLeg = (pts, dx, lift) => P(pl(mv(pts, dx, -lift), true), ST_LEG);
const ST_FL = [[15, 20], [18, 20], [17, 25], [14, 28], [11, 27.5], [13, 24]];
const ST_FR = ST_FL.map(([x, y]) => [44 - x, y]);
const ST_BL = [[11, 19], [14, 19], [13, 23], [10, 25], [8, 24.5], [10, 22]];
const ST_BR = ST_BL.map(([x, y]) => [44 - x, y]);
function stalkerFront({ p, b }) {
  // diagonal pairs: front-left + back-right, then front-right + back-left
  const A = p < 0 ? 1.8 : 0, B = p > 0 ? 1.8 : 0;
  const rear = stLeg(ST_BL, 0, B) + stLeg(ST_BR, 0, A);
  const front = stLeg(ST_FL, -A * 0.4, A) + stLeg(ST_FR, B * 0.4, B);
  const body =
    P('M28 12q4-2 5-7l3-1q0 6-6 10', 'fill="#312943" stroke="#171722" stroke-width=".7"') +
    P('m19 10 3-7 3 7Z', ST_SPIKE) +
    P('M9 21q1-10 13-12 12 2 13 12l-6 3H15Z', 'fill="#443451" stroke="#211b2b" stroke-width=".8"') +
    P('M12 17q2-6 10-7 8 1 10 7l-10 1Z', 'fill="#645073"') +
    P('m18 11 4-6 4 6Z', ST_SPIKE) +
    P('m12 15 4-1m12 0 4 1', 'stroke="#a18ba8" stroke-width=".7"') +
    P('M15 23l7-2 7 2-2 3H17Z', 'fill="#2c263b"') +
    // head pushed toward the camera, overlapping the chest
    P('M14 16l8-2.5 8 2.5 1.5 6-4.5 5h-10l-4.5-5Z', 'fill="#52405d" stroke="#211b2b" stroke-width=".6"') +
    P('m13.5 15.5 5 1 1 4-5-1Zm17 0-5 1-1 4 5-1Z', 'fill="#8b729a"') +
    P('m17.5 23 4.5-1.5 4.5 1.5-1.5 3.5-3 1-3-1Z', 'fill="#a89aa9"') +
    '<circle cx="18.4" cy="20.2" r="1.15" fill="#d4b4ee"/><circle cx="18.4" cy="20.3" r=".45" fill="#292033"/>' +
    '<circle cx="25.6" cy="20.2" r="1.15" fill="#d4b4ee"/><circle cx="25.6" cy="20.3" r=".45" fill="#292033"/>';
  return ST_SHADOW + '\n' + G(b ? `translate(0 ${b})` : '', rear) + front + '\n' + G(b ? `translate(0 ${b})` : '', body);
}
function stalkerBack({ p, b }) {
  // seen from behind: rear legs in front, front legs peeking at the sides
  const A = p < 0 ? 1.8 : 0, B = p > 0 ? 1.8 : 0;
  const far = stLeg(ST_BL, 0, A) + stLeg(ST_BR, 0, B);
  const near = stLeg(ST_FL, -B * 0.4, B) + stLeg(ST_FR, A * 0.4, A);
  const body =
    P('m20 11 3-7 3 7Z', ST_SPIKE) +
    P('M9 22q0-11 13-13 13 2 13 13l-6 4H15Z', 'fill="#443451" stroke="#211b2b" stroke-width=".8"') +
    P('M12 19q1-8 10-9 9 1 10 9l-10 2Z', 'fill="#645073"') +
    P('m14 22 8-1 8 1-2 4H16Z', 'fill="#2c263b"') +
    P('m18 13 4-7 4 7Z', ST_SPIKE) +
    P('m14 16 5-1m6 0 5 1m-14 5 3 1', 'stroke="#a18ba8" stroke-width=".7"') +
    // tail: rises from the rump and curls over to the left
    P('M18.5 19q-.5-7-4-11l-1.5-3 3-1q4 5 6.5 15Z', 'fill="#312943" stroke="#171722" stroke-width=".7"') +
    P('m13.6 6.4 2.3-1.4', 'stroke="#936ca6" stroke-width="1"');
  return ST_SHADOW + '\n' + G(b ? `translate(0 ${b})` : '', far) + near + '\n' + G(b ? `translate(0 ${b})` : '', body);
}
emit('stalker', 'front', 44, 30, stalkerFront, 0.5);
emit('stalker', 'back', 44, 30, stalkerBack, 0.5);

// ── husk_wolf (58×42, bushy-tailed husk wolf; native view = side) ───────────
const HW_SHADOW = '<ellipse cx="29" cy="38" rx="21" ry="2.5" fill="#111719" opacity=".25"/>';
const HW_LEG = 'fill="#4f5c63" stroke="#29343b" stroke-width=".6"';
const HW_EAR = 'fill="#596870" stroke="#303a40" stroke-width=".6"';
const hwLeg = (x, top, bot, dx, lift, w = 5) =>
  P(pl([[x, top], [x + w, top], [x + w + dx * 0.5, bot - 3 - lift], [x + w - 0.5 + dx, bot - lift], [x + 0.5 + dx, bot - lift], [x + dx * 0.5, bot - 3 - lift]], true), HW_LEG) +
  P(pl([[x - 1 + dx, bot - 3 - lift], [x + w + 1 + dx, bot - 3 - lift], [x + w + 1.5 + dx, bot - lift], [x - 1.5 + dx, bot - lift]], true), 'fill="#323c43"');
function wolfFront({ p, b }) {
  const A = p < 0 ? 2 : 0, B = p > 0 ? 2 : 0;
  const rear = hwLeg(16, 28, 36, -1, B, 4) + hwLeg(38, 28, 36, 1, A, 4);
  const front = hwLeg(21, 29, 38.5, -0.5 - A * 0.4, A) + hwLeg(32, 29, 38.5, 0.5 + B * 0.4, B);
  const body =
    // tail flagging up behind the left shoulder
    P('M19 24Q13 20 12 10l-1-3 3-1q5 4 8 15Z', 'fill="#59666e" stroke="#303a40" stroke-width=".6"') +
    P('m12 8 3 4 3 9-4-4Z', 'fill="#87939a"') + P('m12 9 3-1.5', 'stroke="#8a6aa0" stroke-width=".7"') +
    P('M15 31q0-14 14-16 14 2 14 16l-6 3H21Z', 'fill="#49415b" stroke="#303a40" stroke-width=".8"') +
    P('M18 26q2-8 11-9 9 1 11 9l-11 2Z', 'fill="#695b77"') +
    P('m18 24 4 3 3-1m15-2-4 3-3-1', 'stroke="#c083d6" stroke-width=".7" fill="none"') +
    P('M22 25l7-1 7 1-2 9-5 1-5-1Z', 'fill="#806d85"') +
    P('m24 33 5 1 5-1', 'stroke="#445158" stroke-width=".7" fill="none"') +
    // head toward the camera
    P('m21 14 1-11 6 7-2 4Zm16 0-1-11-6 7 2 4Z', HW_EAR) +
    P('m23 11 0-5 3 4Zm12 0 0-5-3 4Z', 'fill="#aeaba1"') +
    P('M21 13l8-4 8 4 1 8-5 6h-8l-5-6Z', 'fill="#5a4e67" stroke="#303a40" stroke-width=".7"') +
    P('M25 20l4-1 4 1-1 6-3 1.5-3-1.5Z', 'fill="#a393a4"') +
    P('m27 20.5 4 0-.8 2h-2.4Z', 'fill="#252c30"') +
    P('m27 25 2 1 2-1m-8-3-1-2m13 2 1-2', 'stroke="#445158" stroke-width=".7" fill="none"') +
    '<circle cx="25.2" cy="16.4" r="1.1" fill="#d6a5f1"/><circle cx="25.2" cy="16.5" r=".45" fill="#252b2d"/>' +
    '<circle cx="32.8" cy="16.4" r="1.1" fill="#d6a5f1"/><circle cx="32.8" cy="16.5" r=".45" fill="#252b2d"/>';
  return HW_SHADOW + '\n' + G(b ? `translate(0 ${b})` : '', rear) + front + '\n' + G(b ? `translate(0 ${b})` : '', body);
}
function wolfBack({ p, b }) {
  const A = p < 0 ? 2 : 0, B = p > 0 ? 2 : 0;
  const far = hwLeg(17, 27, 36, -1, A, 4) + hwLeg(37, 27, 36, 1, B, 4);
  const near = hwLeg(19, 29, 38.5, -0.5 - B * 0.4, B, 6) + hwLeg(33, 29, 38.5, 0.5 + A * 0.4, A, 6);
  const body =
    // back of the head and ears above the shoulders
    P('m22 13 1-10 6 7-2 4Zm14 0-1-10-6 7 2 4Z', HW_EAR) +
    P('M22 13l7-4 7 4v6H22Z', 'fill="#5a4e67" stroke="#303a40" stroke-width=".7"') +
    P('M14 32q0-15 15-17 15 2 15 17l-6 3H20Z', 'fill="#49415b" stroke="#303a40" stroke-width=".8"') +
    P('M17 27q2-9 12-10 10 1 12 10l-12 3Z', 'fill="#695b77"') +
    P('m19 31 10-3 10 3-3 3H22Z', 'fill="#806d85"') +
    P('m20 21 5 4 4-2m4 2 5-4m-21 9 4-2', 'stroke="#c083d6" stroke-width=".7" fill="none"') +
    P('m18 26 4 1m14 0 4-1', 'stroke="#445158" stroke-width=".7"') +
    // the big tail, raised over the rump and curling to the right (it sits
    // behind the left shoulder in the front view, so it mirrors here)
    P('M24 33q10 1 14-8 3-6 3-13l-3-2q-1 8-6 12-4 3-9 5Z', 'fill="#59666e" stroke="#303a40" stroke-width=".6"') +
    P('m40.5 12.5-1 7-4 6-7 4 5-4 3.5-6Z', 'fill="#87939a"') + P('m40.6 12.4-2.6-1.6', 'stroke="#8a6aa0" stroke-width=".7"');
  return HW_SHADOW + '\n' + G(b ? `translate(0 ${b})` : '', far) + near + '\n' + G(b ? `translate(0 ${b})` : '', body);
}
emit('husk_wolf', 'front', 58, 42, wolfFront, 0.5);
emit('husk_wolf', 'back', 58, 42, wolfBack, 0.5);

// ── wisp / frost_wraith (32×40, hooded spirit round a glowing core) ─────────
// Front-native: the core faces the viewer. From behind the shroud hides it (a
// dim glow shows through); in profile the core sits at the leading edge and the
// tendrils stream back. The pulse ring that drifts across the core in the
// front motion set drifts the same way here.
const ORB = {
  wisp: { shroud: '#55406b', glow: ['#f2dcff', '#bb84e6', '#563467'], seam: '#d3a9ee', core: '#e8ccfa', heart: '#fff1ff', ring: '#d5b0ec' },
  frost_wraith: { shroud: '#3b687b', glow: ['#e9fcf8', '#8bd0dc', '#397d91'], seam: '#b6edf1', core: '#cbf1f0', heart: '#ffffff', ring: '#d5b0ec', horns: '#b7e5e8' },
};
const ORB_TENDRIL = 'stroke="#9b6fc3" stroke-width="1.5" stroke-linecap="round" opacity=".8"';
const orbDefs = (o) =>
  `<defs><radialGradient id="glow"><stop stop-color="${o.glow[0]}"/><stop offset=".45" stop-color="${o.glow[1]}"/><stop offset="1" stop-color="${o.glow[2]}" stop-opacity=".2"/></radialGradient></defs>`;
const orbMotes = '<circle cx="6" cy="9" r="1" fill="#d9bafa"/><circle cx="26" cy="20" r=".8" fill="#d9bafa"/>';
function orbBack(o) {
  return ({ p, b }) => G(b ? `translate(0 ${b})` : '',
    orbDefs(o) +
    P('M16 3q11 3 11 14-1 6-5 10l2 8-7-6-6 8-1-11Q4 20 6 13 8 5 16 3Z', `fill="${o.shroud}" opacity=".8"`) +
    // the core seen through the back of the shroud
    P('M16 6q8 3 8 11-1 7-7 10-8-3-9-10Q9 8 16 6Z', 'fill="url(#glow)" opacity=".35"') +
    `<circle cx="16" cy="16" r="3" fill="${o.core}" opacity=".22"/>` +
    (p ? `<circle cx="${16 + p}" cy="16" r="5.5" fill="none" stroke="${o.ring}" stroke-width=".7" opacity=".3"/>` : '') +
    P('M16 5.4V27m-5-15q5 2 10 0', `fill="none" stroke="${o.seam}" stroke-width=".7" opacity=".45"`) +
    P(`m11 25-4 ${5 + p * .6}m11-2 0 8m5-11 4 ${6 - p * .6}`, ORB_TENDRIL) +
    (o.horns ? P('m9 11-4-7 8 4m10 0 7-4-4 8', `fill="${o.horns}" opacity=".7"`) : '') +
    orbMotes);
}
function orbSide(o) {
  return ({ p, b }) => G(b ? `translate(0 ${b})` : '',
    orbDefs(o) +
    (o.horns ? P('M12 9 7.4 3.4 15 7.2Z', `fill="${o.horns}" opacity=".45"`) : '') +
    // tendrils streaming back from the hem
    P(`m12 25-6 ${4 + p * .6}m9-1-3 ${7 - p * .4}m6-6 0 8`, ORB_TENDRIL) +
    P('M17 3Q25.4 5 25.4 15.4Q24.6 21.6 20.4 25.4L21.4 33.4 15.6 28.4 9.4 33.4 10.2 24.4Q6.8 18.2 8.8 11.2Q11 4 17 3Z', `fill="${o.shroud}" opacity=".7"`) +
    P('M18 6.4Q24 8.6 24 16.4Q23.2 22.6 18.6 26.2Q12.4 23.4 12 16.6Q12.2 8.6 18 6.4Z', 'fill="url(#glow)"') +
    P('m13.6 14 2.4-5m-2.6 13.4 3.6 5.4', `stroke="${o.seam}" stroke-width=".8" opacity=".75"`) +
    `<circle cx="19.6" cy="16" r="3.8" fill="${o.core}"/><circle cx="20.2" cy="16" r="1.8" fill="${o.heart}"/>` +
    (p ? `<circle cx="${19.2 + p}" cy="16" r="5" fill="none" stroke="${o.ring}" stroke-width=".7" opacity=".65"/>` : '') +
    (o.horns ? P('M14 8.6 8.6 2.4 17.6 6.6Z', `fill="${o.horns}" opacity=".7"`) : '') +
    orbMotes);
}
for (const [key, o] of Object.entries(ORB)) {
  emit(key, 'back', 32, 40, orbBack(o), 0.4);
  emit(key, 'side', 32, 40, orbSide(o), 0.4);
}

// ── write ───────────────────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });
for (const [name, s] of out) writeFileSync(`${OUT}/${name}.svg`, s);
console.log(`wrote ${out.length} files to assets/sprites/views`);
