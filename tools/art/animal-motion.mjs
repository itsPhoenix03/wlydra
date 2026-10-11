// Walk-cycle frames for the wildlife.
//
//   node tools/art/animal-motion.mjs            → writes assets/sprites/views/*
//   node tools/art/animal-motion.mjs --check D  → also writes an "_m0" copy of
//                                                every view (all motion params
//                                                at zero) into directory D, to
//                                                diff against the still frames
//
// Every animal has three views and one still frame per view. This script adds a
// three-frame motion set per view, played 1-2-3-2 by the gait system:
//
//   native view   views/<key>_m1..m3.svg          (deer/boar/lizard/fox/hare: side,
//                                                  crab/toad: front)
//   other views   views/<key>_<view>_m1..m3.svg
//
// The parts below are the still SVGs copied element for element (same hex
// colours, outlines, shadow). Elements that were merged with other parts
// (legs drawn as one multi-subpath path, both hooves in one path…) are split
// into their own paths, and leg geometry that has to bend is written as a
// function of the frame params. With every param at zero each view renders
// exactly like its still frame (see --check).
//
// A view is { w, h, parts, frames }:
//   parts  [chain, content] in paint order. `chain` names transform slots
//          (outer → inner) the element is wrapped in; `content` is a string or
//          a function of the frame's params p.
//   frames { m1, m2, m3 } → { T: { slot: 'svg transform' }, p: { …params } }
// Side views face image-right (the game mirrors them for left).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../assets/sprites/views');

// ── helpers ─────────────────────────────────────────────────────────────────
const r2 = (n) => +(+n).toFixed(2);
const P = (d, a) => `<path d="${d}" ${a}/>`;
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n${body}</svg>\n`;
const tr = (x, y) => (x || y ? `translate(${r2(x)} ${r2(y)})` : '');
const rot = (a, x, y) => (a ? `rotate(${r2(a)} ${r2(x)} ${r2(y)})` : '');
/** Scale about a point. */
const sc = (sx, sy, x, y) => `translate(${r2(x)} ${r2(y)}) scale(${r2(sx)} ${r2(sy)}) translate(${r2(-x)} ${r2(-y)})`;
const cat = (...t) => t.filter(Boolean).join(' ');
/**
 * Swing a rigid leg of length L about its hip by `a` degrees (+ = foot moves
 * back/left), dropping it so the foot stays on the ground line, then lift it.
 */
const swing = (a, px, py, L, lift = 0) =>
  cat(tr(0, L * (1 - Math.cos((a * Math.PI) / 180)) - lift), rot(a, px, py));
/** Absolute polyline "x y x y …" from points, each nudged by [dx, dy]. */
const pts = (list) => list.map(([x, y]) => `${r2(x)} ${r2(y)}`).join(' ');

function render(view, fr) {
  const { T = {}, p = {} } = (fr && view.frames[fr]) || {};
  let out = '';
  for (const [chain, c] of view.parts) {
    const s = typeof c === 'function' ? c(p) : c;
    if (!s) continue;
    const keys = chain ? (Array.isArray(chain) ? chain : [chain]) : [];
    const t = cat(...keys.map((k) => T[k]));
    out += t ? `<g transform="${t}">${s}</g>\n` : `${s}\n`;
  }
  return svg(view.w, view.h, out);
}

// Light/heavy trot for a side view with one visible hind and fore leg. The near
// hind and near fore belong to opposite diagonal pairs, so they swing in
// opposition; in the passing pose the hind (swinging) leg is lifted.
const trotSide = ({ hind, fore, A, bob, lift }) => ({
  m1: { T: { body: tr(0, bob), hind: swing(A, ...hind), fore: swing(-A, ...fore) } },
  m2: { T: { body: tr(0, -bob), hind: swing(-4, ...hind, lift) } },
  m3: { T: { body: tr(0, bob), hind: swing(-A, ...hind), fore: swing(A, ...fore) } },
});

// Front/back trot: diagonal pairs lift alternately; legs move up/down.
// `a` / `b` are the lift amounts handed to the views' leg functions.
const trotFB = ({ bob, lift, slots }) => {
  const f = (la, lb) => {
    const T = { body: tr(0, la || lb ? bob : -bob) };
    for (const [slot, pair, k = 1] of slots) T[slot] = tr(0, -(pair === 'a' ? la : lb) * k);
    return { T, p: { a: la, b: lb } };
  };
  return { m1: f(lift, 0), m2: f(0, 0), m3: f(0, lift) };
};

const V = {};

// ── deer ────────────────────────────────────────────────────────────────────
{
  const leg = 'fill="#8d5c3e" stroke="#5d402d" stroke-width=".45"';
  const hoof = 'fill="#352d2a"';
  V.deer = {
    w: 36, h: 30,
    parts: [
      [null, '<ellipse cx="18" cy="27" rx="13" ry="2" fill="#191813" opacity=".22"/>'],
      ['hind', P('M10 18l2 0-1 7-1 2-2 0 1-2Z', leg) + P('M8 26l3-.2v1.5H8Z', hoof)],
      ['fore', P('M20 18l2-1 1 8 1 2-3 0-1-2Z', leg) + P('M21 25.8l3-.2v1.5h-3Z', hoof)],
      ['body', `<path d="M6 17q2-6 9-7l9 1 3 4-2 6q-5 4-13 2-7-1-6-6Z" fill="#a8764d" stroke="#654735" stroke-width=".6"/>
<path d="m7 16 4-4 8-1 5 2-3 3-10 3Z" fill="#c09469"/>
<path d="m18 18 7-1-2 5-5 1Z" fill="#d6c09a"/>
<path d="m22 13 3-6 4-1 4 4-1 5-4 3-4-1Z" fill="#aa7851" stroke="#674932" stroke-width=".6"/>
<path d="m28 7 4 2-1 3-3 0-2-2Z" fill="#d0a075"/>
<path d="m27 16 5-3 2 1-1 3-4 1Z" fill="#dbc2a0"/>
<path d="m32 14 2-.2 1 1.5-2 1Z" fill="#3b302b"/>
<path d="m25 8-3-4 1-2 4 3m3 1 2-5 2 1-1 6" fill="#b78d62" stroke="#765238" stroke-width=".5"/>
<path d="m24 5-2-1m11-1 2-1" stroke="#765238" stroke-width=".6"/>
<circle cx="29" cy="11" r=".9" fill="#242324"/><circle cx="29.3" cy="10.7" r=".28" fill="#fff1d6"/>
<path d="m7 14-3-2m7 1-2 3m9-2 3 1" fill="none" stroke="#7a543a" stroke-width=".6"/>`],
    ],
    frames: trotSide({ hind: [11, 18.5, 8.5], fore: [21, 18, 9], A: 14, bob: 0.5, lift: 1.2 }),
  };

  V.deer_front = {
    w: 36, h: 30,
    parts: [
      [null, '<ellipse cx="18" cy="27" rx="13" ry="2" fill="#191813" opacity=".22"/>'],
      ['rl', P('M9 17l3 0 0 8-3 0Z', leg)],
      ['rr', P('M24 17l3 0 0 8-3 0Z', leg)],
      ['body', `<path d="M9 14q1-5 9-5t9 5l-1 8q-8 4-16 0Z" fill="#a8764d" stroke="#654735" stroke-width=".6"/>
<path d="m12 14 6-2 6 2-1 8h-10Z" fill="#d6c09a"/>`],
      // front legs are painted over the chest: lift by shortening, not moving
      [null, (p) => P(`M12 19l3 0-.5 ${r2(7 - (p.a || 0))}-2.5 0ZM21 19l3 0 .5 ${r2(7 - (p.b || 0))}-2.5 0Z`, leg)],
      ['flh', P('M11.5 25.6l3-.1v1.8h-3.5Z', hoof)],
      ['frh', P('M21.5 25.6l3 .1 .5 1.7h-3.5Z', hoof)],
      ['body', `<path d="m13 9-3-2 0 3 3 1Zm10 0 3-2 0 3-3 1Z" fill="#c09469" stroke="#674932" stroke-width=".5"/>
<path d="M14 7q4-3 8 0l1 5-2 4h-6l-2-4Z" fill="#aa7851" stroke="#674932" stroke-width=".6"/>
<path d="m15.5 12 5 0 .5 4-3 1-3-1Z" fill="#dbc2a0"/>
<path d="m16.5 15.5 3 0 0 1.5-3 0Z" fill="#3b302b"/>
<path d="m15 7-3-5 1-1 2 3m-2-2-2 0m10 5 3-5-1-1-2 3m2-2 2 0" fill="none" stroke="#765238" stroke-width=".8" stroke-linecap="round"/>
<circle cx="15.8" cy="10.5" r=".9" fill="#242324"/><circle cx="20.2" cy="10.5" r=".9" fill="#242324"/>
<circle cx="16.1" cy="10.2" r=".28" fill="#fff1d6"/><circle cx="20.5" cy="10.2" r=".28" fill="#fff1d6"/>`],
    ],
    // pair a = front-left + rear-right, pair b = front-right + rear-left
    frames: trotFB({ bob: 0.5, lift: 1.3, slots: [['flh', 'a'], ['rr', 'a', 0.8], ['frh', 'b'], ['rl', 'b', 0.8]] }),
  };

  V.deer_back = {
    w: 36, h: 30,
    parts: [
      [null, '<ellipse cx="18" cy="27" rx="13" ry="2" fill="#191813" opacity=".22"/>'],
      ['l', P('M10 18l4 0-.5 7-1.5 2-2.5 0 .5-2Z', leg) + P('M10 25.6l3.5 0 0 1.7-4 0Z', hoof)],
      ['r', P('M22 18l4 0 1 7-1 2-2.5 0-1-2Z', leg) + P('M23 25.6l3.5 0 .5 1.7-4 0Z', hoof)],
      ['body', `<path d="M8 17q0-7 10-8t10 8q-1 6-10 6T8 17Z" fill="#a8764d" stroke="#654735" stroke-width=".6"/>
<path d="m10 15q2-5 8-5t8 5l-8 2Z" fill="#c09469"/>
<path d="m15 18 6 0-1 4-4 0Z" fill="#d6c09a"/>
<path d="m17 21 2 0 .5 2-3 0Z" fill="#c9ad85" stroke="#654735" stroke-width=".4"/>
<path d="M15 8 12 5l-2 0 1 3Zm6 0 3-3 2 0-1 3Z" fill="#c09469" stroke="#674932" stroke-width=".5"/>
<path d="M15 6q3-2 6 0l1 4-1 3h-6l-1-3Z" fill="#aa7851" stroke="#674932" stroke-width=".6"/>
<path d="m15 6-3-4 1-1 2 3m-2-2-2 0m9 4 3-4-1-1-2 3m2-2 2 0" fill="none" stroke="#765238" stroke-width=".8" stroke-linecap="round"/>
<path d="m16 9 4 0 0 2-4 0Z" fill="#c09469"/>`],
    ],
    frames: trotFB({ bob: 0.5, lift: 1.3, slots: [['l', 'a'], ['r', 'b']] }),
  };
}

// ── boar ────────────────────────────────────────────────────────────────────
{
  const leg = 'fill="#4c3d30" stroke="#302922" stroke-width=".5"';
  const hoof = 'fill="#302824"';
  V.boar = {
    w: 40, h: 28,
    parts: [
      [null, '<ellipse cx="20" cy="25" rx="15" ry="2" fill="#191512" opacity=".25"/>'],
      ['hind', P('M8 19l4 0-1 5-2 2-3-.5 1-2Z', leg) + P('M6 24l5 0-.5 2-4-.3Z', hoof)],
      ['fore', P('M27 19l4-1-1 5 1 2-4 0-1-2Z', leg) + P('M27 24l4 0 1 2-5 0Z', hoof)],
      ['body', `<path d="M3 17q0-9 11-11 9-3 17 2 7 4 5 12-4 5-16 5Q6 25 3 17Z" fill="#604b3a" stroke="#362d28" stroke-width=".7"/>
<path d="m5 15 4-6 7-3 8 0 7 4-2 4-9-2-9 5Z" fill="#80644a"/>
<path d="m7 9 2-3 2 2 2-4 2 2 3-3 2 3 3-2 2 3 3-1 2 4" fill="#4e3b30"/>
<path d="m23 10 7-2 6 4 1 6-4 3-7-1-2-6Z" fill="#72533e"/>
<path d="m30 10 4 3-3 2-4-3Z" fill="#a47b5a"/>
<path d="m31 17 6-2 2 2-1 4-7 0Z" fill="#a98a69" stroke="#664c3b" stroke-width=".5"/>
<ellipse cx="37" cy="18" rx="1.1" ry=".65" fill="#59463d"/>
<path d="m29 18 3 0-1 3-2 2-1-1Z" fill="#e8d9bb" stroke="#7d6b5e" stroke-width=".5"/>
<circle cx="32" cy="13" r=".9" fill="#1d2021"/>
<path d="m5 13 4-3m3 11 9 1m-13-5 4 1m7-9 5 1" stroke="#a0805c" stroke-width=".65" opacity=".8"/>`],
    ],
    frames: trotSide({ hind: [10, 19.5, 6.5], fore: [29, 19, 7], A: 13, bob: 0.6, lift: 1 }),
  };

  V.boar_front = {
    w: 40, h: 28,
    parts: [
      [null, '<ellipse cx="20" cy="25" rx="15" ry="2" fill="#191512" opacity=".25"/>'],
      ['rl', P('M11 18l4 0 0 6-1 2-4 0 .5-2Z', leg) + P('M9.5 24l5.5 0 0 2.2-6 0Z', hoof)],
      ['rr', P('M25 18l4 0-.5 6 1.5 2-4 0-1-2Z', leg) + P('M25 24l5.5 0 .5 2.2-6 0Z', hoof)],
      ['body', `<path d="M8 17q0-9 12-10 12 1 12 10-1 5-12 5T8 17Z" fill="#604b3a" stroke="#362d28" stroke-width=".7"/>
<path d="m10 14 4-5 6-1 6 1 4 5-10 2Z" fill="#80644a"/>
<path d="m11 9 2-3 2 2 2-3 2 2 1-2 1 2 2-2 2 3 2-1 2 3" fill="#4e3b30"/>`],
      ['fl', P('M12 19l2 0 0 6-2 0Z', leg) + P('M12 24l3 0 0 2.2-3.5 0Z', hoof)],
      ['fr', P('M26 19l2 0 0 6-2 0Z', leg) + P('M25 24l3 0 .5 2.2-3.5 0Z', hoof)],
      ['body', `<path d="m12 10-3-4 0-2 4 1Zm16 0 3-4 0-2-4 1Z" fill="#72533e" stroke="#362d28" stroke-width=".5"/>
<path d="M12 11q8-4 16 0l2 7q-1 5-10 5t-10-5Z" fill="#72533e" stroke="#362d28" stroke-width=".6"/>
<path d="m14 12 12 0-2 3-8 0Z" fill="#80644a"/>
<path d="m14 17 12 0 1 4-3 2-8 0-3-2Z" fill="#a98a69" stroke="#664c3b" stroke-width=".5"/>
<ellipse cx="18" cy="20" rx="1" ry=".7" fill="#59463d"/><ellipse cx="22" cy="20" rx="1" ry=".7" fill="#59463d"/>
<path d="m13 19-2 2 1 2 2-1Zm14 0 2 2-1 2-2-1Z" fill="#e8d9bb" stroke="#7d6b5e" stroke-width=".5"/>
<circle cx="16" cy="14" r=".9" fill="#1d2021"/><circle cx="24" cy="14" r=".9" fill="#1d2021"/>`],
    ],
    frames: trotFB({ bob: 0.6, lift: 1.2, slots: [['fl', 'a'], ['rr', 'a', 0.8], ['fr', 'b'], ['rl', 'b', 0.8]] }),
  };

  V.boar_back = {
    w: 40, h: 28,
    parts: [
      [null, '<ellipse cx="20" cy="25" rx="15" ry="2" fill="#191512" opacity=".25"/>'],
      ['l', P('M11 17l5 0-.5 7-1 2-4 0 .5-2Z', leg) + P('M9.5 24l5.5 0 0 2.2-6 0Z', hoof)],
      ['r', P('M24 17l5 0 .5 7 1 2-4 0-1.5-2Z', leg) + P('M25 24l5.5 0 .5 2.2-6 0Z', hoof)],
      ['body', `<path d="M7 17q0-9 13-10 13 1 13 10-1 6-13 6T7 17Z" fill="#604b3a" stroke="#362d28" stroke-width=".7"/>
<path d="m9 14 5-6 6-1 6 1 5 6-11 2Z" fill="#80644a"/>
<path d="m19 4 1 4 1-4 2 4 1-3 1 4-8 0 1-3Z" fill="#4e3b30"/>
<path d="M18 7h4v12h-4Z" fill="#4e3b30"/>
<path d="m13 7-3-3 0-2 4 2Zm14 0 3-3 0-2-4 2Z" fill="#72533e" stroke="#362d28" stroke-width=".5"/>
<path d="M20 20q4 0 3 3-1 1-3 0" fill="none" stroke="#302922" stroke-width="1" stroke-linecap="round"/>
<path d="m17 20 6 0 1 2-4 2-4-2Z" fill="#72533e" stroke="#362d28" stroke-width=".4"/>
<path d="m10 17 4 1m16-1-4 1m-12-6 3 1m10-1-3 1" stroke="#a0805c" stroke-width=".65" opacity=".8"/>`],
    ],
    frames: trotFB({ bob: 0.6, lift: 1.2, slots: [['l', 'a'], ['r', 'b']] }),
  };
}

// ── fox ─────────────────────────────────────────────────────────────────────
{
  const leg = 'fill="#98a7b1"';
  const paw = 'stroke="#58636b" stroke-width=".7"';
  V.fox = {
    w: 34, h: 26,
    parts: [
      [null, '<ellipse cx="18" cy="23" rx="12" ry="1.8" fill="#1b2228" opacity=".2"/>'],
      ['body', `<path d="M7 13q-5-4-6 0 0 7 9 7l5-3Z" fill="#d9e2e8" stroke="#8797a3" stroke-width=".5"/>
<path d="M2 13q2-2 5 2l2 3-5-1Z" fill="#f7f9f5"/>
<path d="m9 13 6-4 10 1 4 5-3 5-16 1-4-4Z" fill="#d7e1e7" stroke="#8796a0" stroke-width=".6"/>
<path d="m11 12 5-3 9 2-3 4-11 2Z" fill="#eef1f2"/>
<path d="m13 18 8 0 4-3 1 4-5 2-10 0Z" fill="#b4c4ce"/>`],
      ['hind', P('M10 19l2 0-1 4-2 0Z', leg) + P('M8 23l4-.2', paw)],
      ['fore', P('M22 19l2-1 1 5-2 0Z', leg) + P('M23 23l4-.2', paw)],
      ['body', `<path d="m22 12 3-5 5-2 3 5-1 5-5 3-5-1Z" fill="#e4ebeb" stroke="#8294a0" stroke-width=".6"/>
<path d="m24 8-2-6 5 3Zm5-2 3-5 1 8Z" fill="#a7b8c2" stroke="#71828b" stroke-width=".4"/>
<path d="m25 13 5 1 3 2-4 3-4-2Z" fill="#f5f6f3"/>
<circle cx="28" cy="11" r=".8" fill="#29343b"/><circle cx="33" cy="16" r=".7" fill="#424a4e"/>
<path d="m24 14 3 2m3 1 2 0" stroke="#8c9aa2" stroke-width=".4"/>`],
    ],
    frames: trotSide({ hind: [11, 19, 4.2], fore: [23, 18.5, 4.6], A: 24, bob: 0.5, lift: 1 }),
  };

  V.fox_front = {
    w: 34, h: 26,
    parts: [
      [null, '<ellipse cx="18" cy="23" rx="12" ry="1.8" fill="#1b2228" opacity=".2"/>'],
      ['rl', P('M9 16l3 0 0 7-3 0Z', leg)],
      ['rr', P('M22 16l3 0 0 7-3 0Z', leg)],
      ['body', `<path d="M9 17q0-6 8-6t8 6l-1 4q-7 3-14 0Z" fill="#d7e1e7" stroke="#8796a0" stroke-width=".6"/>
<path d="m12 14 5-3 5 3-1 7h-8Z" fill="#b4c4ce"/>`],
      [null, (p) => P(`M12 18l3 0 0 ${r2(5 - (p.a || 0))}-3 0ZM19 18l3 0 0 ${r2(5 - (p.b || 0))}-3 0Z`, leg)],
      ['flp', P('M11.5 23l3.5 0', paw)],
      ['frp', P('M19 23l3.5 0', paw)],
      ['body', `<path d="m12 8-2-7 5 4Zm10 0 2-7-5 4Z" fill="#a7b8c2" stroke="#71828b" stroke-width=".4"/>
<path d="m12 7q5-3 10 0l2 5-4 5h-6l-4-5Z" fill="#e4ebeb" stroke="#8294a0" stroke-width=".6"/>
<path d="m12 12q5-2 10 0l-3 6h-4Z" fill="#f5f6f3"/>
<circle cx="17" cy="17.5" r=".8" fill="#424a4e"/>
<circle cx="13.8" cy="10.8" r=".8" fill="#29343b"/><circle cx="20.2" cy="10.8" r=".8" fill="#29343b"/>
<path d="m14 7 1 2m5-2-1 2" stroke="#8c9aa2" stroke-width=".4"/>`],
    ],
    frames: trotFB({ bob: 0.5, lift: 1.2, slots: [['flp', 'a'], ['rr', 'a', 0.8], ['frp', 'b'], ['rl', 'b', 0.8]] }),
  };

  V.fox_back = {
    w: 34, h: 26,
    parts: [
      [null, '<ellipse cx="18" cy="23" rx="12" ry="1.8" fill="#1b2228" opacity=".2"/>'],
      ['l', P('M9 17l4 0-.5 6-3.5 0Z', leg) + P('M8.5 23l4 0', paw)],
      ['r', P('M21 17l4 0 .5 6-3.5 0Z', leg) + P('M21.5 23l4 0', paw)],
      ['body', `<path d="M8 17q0-7 9-7t9 7q-1 4-9 4t-9-4Z" fill="#d7e1e7" stroke="#8796a0" stroke-width=".6"/>
<path d="m10 15q2-4 7-4t7 4l-7 1Z" fill="#eef1f2"/>`],
      [['body', 'tail'], `<path d="M17 15q-7 0-6 6 2 5 6 4 4 1 6-4 1-6-6-6Z" fill="#d9e2e8" stroke="#8797a3" stroke-width=".5"/>
<path d="M14 22q3 3 6 0l-3 3Z" fill="#f7f9f5"/>`],
      ['body', `<path d="m13 8-2-7 5 4Zm8 0 2-7-5 4Z" fill="#a7b8c2" stroke="#71828b" stroke-width=".4"/>
<path d="m13 7q4-3 8 0l1 5-5 2-5-2Z" fill="#e4ebeb" stroke="#8294a0" stroke-width=".6"/>
<path d="m14 7 1 3m4-3-1 3" stroke="#8c9aa2" stroke-width=".4"/>`],
    ],
    frames: (() => {
      const f = trotFB({ bob: 0.5, lift: 1.2, slots: [['l', 'a'], ['r', 'b']] });
      // the brush swings a touch against the stepping leg
      f.m1.T.tail = rot(4, 17, 15);
      f.m3.T.tail = rot(-4, 17, 15);
      return f;
    })(),
  };
}

// ── lizard ──────────────────────────────────────────────────────────────────
{
  const legA = 'fill="none" stroke="#8d794a" stroke-width="1.3" stroke-linecap="round"';
  // side legs: hip fixed, foot (and its toes) slides along / lifts off the ground
  const sideLegs = ({ h = [0, 0], f = [0, 0] }) =>
    P(`M10 15 ${r2(7 + h[0])} ${r2(19 + h[1])}l-4 0m2-1 0 2m3-1 1 1M24 15 ${r2(27 + f[0])} ${r2(19 + f[1])}l5 0m-2 0 0 2m-4-2-1 1`, legA);
  V.lizard = {
    w: 36, h: 22,
    parts: [
      [null, '<ellipse cx="18" cy="19" rx="13" ry="1.7" fill="#181710" opacity=".22"/>'],
      ['tail', '<path d="M9 12Q3 13 1 8l2-1q4 3 9 2Z" fill="#927941" stroke="#544a31" stroke-width=".5"/>'],
      ['body', `<path d="M6 12q7-7 17-5l8 4 1 5-8 2-12-1-6-3Z" fill="#b99a55" stroke="#6b593b" stroke-width=".6"/>
<path d="m8 12 7-4 9 0 4 3-7 2-10 2Z" fill="#ddc078"/>
<path d="m24 9 6 0 4 3 1 3-4 2-6-2Z" fill="#c8a965"/>
<path d="m31 15 4-1v2l-4 1Z" fill="#997d4c"/>
<circle cx="30" cy="11.3" r=".85" fill="#242a26"/><circle cx="30.2" cy="11" r=".2" fill="#fff1c6"/>`],
      [null, sideLegs],
      ['body', `<path d="m13 10 3 0 1 2-3 0Zm5-2 3 1-1 2-3-1Zm5 2 3 1-2 2-3-1Zm-11 4 3 1-1 2-3-1Zm6 0 3 1-1 2-3-1Z" fill="#9d8248" opacity=".8"/>
<path d="m13 9 5-1m4 2 3 1" stroke="#f0d691" stroke-width=".6"/>`],
    ],
    frames: {
      m1: { T: { tail: rot(7, 9, 10.5), body: rot(-0.8, 18, 14) }, p: { h: [-1.6, 0], f: [1.6, 0] } },
      m2: { p: { h: [0, -1.1], f: [0, 0] } },
      m3: { T: { tail: rot(-7, 9, 10.5), body: rot(0.8, 18, 14) }, p: { h: [1.6, 0], f: [-1.6, 0] } },
    },
  };

  // front/back: shoulder fixed under the body; the elbow rises 0.6×lift and the
  // wrist + toes 1.2×lift
  // front: "M11 13 6 10l-2 6m-1 2 3 0m-1-1-2 1M25 13l5-3 2 6m1 2-3 0m1-1 2 1"
  const frontLegs = ({ l = 0, r = 0 }) =>
    P(`M11 13 ${r2(6)} ${r2(10 - l * 0.6)}l-2 ${r2(6 - l * 0.6)}m-1 2 3 0m-1-1-2 1M25 13 ${r2(30)} ${r2(10 - r * 0.6)}l2 ${r2(6 - r * 0.6)}m1 2-3 0m1-1 2 1`,
      legA + ' stroke-linejoin="round"');
  V.lizard_front = {
    w: 36, h: 22,
    parts: [
      [null, '<ellipse cx="18" cy="19" rx="13" ry="1.7" fill="#181710" opacity=".22"/>'],
      ['tail', '<path d="M22 11q6-3 10-1 2 1 1 3" fill="none" stroke="#927941" stroke-width="2.4" stroke-linecap="round"/>'],
      [null, frontLegs],
      ['body', `<path d="M9 14q1-6 9-6t9 6q-3 2-9 2t-9-2Z" fill="#b99a55" stroke="#6b593b" stroke-width=".6"/>
<path d="m11 12 7-3 7 3-7 2Z" fill="#ddc078"/>
<path d="m12 12 2 0 1 1-2 0Zm9 0 2 0 0 1-2 0Z" fill="#9d8248" opacity=".8"/>
<path d="m18 9 0 3" stroke="#f0d691" stroke-width=".6"/>
<path d="M13 14q5-3 10 0l-2 4-3 1.5-3-1.5Z" fill="#c8a965" stroke="#6b593b" stroke-width=".5"/>
<path d="m16 17 4 0-2 2Z" fill="#997d4c"/>
<circle cx="14.8" cy="14.5" r=".85" fill="#242a26"/><circle cx="21.2" cy="14.5" r=".85" fill="#242a26"/>
<circle cx="15" cy="14.2" r=".2" fill="#fff1c6"/><circle cx="21.4" cy="14.2" r=".2" fill="#fff1c6"/>`],
    ],
    frames: {
      m1: { T: { body: tr(-0.6, 0), tail: rot(-5, 22, 11) }, p: { l: 1.4 } },
      m2: { T: { body: tr(0, -0.3) } },
      m3: { T: { body: tr(0.6, 0), tail: rot(5, 22, 11) }, p: { r: 1.4 } },
    },
  };

  // back: "M10 11 5 10l-2 7m-1 1 3 0m-1-1-2 1M26 11l5-1 2 7m1 1-3 0m1-1 2 1"
  const backLegs = ({ l = 0, r = 0 }) =>
    P(`M10 11 5 ${r2(10 - l * 0.6)}l-2 ${r2(7 - l * 0.6)}m-1 1 3 0m-1-1-2 1M26 11 31 ${r2(10 - r * 0.6)}l2 ${r2(7 - r * 0.6)}m1 1-3 0m1-1 2 1`,
      legA + ' stroke-linejoin="round"');
  V.lizard_back = {
    w: 36, h: 22,
    parts: [
      [null, '<ellipse cx="18" cy="19" rx="13" ry="1.7" fill="#181710" opacity=".22"/>'],
      ['tail', '<path d="M14 14h7q1 3 5 3.5l7-1-6 2.5q-9 1-13-5Z" fill="#927941" stroke="#544a31" stroke-width=".5"/>'],
      [null, backLegs],
      ['body', `<path d="M17 4q2-1 3 0l1 3-5 0Z" fill="#c8a965" stroke="#6b593b" stroke-width=".5"/>
<path d="M9 12q1-5 5-5h8q4 0 5 5l-1 4q-8 2-16 0Z" fill="#b99a55" stroke="#6b593b" stroke-width=".6"/>
<path d="m11 11 3-3 8 0 3 3-4 2-6 0Z" fill="#ddc078"/>
<path d="m13 11 3 0 1 2-3 0Zm6-2 3 1-1 2-3-1Zm-2 5 3 0 0 1-3 0Zm-6-1 2 0 0 2-2 0Z" fill="#9d8248" opacity=".8"/>
<path d="m18 7 0 8" stroke="#f0d691" stroke-width=".6"/>`],
    ],
    frames: {
      m1: { T: { body: tr(-0.6, 0), tail: cat(tr(-0.6, 0), rot(-5, 17, 15)) }, p: { l: 1.4 } },
      m2: { T: { body: tr(0, -0.3) } },
      m3: { T: { body: tr(0.6, 0), tail: cat(tr(0.6, 0), rot(5, 17, 15)) }, p: { r: 1.4 } },
    },
  };
}

// ── crab ────────────────────────────────────────────────────────────────────
{
  const legS = 'fill="none" stroke="#9c4e3f" stroke-width="1.5" stroke-linecap="round"';
  // [hip, knee, tip]; the knee follows the tip part-way
  const legPath = ([h, k, t], { dx = 0, sw = 0, lift = 0 }) =>
    `M${pts([[h[0] + dx, h[1]], [k[0] + sw * 0.5, k[1] - lift * 0.5], [t[0] + sw, t[1] - lift]])}`;
  // front/back share the same four legs; group a = outer-left + inner-right
  const LA = [[7, 12], [3, 15], [1, 18]], LB = [[9, 14], [5, 17], [4, 19]];
  const RA = [[23, 12], [27, 15], [29, 18]], RB = [[21, 14], [25, 17], [26, 19]];
  const fbLegs = ({ a = 0, b = 0, dx = 0 }) =>
    P(legPath(LA, { dx, sw: -a * 0.3, lift: a }) + legPath(LB, { dx, sw: -b * 0.3, lift: b })
      + legPath(RA, { dx, sw: b * 0.3, lift: b }) + legPath(RB, { dx, sw: a * 0.3, lift: a }), legS);
  // highlights ride the inner legs (LB in group b, RB in group a)
  const fbHi = ({ a = 0, b = 0, dx = 0 }) =>
    P(`M${pts([[8 + dx, 13], [6 - b * 0.15, 17 - b * 0.5]])}M${pts([[22 + dx, 13], [24 + a * 0.15, 17 - a * 0.5]])}`,
      'stroke="#c16a50" stroke-width=".7"');
  const crabFB = (bodyEls, clawL, clawR) => ({
    w: 30, h: 20,
    parts: [
      [null, '<ellipse cx="15" cy="18" rx="11" ry="1.3" fill="#241b1a" opacity=".22"/>'],
      [null, fbLegs],
      [null, fbHi],
      ['body', bodyEls],
      [['body', 'cl'], clawL],
      [['body', 'cr'], clawR],
    ],
    frames: {
      m1: { T: { body: tr(-0.5, 0), cl: tr(0, -0.6), cr: tr(0, 0.3) }, p: { a: 1.3, dx: -0.5 } },
      m2: { T: { body: tr(0, -0.3) } },
      m3: { T: { body: tr(0.5, 0), cl: tr(0, 0.3), cr: tr(0, -0.6) }, p: { b: 1.3, dx: 0.5 } },
    },
  });
  const claw = 'fill="#c7644c" stroke="#823d32" stroke-width=".55"';
  const clawHi = 'fill="none" stroke="#efae82" stroke-width=".75"';
  V.crab = crabFB(`<path d="M7 9q2-5 8-5t8 5l-2 6q-6 4-12 0Z" fill="#b95646" stroke="#74382f" stroke-width=".7"/>
<path d="M8 9q2-4 7-4t7 4l-4 2H11Z" fill="#dc8060"/>
<path d="m9 12 5-1 6 1-2 3-6 0Z" fill="#a5493b"/>
<path d="m10 7 2-1m4-1 2 1m-8 8 2 1m6 0 2-1" stroke="#efaa81" stroke-width=".65"/>
<path d="m11 6-.4-3m8.4 3 .4-3" stroke="#974537" stroke-width="1"/>
<circle cx="10.6" cy="3" r="1.35" fill="#ad5744"/><circle cx="19.4" cy="3" r="1.35" fill="#ad5744"/>
<circle cx="10.7" cy="2.9" r=".65" fill="#252323"/><circle cx="19.3" cy="2.9" r=".65" fill="#252323"/>`,
  P('M8 10Q4 6 3 3l-2 1 1 5 4 2 3-2Z', claw) + P('M3 4l2 2 2-1', clawHi),
  P('M22 10q4-4 5-7l2 1-1 5-4 2-3-2Z', claw) + P('M27 4l-2 2-2-1', clawHi));

  V.crab_back = crabFB(`<path d="M8 10q2-5 7-5t7 5l-1 5q-6 3-12 0Z" fill="#b95646" stroke="#74382f" stroke-width=".7"/>
<path d="M9 10q2-4 6-4t6 4l-3 2h-6Z" fill="#dc8060"/>
<path d="m10 12 5 1 5-1-1 3-8 0Z" fill="#a5493b"/>
<path d="m11 8 3-1m2 0 3 1m-9 5 3 1m3 0 3-1" stroke="#efaa81" stroke-width=".65"/>`,
  P('M9 11Q5 8 4 4L2 5l1 5 4 2 2-1Z', claw) + P('M4 5l1 2 2-1', clawHi),
  P('M21 11q4-3 5-7l2 1-1 5-4 2-2-1Z', claw) + P('M26 5l-1 2-2-1', clawHi));

  // side: far legs (dimmed) and near legs; group a = far 1,3 + near 2,4
  const far = [[[8, 12], [5, 15], [3, 18]], [[9, 14], [7, 17], [6, 19]], [[11, 14], [10, 17], [9, 19]], [[15, 15], [15, 19], [16, 21]]];
  const near = [[[10, 12], [8, 17]], [[16, 12], [18, 17]], [[21, 13], [22, 17]], [[16, 12], [16, 17]]];
  const g = (i, A, B) => (i % 2 === 0 ? A : B);
  const sideFar = ({ sa = 0, sb = 0, la = 0, lb = 0 }) =>
    P(far.map((L, i) => legPath(L, { sw: g(i, sa, sb), lift: g(i, la, lb) })).join(''), legS + ' opacity=".7"');
  const sideNear = ({ sa = 0, sb = 0, la = 0, lb = 0 }) =>
    P(near.map(([h, t], i) => `M${pts([h, [t[0] + g(i, sb, sa), t[1] - g(i, lb, la)]])}`).join(''), legS);
  V.crab_side = {
    w: 30, h: 20,
    parts: [
      [null, '<ellipse cx="15" cy="18" rx="11" ry="1.3" fill="#241b1a" opacity=".22"/>'],
      [null, sideFar],
      [null, sideNear],
      ['body', `<path d="M9 10q1-5 6-5t6 5l-1 5q-4 3-9 0Z" fill="#b95646" stroke="#74382f" stroke-width=".7"/>
<path d="M10 10q1-4 5-4t5 4l-3 2h-4Z" fill="#dc8060"/>
<path d="m11 12 4 1 4-1-1 3-6 0Z" fill="#a5493b"/>
<path d="m12 8 3-1m2 0 2 1" stroke="#efaa81" stroke-width=".65"/>
<path d="m17 7-.4-4" stroke="#974537" stroke-width="1"/>
<circle cx="16.7" cy="3" r="1.35" fill="#ad5744"/><circle cx="16.8" cy="2.9" r=".65" fill="#252323"/>`],
      [['body', 'claw'], `<path d="M20 11q5-1 8-5l2 1-1 5-4 3-4-1Z" fill="#c7644c" stroke="#823d32" stroke-width=".55"/>
<path d="m22 7 4-2" fill="none" stroke="#efae82" stroke-width=".75"/>`],
    ],
    frames: {
      m1: { T: { body: tr(0, 0.4), claw: tr(0, -0.5) }, p: { sa: 1.2, sb: -1.2 } },
      m2: { T: { body: tr(0, -0.3) }, p: { la: 1.1 } },
      m3: { T: { body: tr(0, 0.4), claw: tr(0, 0.3) }, p: { sa: -1.2, sb: 1.2 } },
    },
  };
}

// ── hare (hop) ──────────────────────────────────────────────────────────────
{
  const footA = 'fill="#e8edef" stroke="#929fa9" stroke-width=".4"';
  const ears = `<path d="M15 9 14 1q0-2 2-1l3 8Zm5 0 1-8q1-2 2 0l-1 10Z" fill="#d4dbe4" stroke="#909aa7" stroke-width=".5"/>
<path d="m16 3 1 5m5-5-1 6" stroke="#c59f9c" stroke-width="1"/>`;
  V.hare = {
    w: 26, h: 26,
    parts: [
      [null, '<ellipse cx="13" cy="23" rx="9" ry="1.7" fill="#1d2329" opacity=".2"/>'],
      [['body', 'head', 'ears'], ears],
      // fore leg, re-authored (hidden under the chest in the still)
      [null, (p) => p.fore && P(p.fore, footA)],
      ['body', `<path d="M3 16q1-7 9-7l7 2 2 6-5 5-8 0q-5-1-5-6Z" fill="#dbe1e7" stroke="#929fa9" stroke-width=".5"/>
<path d="m5 13 4-3 6 0 3 4-5 3-6-1Z" fill="#f4f6f5"/>`],
      [['body', 'hind'], (p) => `<path d="m6 17 6-1 4 3-2 3H7Z" fill="#c2ccd5"/>\n${p.foot ? P(p.foot, 'fill="#e8edef"') : '<path d="m7 20 7 0 2 3H5Z" fill="#e8edef"/>'}`],
      [['body', 'head'], `<path d="m15 13 3-5 5 1 2 4-2 5-5 1-3-3Z" fill="#e8edf0" stroke="#99a6ad" stroke-width=".5"/>
<path d="m21 14 4 1-1 3-3 0Z" fill="#f7f7f1"/>
<circle cx="20" cy="12" r=".8" fill="#262b30"/><circle cx="20.2" cy="11.7" r=".2" fill="white"/>
<circle cx="24" cy="15.5" r=".55" fill="#8f7074"/>
<path d="m19 17 3 1m-1-2 3-1m-6 2 4 3" stroke="#8c989b" stroke-width=".35"/>`],
      ['body', '<circle cx="4" cy="14" r="2.1" fill="#f7f8f6" stroke="#b9c4cc" stroke-width=".4"/>'],
    ],
    frames: {
      // crouch: haunches gathered, chest low, ears laid back a little
      m1: {
        T: { body: sc(1.03, 0.92, 13, 23), head: tr(0.3, 0.7), ears: rot(-14, 17.5, 9) },
        p: { fore: 'M16.6 19.5l1.8 0 .7 3.4-2.9 0Z' },
      },
      // stretched in the air: hind feet thrown back, fore paws reaching
      m2: {
        T: { body: cat(tr(0, -1.6), rot(-3, 13, 16), sc(1.03, 0.97, 13, 16)), head: tr(0.2, 0.3), ears: rot(-58, 20, 10), hind: rot(10, 11, 18) },
        p: { fore: 'M16.4 15.8l2-.3 3.8 3.2-.5 1.2-1.6-.3Z', foot: 'M7.5 19.4l3.6 1.1-6.6 2.4-3.4-.7Z' },
      },
      // landing on the fore paws, rump still up
      m3: {
        T: { body: cat(tr(-0.7, 0), rot(9, 19, 23)), ears: rot(-18, 19, 9.5), hind: rot(-10, 11, 18) },
        p: { fore: 'M17.1 18l1.9-.1.6 4.8-2.9.1Z' },
      },
    },
  };

  const earsF = `<path d="M9 9 8 2q0-2 2-1l3 8Zm8 0 1-7q0-2-2-1l-3 8Z" fill="#d4dbe4" stroke="#909aa7" stroke-width=".5"/>`;
  V.hare_front = {
    w: 26, h: 26,
    parts: [
      [null, '<ellipse cx="13" cy="23" rx="9" ry="1.7" fill="#1d2329" opacity=".2"/>'],
      [['body', 'head', 'ears'], `${earsF}\n<path d="m10 3 1 5m6-5-1 5" stroke="#c59f9c" stroke-width="1"/>`],
      ['body', `<path d="M5 17q0-6 8-6t8 6l-1 5q-7 2-14 0Z" fill="#dbe1e7" stroke="#929fa9" stroke-width=".5"/>
<path d="m8 15 5-3 5 3-1 6h-8Z" fill="#f4f6f5"/>`],
      ['feet', '<path d="m7 21 3 0 0 2-4 0Zm9 0 3 0 1 2-4 0Z" fill="#e8edef" stroke="#929fa9" stroke-width=".4"/>'],
      [['body', 'head'], `<path d="M8 11q0-4 5-4t5 4l-1 4-4 1-4-1Z" fill="#e8edf0" stroke="#99a6ad" stroke-width=".5"/>
<path d="m12 13 2 0 0 2-2 0Z" fill="#f7f7f1"/>
<circle cx="13" cy="15" r=".55" fill="#8f7074"/>
<circle cx="10.5" cy="11.5" r=".8" fill="#262b30"/><circle cx="15.5" cy="11.5" r=".8" fill="#262b30"/>
<circle cx="10.7" cy="11.2" r=".2" fill="white"/><circle cx="15.7" cy="11.2" r=".2" fill="white"/>`],
    ],
    frames: {
      m1: { T: { body: sc(1.04, 0.92, 13, 23), head: tr(0, 0.7), ears: sc(1, 0.82, 13, 9) } },
      m2: { T: { body: cat(tr(0, -1.6), sc(0.98, 1.02, 13, 23)), ears: sc(1, 0.8, 13, 9), feet: tr(0, -0.9) } },
      m3: { T: { body: sc(1.02, 0.96, 13, 23), head: tr(0, 1), ears: sc(1, 0.9, 13, 9) } },
    },
  };

  V.hare_back = {
    w: 26, h: 26,
    parts: [
      [null, '<ellipse cx="13" cy="23" rx="9" ry="1.7" fill="#1d2329" opacity=".2"/>'],
      [['body', 'head', 'ears'], earsF],
      ['body', `<path d="M7 17q0-7 6-7t6 7l1 4q-1 3-7 3t-7-3Z" fill="#dbe1e7" stroke="#929fa9" stroke-width=".5"/>
<path d="m8 14 5-3 5 3-5 3Z" fill="#f4f6f5"/>`],
      ['feet', '<path d="m5 19 4-2 1 4-1 2-5 0Zm16 0-4-2-1 4 1 2 5 0Z" fill="#e8edef" stroke="#929fa9" stroke-width=".4"/>'],
      [['body', 'head'], '<path d="M9 10q0-3 4-3t4 3l-1 2-3 1-3-1Z" fill="#e8edf0" stroke="#99a6ad" stroke-width=".5"/>'],
      ['body', '<circle cx="13" cy="19" r="2.1" fill="#f7f8f6" stroke="#b9c4cc" stroke-width=".4"/>'],
    ],
    frames: {
      m1: { T: { body: sc(1.04, 0.92, 13, 23), head: tr(0, 0.6), ears: sc(1, 0.82, 13, 9) } },
      m2: { T: { body: cat(tr(0, -1.6), sc(0.98, 1.02, 13, 23)), ears: sc(1, 0.8, 13, 9), feet: cat(tr(0, -0.6), sc(1, 1.15, 13, 23)) } },
      m3: { T: { body: tr(0, -1), head: tr(0, 1.6), ears: sc(1, 0.88, 13, 9), feet: tr(0, -1.6) } },
    },
  };
}

// ── toad (hop) ──────────────────────────────────────────────────────────────
{
  const legF = 'fill="#5e754c" stroke="#314d37" stroke-width=".55"';
  const toes = 'stroke="#5e754c" stroke-width=".6" stroke-linecap="round"';
  const toadFB = (bodyEls) => ({
    w: 28, h: 22,
    parts: [
      [null, '<ellipse cx="14" cy="19" rx="11" ry="1.7" fill="#101914" opacity=".22"/>'],
      ['ll', P('M5 15l-3 3 4 1 4-2', legF)],
      ['rl', P('M22 15l4 3-4 1-4-2', legF)],
      ['body', bodyEls],
      ['ll', P('M3 18l-2 2m5-1-1 2', toes)],
      ['rl', P('M23 19l2 2m-4-2-1 2', toes)],
    ],
    frames: {
      // crouch: squat and wide, legs braced out
      m1: { T: { body: sc(1.04, 0.92, 14, 19.5), ll: tr(-0.6, 0), rl: tr(0.6, 0) } },
      // leap: body up and stretched, hind legs trailing beneath
      m2: {
        T: {
          body: cat(tr(0, -1.8), sc(0.96, 1.04, 14, 19.5)),
          ll: cat(tr(1.4, -0.6), sc(1, 1.15, 5, 15)), rl: cat(tr(-1.4, -0.6), sc(1, 1.15, 22, 15)),
        },
      },
      // land: front down, hind legs still tucked up
      m3: { T: { body: sc(1.03, 0.95, 14, 19.5), ll: tr(0.4, -1.6), rl: tr(-0.4, -1.6) } },
    },
  });
  V.toad = toadFB(`<path d="M3 14q0-5 6-8l10 0q6 3 6 8l-2 4q-8 4-18 0Z" fill="#657e50" stroke="#3e5b3f" stroke-width=".7"/>
<path d="m5 12 4-5 10 0 4 5-4 4H9Z" fill="#8da36a"/>
<path d="m6 15 6 1 5 0 5-1-4 4H9Z" fill="#c1b18a"/>
<path d="M6 7q-1-4 3-4 3 0 3 4Zm10 0q0-4 3-4 4 0 3 4Z" fill="#738b5a" stroke="#3e5b3f" stroke-width=".5"/>
<circle cx="9" cy="6.5" r="1.5" fill="#d6bf76"/><circle cx="19" cy="6.5" r="1.5" fill="#d6bf76"/>
<circle cx="9" cy="6.5" r=".65" fill="#25312a"/><circle cx="19" cy="6.5" r=".65" fill="#25312a"/>
<path d="m11 14q3 1 6 0" fill="none" stroke="#4d6347" stroke-width=".7"/>
<g fill="#607850"><circle cx="7" cy="10" r=".8"/><circle cx="14" cy="9" r=".9"/><circle cx="20" cy="11" r=".7"/><circle cx="10" cy="13" r=".5"/></g>`);
  V.toad_back = toadFB(`<path d="M3 14q0-6 6-8l10 0q6 2 6 8l-2 4q-8 4-18 0Z" fill="#657e50" stroke="#3e5b3f" stroke-width=".7"/>
<path d="m5 12 4-5 10 0 4 5-4 4H9Z" fill="#7d9660"/>
<path d="m10 17 4 1 4-1-1 2h-6Z" fill="#8da36a"/>
<path d="M7 7q0-3 3-3 3 0 3 3Zm8 0q0-3 3-3 3 0 3 3Z" fill="#738b5a" stroke="#3e5b3f" stroke-width=".5"/>
<path d="m14 7 0 9" stroke="#4d6347" stroke-width=".7"/>
<g fill="#4f6841"><circle cx="7" cy="11" r=".9"/><circle cx="14" cy="9" r=".9"/><circle cx="20" cy="11" r=".8"/><circle cx="10" cy="13" r=".7"/><circle cx="18" cy="14" r=".7"/><circle cx="12" cy="15" r=".5"/></g>`);

  const legS = 'fill="#5e754c" stroke="#314d37" stroke-width=".5"';
  V.toad_side = {
    w: 28, h: 22,
    parts: [
      [null, '<ellipse cx="14" cy="19" rx="11" ry="1.7" fill="#101914" opacity=".22"/>'],
      ['body', `<path d="M3 15q0-5 5-8 4-3 9-1l6 4 1 5-2 3q-9 4-18 0Z" fill="#657e50" stroke="#3e5b3f" stroke-width=".7"/>
<path d="m5 13 4-5 8-1 5 4-4 4H9Z" fill="#8da36a"/>
<path d="m10 17 7 0 5-1-3 3H10Z" fill="#c1b18a"/>
<path d="M14 7q0-4 4-4 4 0 4 4Z" fill="#738b5a" stroke="#3e5b3f" stroke-width=".5"/>
<circle cx="19.5" cy="6.3" r="1.5" fill="#d6bf76"/><circle cx="20" cy="6.3" r=".65" fill="#25312a"/>
<path d="m17 14q4 1 8 0" fill="none" stroke="#4d6347" stroke-width=".7"/>
<g fill="#607850"><circle cx="8" cy="11" r=".8"/><circle cx="13" cy="9" r=".9"/><circle cx="10" cy="14" r=".6"/></g>`],
      [['body', 'hind'], (p) => P(p.thigh || 'm6 14q5-2 8 2l-4 3-6 0Z', legS) + P(p.hfoot || 'M3 19l4 1-1-2z', legS)],
      [['body', 'fore'], P('M18 18l6 2-1-3z', legS)],
    ],
    frames: {
      m1: { T: { body: sc(1.03, 0.92, 14, 19.5), hind: tr(0.5, 0), fore: tr(-0.3, 0) } },
      // leap: nose up, hind leg kicked straight back, fore foot reaching
      m2: {
        T: { body: cat(tr(0.5, -1.6), rot(-10, 14, 14)), fore: cat(tr(1.6, 0.6), rot(-15, 18, 18)) },
        p: { thigh: 'M7 13.5q5-1.5 7 2l-8 3.2-4.6-.2Z', hfoot: 'M2.6 18.2l-2 1.4 4.4.1z' },
      },
      // land: nose down onto the fore foot, rump and hind leg still up
      m3: { T: { body: rot(8, 21, 19), hind: rot(12, 12, 15), fore: rot(-8, 21, 19) } },
    },
  };
}

// ── write ───────────────────────────────────────────────────────────────────
const checkIdx = process.argv.indexOf('--check');
const checkDir = checkIdx > 0 ? process.argv[checkIdx + 1] : null;
mkdirSync(OUT, { recursive: true });
let n = 0;
for (const [name, view] of Object.entries(V)) {
  for (const fr of ['m1', 'm2', 'm3']) {
    writeFileSync(resolve(OUT, `${name}_${fr}.svg`), render(view, fr));
    n++;
  }
  if (checkDir) {
    mkdirSync(checkDir, { recursive: true });
    writeFileSync(resolve(checkDir, `${name}_m0.svg`), render(view, null));
  }
}
console.log(`wrote ${n} frames to ${OUT}`);
