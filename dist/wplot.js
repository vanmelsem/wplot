var Gt = Object.defineProperty;
var zt = (i, t, e) => t in i ? Gt(i, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : i[t] = e;
var d = (i, t, e) => zt(i, typeof t != "symbol" ? t + "" : t, e);
function yt(i, t, e, s) {
  const n = i.min, r = i.max;
  if (s === "log" && n > 0 && r > 0) {
    const c = Math.log10(n), a = Math.log10(r), h = (e - t) / (a - c || 1);
    return {
      mode: s,
      worldMin: n,
      worldMax: r,
      screenMin: t,
      screenMax: e,
      scale: h,
      invScale: 1 / h,
      logMin: c,
      logMax: a
    };
  }
  const o = (e - t) / (r - n || 1);
  return {
    mode: "linear",
    worldMin: n,
    worldMax: r,
    screenMin: t,
    screenMax: e,
    scale: o,
    invScale: 1 / o
  };
}
function Xt(i) {
  const t = (i.worldX.min + i.worldX.max) * 0.5, e = (i.worldY.min + i.worldY.max) * 0.5, s = yt(
    i.worldX,
    i.originX,
    i.originX + i.screenW,
    i.scaleX
  ), n = yt(
    i.worldY,
    i.originY + i.screenH,
    i.originY,
    i.scaleY
  );
  return {
    x: s,
    y: n,
    originX: i.originX,
    originY: i.originY,
    screenW: i.screenW,
    screenH: i.screenH,
    dpr: i.dpr,
    renderOriginWorldX: t,
    renderOriginWorldY: e
  };
}
function gt(i, t) {
  if (i.mode === "log" && i.logMin != null && i.logMax != null && t > 0) {
    const e = Math.log10(t);
    return i.screenMin + (e - i.logMin) * i.scale;
  }
  return i.screenMin + (t - i.worldMin) * i.scale;
}
function vt(i, t) {
  if (i.mode === "log" && i.logMin != null && i.logMax != null) {
    const e = i.logMin + (t - i.screenMin) * i.invScale;
    return Math.pow(10, e);
  }
  return i.worldMin + (t - i.screenMin) * i.invScale;
}
function wt(i, t, e) {
  return {
    x: gt(i.x, t),
    y: gt(i.y, e)
  };
}
function Vt(i, t, e) {
  return {
    x: vt(i.x, t),
    y: vt(i.y, e)
  };
}
function tt(i, t, e) {
  return t >= i.origin.x && t <= i.origin.x + i.size.width && e >= i.origin.y && e <= i.origin.y + i.size.height;
}
function ft(i, t, e) {
  let s = 0, n = e;
  for (; s < n; ) {
    const r = s + n >>> 1;
    (i[r] ?? 0) < t ? s = r + 1 : n = r;
  }
  return s;
}
function dt(i, t, e) {
  let s = 0, n = e;
  for (; s < n; ) {
    const r = s + n >>> 1;
    (i[r] ?? 0) <= t ? s = r + 1 : n = r;
  }
  return s;
}
function Ft(i, t, e) {
  const s = i.x, n = i.y, r = t / s.scale, o = e / n.scale;
  return {
    x: { min: s.worldMin - r, max: s.worldMax - r },
    y: { min: n.worldMin - o, max: n.worldMax - o }
  };
}
function kt(i, t, e, s) {
  if (s === "log" && i.min > 0 && i.max > 0 && t > 0) {
    const n = Math.log10(i.min), r = Math.log10(i.max), o = Math.log10(t), c = o + (n - o) * e, a = o + (r - o) * e;
    return { min: Math.pow(10, c), max: Math.pow(10, a) };
  }
  return {
    min: t + (i.min - t) * e,
    max: t + (i.max - t) * e
  };
}
const U = {
  line: "series/line",
  step: "series/step",
  scatter: "series/scatter",
  bars: "series/bars",
  band: "series/band",
  candles: "series/candles"
};
function Mt() {
  return { dirty: !0, revision: 1 };
}
function Z(i) {
  i.dirty = !0, i.revision += 1;
}
function ct(i) {
  i.dirty = !1;
}
function _t(i, t, e, s, n) {
  if (e < 2) return 0;
  let r = 0;
  n[r++] = i[0] ?? 0, n[r++] = t[0] ?? 0;
  for (let o = 0; o < e - 1; o++) {
    const c = i[o] ?? 0, a = t[o] ?? 0, h = i[o + 1] ?? 0, l = t[o + 1] ?? 0;
    if (s === "start")
      n[r++] = c, n[r++] = l, n[r++] = h, n[r++] = l;
    else if (s === "center") {
      const f = (c + h) * 0.5;
      n[r++] = f, n[r++] = a, n[r++] = f, n[r++] = l;
    } else
      n[r++] = h, n[r++] = a, n[r++] = h, n[r++] = l;
  }
  return r;
}
class Et {
  constructor(t) {
    d(this, "map", /* @__PURE__ */ new Map());
    this.label = t;
  }
  register(t) {
    this.map.set(t.kind, t);
  }
  get(t) {
    const e = this.map.get(t);
    if (!e) throw new Error(`Unknown ${this.label} kind: ${t}`);
    return e;
  }
}
class Ot extends Et {
  constructor() {
    super("series");
  }
}
function X(i, t) {
  const e = new Float32Array(i.length);
  if (i instanceof Float32Array || i instanceof Float64Array) {
    for (let s = 0; s < i.length; s++)
      e[s] = (i[s] ?? 0) - t;
    return e;
  }
  for (let s = 0; s < i.length; s++)
    e[s] = (i[s] ?? 0) - t;
  return e;
}
function mt(i, t) {
  return t < 0 || t >= i.count || t >= i.x.length || t >= i.y.length ? null : {
    x: (i.x[t] ?? 0) + i.offsetX,
    y: (i.y[t] ?? 0) + i.offsetY
  };
}
function At(i, t, e, s, n, r, o, c) {
  if (s < 2) return null;
  const a = o > 0 ? 1 / o : 0, h = c > 0 ? 1 / c : 0, l = n - o, f = n + o, g = ft(t, l, s), x = dt(t, f, s), u = s - 2, y = Math.max(0, Math.min(u, g - 1)), k = Math.max(0, Math.min(u, x));
  if (y > k) return null;
  let v = -1, b = 1 / 0;
  for (let m = y; m <= k; m++) {
    const p = t[m] ?? 0, w = e[m] ?? 0, P = t[m + 1] ?? 0, M = e[m + 1] ?? 0, S = P - p, T = M - w, _ = n - p, L = r - w, N = _ * S + L * T;
    let z = 0;
    if (N > 0) {
      const E = S * S + T * T;
      E > 0 && (z = Math.min(1, N / E));
    }
    const Q = p + z * S, $ = w + z * T, O = n - Q, I = r - $, R = a ? O * a : 0, D = h ? I * h : 0;
    if (R * R + D * D > 1) continue;
    const W = O * O + I * I;
    if (W < b) {
      const E = n - p, V = r - w, A = n - P, F = r - M;
      v = E * E + V * V <= A * A + F * F ? m : m + 1, b = W;
    }
  }
  return v < 0 ? null : {
    hit: { kind: "series-point", seriesId: i, index: v },
    dist2: b
  };
}
function Ut(i, t, e, s, n, r, o, c) {
  const a = t.f32(4);
  a[0] = e, a[1] = s, a[2] = n, a[3] = r, i.push({
    kind: "path",
    points: a,
    count: 2,
    widthPx: o,
    join: "miter",
    cap: "butt",
    color: c,
    opacity: 1
  });
}
function pt(i) {
  const t = i.scratch.f32(4);
  t[0] = i.x, t[1] = i.y, t[2] = i.width, t[3] = i.height, i.out.push({
    kind: "quad",
    mode: "rect",
    rects: t,
    count: 1,
    fill: i.fill,
    stroke: i.stroke,
    strokeWidthPx: i.strokeWidthPx,
    roundness: i.roundness ?? 0,
    opacity: i.opacity ?? 1
  });
}
const J = {
  guideH: "item/guide/hline",
  guideV: "item/guide/vline",
  rect: "item/annotation/rect",
  xBand: "item/annotation/xband",
  yBand: "item/annotation/yband"
};
class qt extends Et {
  constructor() {
    super("item");
  }
}
const Nt = {
  kind: U.line,
  normalize(i, t) {
    const e = t.axisOffset.x ?? 0, s = t.axisOffset.y ?? 0, n = X(i.x, e), r = X(i.y, s), o = Math.min(n.length, r.length);
    return {
      x: n,
      y: r,
      count: o,
      capacity: Math.min(n.length, r.length),
      widthPx: i.widthPx ?? 1,
      offsetX: e,
      offsetY: s
    };
  },
  buildPrimitives({ data: i, style: t, out: e, scratch: s }) {
    const n = Math.min(i.count, i.x.length, i.y.length);
    if (n <= 0) return;
    const r = s.f32(n * 2);
    for (let o = 0; o < n; o++)
      r[o * 2] = i.x[o] ?? 0, r[o * 2 + 1] = i.y[o] ?? 0;
    e.push({
      kind: "path",
      points: r,
      count: n,
      widthPx: i.widthPx,
      join: "round",
      cap: "round",
      color: t.color,
      opacity: 1
    });
  },
  append(i, t, e) {
    if (!t || typeof t != "object") return !1;
    const s = t;
    if (s.x == null || s.y == null) return !1;
    const n = e.axisOffset.x ?? i.offsetX ?? 0, r = e.axisOffset.y ?? i.offsetY ?? 0;
    if (typeof s.x == "number" && typeof s.y == "number") {
      const o = i.count + 1;
      if (o > i.capacity) {
        const c = Math.max(i.capacity * 2, o, 16), a = new Float32Array(c), h = new Float32Array(c);
        a.set(i.x.subarray(0, i.count), 0), h.set(i.y.subarray(0, i.count), 0), i.x = a, i.y = h, i.capacity = c;
      }
      i.x[i.count] = s.x - n, i.y[i.count] = s.y - r, i.count = o, i.offsetX = n, i.offsetY = r;
    } else {
      const o = X(s.x, n), c = X(s.y, r);
      if (o.length !== c.length) return !1;
      const a = o.length, h = i.count + a;
      if (h > i.capacity) {
        const l = Math.max(i.capacity * 2, h, 16), f = new Float32Array(l), g = new Float32Array(l);
        f.set(i.x.subarray(0, i.count), 0), g.set(i.y.subarray(0, i.count), 0), i.x = f, i.y = g, i.capacity = l;
      }
      i.x.set(o, i.count), i.y.set(c, i.count), i.count = h, i.offsetX = n, i.offsetY = r;
    }
    if (typeof s.max == "number" && s.max > 0 && i.count > s.max) {
      const o = i.count - s.max;
      i.x.copyWithin(0, o, i.count), i.y.copyWithin(0, o, i.count), i.count = s.max;
    }
    return !0;
  },
  write(i, t, e) {
    if (!(t.x instanceof Float32Array) || !(t.y instanceof Float32Array))
      return !1;
    const s = Math.min(t.x.length, t.y.length);
    return i.x = t.x, i.y = t.y, i.count = s, i.capacity = s, i.widthPx = t.widthPx ?? i.widthPx, i.offsetX = e.axisOffset.x ?? i.offsetX ?? 0, i.offsetY = e.axisOffset.y ?? i.offsetY ?? 0, !0;
  },
  getDatum(i, t) {
    return mt(i, t);
  },
  hitTest({ seriesId: i, data: t, wx: e, wy: s, tolx: n, toly: r }) {
    const o = Math.min(t.count, t.x.length, t.y.length);
    return At(i, t.x, t.y, o, e, s, n, r);
  }
}, $t = {
  kind: U.step,
  normalize(i, t) {
    const e = t.axisOffset.x ?? 0, s = t.axisOffset.y ?? 0, n = X(i.x, e), r = X(i.y, s), o = Math.min(n.length, r.length);
    return {
      x: n,
      y: r,
      count: o,
      widthPx: i.widthPx ?? 1,
      align: i.align ?? "end",
      offsetX: e,
      offsetY: s
    };
  },
  buildPrimitives({ data: i, style: t, out: e, scratch: s }) {
    const n = Math.min(i.count, i.x.length, i.y.length);
    if (n < 2) return;
    const r = s.f32((n * 2 - 1) * 2), o = _t(i.x, i.y, n, i.align, r);
    o <= 0 || e.push({
      kind: "path",
      points: r.subarray(0, o),
      count: o / 2,
      widthPx: i.widthPx,
      join: "miter",
      cap: "butt",
      color: t.color,
      opacity: 1
    });
  },
  write(i, t, e) {
    if (!(t.x instanceof Float32Array) || !(t.y instanceof Float32Array))
      return !1;
    const s = Math.min(t.x.length, t.y.length);
    return i.x = t.x, i.y = t.y, i.count = s, i.widthPx = t.widthPx ?? i.widthPx, i.align = t.align ?? i.align, i.offsetX = e.axisOffset.x ?? i.offsetX ?? 0, i.offsetY = e.axisOffset.y ?? i.offsetY ?? 0, !0;
  },
  getDatum(i, t) {
    return mt(i, t);
  },
  hitTest({ seriesId: i, data: t, wx: e, wy: s, tolx: n, toly: r }) {
    const o = Math.min(t.count, t.x.length, t.y.length);
    return At(i, t.x, t.y, o, e, s, n, r);
  }
};
function Ht(i, t, e) {
  if (e <= 0) return;
  let s = 1 / 0, n = -1 / 0, r = 1 / 0, o = -1 / 0;
  for (let v = 0; v < e; v++) {
    const b = i[v] ?? 0, m = t[v] ?? 0;
    b < s && (s = b), b > n && (n = b), m < r && (r = m), m > o && (o = m);
  }
  if (!Number.isFinite(s) || !Number.isFinite(r)) return;
  const c = Math.max(1e-9, n - s), a = Math.max(1e-9, o - r), h = Math.min(256, Math.max(32, Math.floor(Math.sqrt(e / 4)))), l = h, f = h, g = l * f, x = new Uint32Array(g);
  for (let v = 0; v < e; v++) {
    const b = Math.min(
      l - 1,
      Math.max(0, Math.floor(((i[v] ?? 0) - s) / c * l))
    ), p = Math.min(
      f - 1,
      Math.max(0, Math.floor(((t[v] ?? 0) - r) / a * f))
    ) * l + b;
    x[p] = (x[p] ?? 0) + 1;
  }
  const u = new Uint32Array(g + 1);
  for (let v = 0; v < g; v++)
    u[v + 1] = (u[v] ?? 0) + (x[v] ?? 0);
  const y = new Uint32Array(e), k = x.slice();
  for (let v = 0; v < e; v++) {
    const b = Math.min(
      l - 1,
      Math.max(0, Math.floor(((i[v] ?? 0) - s) / c * l))
    ), p = Math.min(
      f - 1,
      Math.max(0, Math.floor(((t[v] ?? 0) - r) / a * f))
    ) * l + b, w = u[p] ?? 0, P = k[p] ?? 0, M = w + (P - 1);
    y[M] = v, k[p] = P - 1;
  }
  return { minX: s, minY: r, spanX: c, spanY: a, gx: l, gy: f, offsets: u, indices: y };
}
const Kt = {
  kind: U.scatter,
  normalize(i, t) {
    const e = t.axisOffset.x ?? 0, s = t.axisOffset.y ?? 0, n = X(i.x, e), r = X(i.y, s), o = Math.min(n.length, r.length);
    return {
      x: n,
      y: r,
      count: o,
      sizePx: i.sizePx ?? 4,
      shape: i.shape ?? "square",
      strokeWidthPx: i.strokeWidthPx ?? 1,
      grid: Ht(n, r, o),
      offsetX: e,
      offsetY: s
    };
  },
  buildPrimitives({ data: i, style: t, out: e, scratch: s }) {
    const n = Math.min(i.count, i.x.length, i.y.length), r = s.f32(n * 2);
    for (let c = 0; c < n; c++)
      r[c * 2] = i.x[c] ?? 0, r[c * 2 + 1] = i.y[c] ?? 0;
    const o = i.shape === "circle" ? 1 : i.shape === "round" ? 0.35 : 0;
    e.push({
      kind: "quad",
      mode: "marker",
      centers: r,
      count: n,
      sizePx: i.sizePx,
      fill: t.color,
      stroke: t.color,
      strokeWidthPx: i.strokeWidthPx,
      roundness: o,
      opacity: 1
    });
  },
  getDatum(i, t) {
    return mt(i, t);
  },
  hitTest({ seriesId: i, data: t, wx: e, wy: s, tolx: n, toly: r }) {
    const o = Math.min(t.count, t.x.length, t.y.length), c = t.grid;
    let a = -1, h = 1 / 0;
    if (c) {
      const l = e - n, f = e + n, g = s - r, x = s + r, u = Math.max(
        0,
        Math.min(
          c.gx - 1,
          Math.floor((l - c.minX) / c.spanX * c.gx)
        )
      ), y = Math.max(
        0,
        Math.min(
          c.gx - 1,
          Math.floor((f - c.minX) / c.spanX * c.gx)
        )
      ), k = Math.max(
        0,
        Math.min(
          c.gy - 1,
          Math.floor((g - c.minY) / c.spanY * c.gy)
        )
      ), v = Math.max(
        0,
        Math.min(
          c.gy - 1,
          Math.floor((x - c.minY) / c.spanY * c.gy)
        )
      );
      for (let b = k; b <= v; b++)
        for (let m = u; m <= y; m++) {
          const p = b * c.gx + m, w = c.offsets[p] ?? 0, P = c.offsets[p + 1] ?? w;
          for (let M = w; M < P; M++) {
            const S = c.indices[M] ?? 0;
            if (S >= o) continue;
            const T = e - (t.x[S] ?? 0);
            if (Math.abs(T) > n) continue;
            const _ = s - (t.y[S] ?? 0);
            if (Math.abs(_) > r) continue;
            const L = T * T + _ * _;
            L < h && (h = L, a = S);
          }
        }
    } else
      for (let l = 0; l < o; l++) {
        const f = e - (t.x[l] ?? 0);
        if (Math.abs(f) > n) continue;
        const g = s - (t.y[l] ?? 0);
        if (Math.abs(g) > r) continue;
        const x = f * f + g * g;
        x < h && (h = x, a = l);
      }
    return a < 0 ? null : {
      hit: { kind: "series-point", seriesId: i, index: a },
      dist2: h
    };
  }
}, Qt = {
  kind: U.bars,
  normalize(i, t) {
    const e = t.axisOffset.x ?? 0, s = t.axisOffset.y ?? 0, n = X(i.x, e), r = X(i.y, s);
    return { x: n, y: r, width: i.width ?? 1, offsetX: e, offsetY: s };
  },
  buildPrimitives({ data: i, style: t, out: e, scratch: s }) {
    const n = Math.min(i.x.length, i.y.length), r = s.f32(n * 4), o = -i.offsetY;
    for (let c = 0; c < n; c++) {
      const a = i.x[c] ?? 0, h = i.y[c] ?? 0;
      r[c * 4] = a - i.width * 0.5, r[c * 4 + 1] = o, r[c * 4 + 2] = i.width, r[c * 4 + 3] = h - o;
    }
    e.push({
      kind: "quad",
      mode: "rect",
      rects: r,
      count: n,
      fill: t.color,
      stroke: t.color,
      strokeWidthPx: 0,
      roundness: 0,
      opacity: 1
    });
  },
  hitTest({ seriesId: i, data: t, wx: e, wy: s, tolx: n, toly: r }) {
    const o = Math.min(t.x.length, t.y.length), c = t.width * 0.5, a = -t.offsetY;
    let h = -1, l = 1 / 0;
    for (let f = 0; f < o; f++) {
      const g = t.x[f] ?? 0, x = t.y[f] ?? 0, u = g - c, y = g + c, k = Math.min(a, x), v = Math.max(a, x);
      if (e < u - n || e > y + n || s < k - r || s > v + r) continue;
      const b = e - g, m = b * b;
      m < l && (l = m, h = f);
    }
    return h < 0 ? null : {
      hit: { kind: "series-point", seriesId: i, index: h },
      dist2: l
    };
  }
}, jt = {
  kind: U.band,
  normalize(i, t) {
    const e = t.axisOffset.x ?? 0, s = t.axisOffset.y ?? 0, n = X(i.x, e), r = X(i.y0, s), o = X(i.y1, s);
    return { x: n, y0: r, y1: o, opacity: i.opacity ?? 0.2, offsetX: e, offsetY: s };
  },
  buildPrimitives({ data: i, style: t, out: e, scratch: s }) {
    const n = Math.min(i.x.length, i.y0.length, i.y1.length);
    if (n < 2) return;
    const r = s.f32((n - 1) * 12);
    let o = 0;
    for (let c = 0; c < n - 1; c++) {
      const a = i.x[c], h = i.x[c + 1], l = i.y0[c], f = i.y0[c + 1], g = i.y1[c], x = i.y1[c + 1];
      r[o++] = a, r[o++] = l, r[o++] = a, r[o++] = g, r[o++] = h, r[o++] = x, r[o++] = a, r[o++] = l, r[o++] = h, r[o++] = x, r[o++] = h, r[o++] = f;
    }
    e.push({
      kind: "mesh",
      positions: r,
      count: (n - 1) * 6,
      fill: t.color,
      opacity: i.opacity
    });
  }
}, Jt = {
  kind: U.candles,
  normalize(i, t) {
    return {};
  },
  buildPrimitives() {
  }
}, Zt = {
  kind: J.guideH,
  normalize(i) {
    return {
      y: i.y,
      color: i.color ?? [0.7, 0.7, 0.7, 1],
      widthPx: i.widthPx ?? 1
    };
  },
  buildPrimitives({ data: i, out: t, scratch: e, view: s, axisOffset: n }) {
    const r = (n == null ? void 0 : n.x) ?? 0, o = (n == null ? void 0 : n.y) ?? 0;
    Ut(
      t,
      e,
      s.world.x.min - r,
      i.y - o,
      s.world.x.max - r,
      i.y - o,
      i.widthPx,
      i.color
    );
  }
}, te = {
  kind: J.guideV,
  normalize(i) {
    return {
      x: i.x,
      color: i.color ?? [0.7, 0.7, 0.7, 1],
      widthPx: i.widthPx ?? 1
    };
  },
  buildPrimitives({ data: i, out: t, scratch: e, view: s, axisOffset: n }) {
    const r = (n == null ? void 0 : n.x) ?? 0, o = (n == null ? void 0 : n.y) ?? 0;
    Ut(
      t,
      e,
      i.x - r,
      s.world.y.min - o,
      i.x - r,
      s.world.y.max - o,
      i.widthPx,
      i.color
    );
  }
}, ee = {
  kind: J.rect,
  normalize(i) {
    return {
      xMin: i.xMin,
      xMax: i.xMax,
      yMin: i.yMin,
      yMax: i.yMax,
      fill: i.fill ?? [0.2, 0.6, 1, 0.15],
      stroke: i.stroke ?? [0.2, 0.6, 1, 1],
      strokeWidthPx: i.strokeWidthPx ?? 2
    };
  },
  buildPrimitives({ data: i, out: t, scratch: e, axisOffset: s }) {
    const n = (s == null ? void 0 : s.x) ?? 0, r = (s == null ? void 0 : s.y) ?? 0;
    pt({
      out: t,
      scratch: e,
      x: i.xMin - n,
      y: i.yMin - r,
      width: i.xMax - i.xMin,
      height: i.yMax - i.yMin,
      fill: i.fill,
      stroke: i.stroke,
      strokeWidthPx: i.strokeWidthPx
    });
  },
  handles({ data: i }) {
    return [
      { handleId: 0, x: i.xMin, y: i.yMin, sizePx: 8 },
      { handleId: 1, x: i.xMax, y: i.yMin, sizePx: 8 },
      { handleId: 2, x: i.xMax, y: i.yMax, sizePx: 8 },
      { handleId: 3, x: i.xMin, y: i.yMax, sizePx: 8 }
    ];
  },
  applyEdit({ data: i, edit: t }) {
    if (t.kind !== "drag-handle") return i;
    let { xMin: e, xMax: s, yMin: n, yMax: r } = i;
    if (!Number.isFinite(t.now.x) || !Number.isFinite(t.now.y))
      return i;
    t.handleId === 0 ? (e = t.now.x, n = t.now.y) : t.handleId === 1 ? (s = t.now.x, n = t.now.y) : t.handleId === 2 ? (s = t.now.x, r = t.now.y) : t.handleId === 3 && (e = t.now.x, r = t.now.y);
    const o = Math.min(e, s), c = Math.max(e, s), a = Math.min(n, r), h = Math.max(n, r);
    return { ...i, xMin: o, xMax: c, yMin: a, yMax: h };
  },
  hitTest({ itemId: i, data: t, wx: e, wy: s }) {
    const n = Math.min(t.xMin, t.xMax), r = Math.max(t.xMin, t.xMax), o = Math.min(t.yMin, t.yMax), c = Math.max(t.yMin, t.yMax);
    return e >= n && e <= r && s >= o && s <= c ? { hit: { kind: "item", itemId: i }, dist2: 0 } : null;
  }
}, ie = {
  kind: J.xBand,
  normalize(i) {
    return {
      xMin: i.xMin,
      xMax: i.xMax,
      fill: i.fill ?? [0.2, 0.6, 1, 0.12],
      stroke: i.stroke ?? [0.2, 0.6, 1, 0.6],
      strokeWidthPx: i.strokeWidthPx ?? 1
    };
  },
  buildPrimitives({ data: i, out: t, scratch: e, view: s, axisOffset: n }) {
    const r = (n == null ? void 0 : n.x) ?? 0, o = (n == null ? void 0 : n.y) ?? 0;
    pt({
      out: t,
      scratch: e,
      x: i.xMin - r,
      y: s.world.y.min - o,
      width: i.xMax - i.xMin,
      height: s.world.y.max - s.world.y.min,
      fill: i.fill,
      stroke: i.stroke,
      strokeWidthPx: i.strokeWidthPx
    });
  }
}, se = {
  kind: J.yBand,
  normalize(i) {
    return {
      yMin: i.yMin,
      yMax: i.yMax,
      fill: i.fill ?? [0.2, 0.6, 1, 0.12],
      stroke: i.stroke ?? [0.2, 0.6, 1, 0.6],
      strokeWidthPx: i.strokeWidthPx ?? 1
    };
  },
  buildPrimitives({ data: i, out: t, scratch: e, view: s, axisOffset: n }) {
    const r = (n == null ? void 0 : n.x) ?? 0, o = (n == null ? void 0 : n.y) ?? 0;
    pt({
      out: t,
      scratch: e,
      x: s.world.x.min - r,
      y: i.yMin - o,
      width: s.world.x.max - s.world.x.min,
      height: i.yMax - i.yMin,
      fill: i.fill,
      stroke: i.stroke,
      strokeWidthPx: i.strokeWidthPx
    });
  }
}, ne = {
  gridSpacing: [80, 50],
  gridColor: [0.2, 0.2, 0.2, 0.6],
  crosshairColor: [0.7, 0.7, 0.7, 1],
  borderColor: [0.22, 0.24, 0.26, 1],
  background: [0.078, 0.082, 0.086, 1],
  axisMode: {},
  layout: {
    legend: { enabled: !1, position: "tr", interactive: !1 },
    margin: { top: 16, right: 16, bottom: 28, left: 42 },
    yAxis: { min: 26, size: "auto" },
    xAxis: { min: 20, size: "auto" }
  }
};
function bt(i, t) {
  if (!t) return i;
  const e = t.layout, s = e ? {
    ...i.layout,
    ...e,
    margin: { ...i.layout.margin, ...e.margin },
    legend: { ...i.layout.legend, ...e.legend },
    xAxis: { ...i.layout.xAxis, ...e.xAxis },
    yAxis: { ...i.layout.yAxis, ...e.yAxis }
  } : i.layout;
  return {
    ...i,
    ...t,
    axisMode: { ...i.axisMode, ...t.axisMode },
    layout: s
  };
}
class re {
  constructor(t) {
    d(this, "registry");
    d(this, "itemRegistry");
    d(this, "config");
    d(this, "resetWorld");
    d(this, "axisOffset");
    d(this, "series", []);
    d(this, "items", []);
    d(this, "itemSeq", 0);
    d(this, "paletteIndex", 0);
    this.registry = t.registry, this.itemRegistry = t.itemRegistry, this.config = bt(ne, t.config), this.resetWorld = {
      x: { ...t.initialWorld.x },
      y: { ...t.initialWorld.y }
    };
    const e = t.initialWorld.x, s = t.initialWorld.y, n = (e.min + e.max) * 0.5, r = (s.min + s.max) * 0.5;
    this.axisOffset = {
      x: Number.isFinite(n) ? n : 0,
      y: Number.isFinite(r) ? r : 0
    };
  }
  setConfig(t) {
    this.config = bt(this.config, t);
  }
  addSeries(t, e, s) {
    const n = this.registry.get(e.kind), r = this.series.length, o = n.normalize(e, { axisOffset: this.axisOffset }), c = (s == null ? void 0 : s.color) ?? this.nextPaletteColor();
    return this.series.push({
      id: r,
      name: t,
      kind: e.kind,
      data: o,
      style: { color: c, visible: !0, showInLegend: !0 },
      change: Mt(),
      cache: {}
    }), r;
  }
  append(t, e) {
    const s = this.series[t];
    if (!s) return !1;
    const n = this.registry.get(s.kind);
    if (!n.append) return !1;
    const r = n.append(s.data, e, { axisOffset: this.axisOffset });
    return r && Z(s.change), r;
  }
  setSeriesData(t, e) {
    const s = this.series[t];
    if (!s || e.kind !== s.kind) return !1;
    const n = this.registry.get(s.kind);
    return s.data = n.normalize(e, { axisOffset: this.axisOffset }), Z(s.change), !0;
  }
  writeSeriesData(t, e) {
    const s = this.series[t];
    if (!s || e.kind !== s.kind) return !1;
    const n = this.registry.get(s.kind);
    if (!n.write) return !1;
    const r = n.write(s.data, e, { axisOffset: this.axisOffset });
    return r && Z(s.change), r;
  }
  setSeriesVisible(t, e) {
    const s = this.series[t];
    s && (s.style.visible = e, Z(s.change));
  }
  listSeries() {
    const t = [];
    for (const e of this.series)
      e && t.push({
        id: e.id,
        name: e.name,
        kind: e.kind,
        color: e.style.color,
        visible: e.style.visible,
        showInLegend: e.style.showInLegend
      });
    return t;
  }
  getSeries(t) {
    return this.series[t] ?? null;
  }
  getDatum(t, e) {
    var n, r;
    const s = this.series[t];
    return s ? ((r = (n = this.registry.get(s.kind)).getDatum) == null ? void 0 : r.call(n, s.data, e)) ?? null : null;
  }
  addItem(t, e = {}) {
    const s = this.itemRegistry.get(t.kind), n = this.itemSeq++, r = s.normalize(t);
    return this.items[n] = {
      id: n,
      kind: t.kind,
      data: r,
      style: e,
      visible: !0,
      change: Mt(),
      cache: {}
    }, n;
  }
  updateItem(t, e) {
    const s = this.items[t];
    return s ? (e.data !== void 0 && (s.data = e.data), e.style !== void 0 && (s.style = e.style), e.visible !== void 0 && (s.visible = e.visible), Z(s.change), !0) : !1;
  }
  removeItem(t) {
    return this.items[t] ? (this.items[t] = null, !0) : !1;
  }
  listItems() {
    const t = [];
    for (const e of this.items) e && t.push(e);
    return t;
  }
  getItem(t) {
    return this.items[t] ?? null;
  }
  hitTest(t, e, s, n, r) {
    const o = (r == null ? void 0 : r.includeScatter) !== !1;
    let c = null;
    const a = t - this.axisOffset.x, h = e - this.axisOffset.y;
    for (const l of this.items) {
      if (!l || !l.visible) continue;
      const f = this.itemRegistry.get(l.kind);
      if (!f.hitTest) continue;
      const g = f.hitTest({
        itemId: l.id,
        data: l.data,
        wx: t,
        wy: e,
        tolx: s,
        toly: n
      });
      g && (!c || g.dist2 < c.dist2) && (c = g);
    }
    for (const l of this.series) {
      if (!l || !l.style.visible || !o && l.kind === U.scatter) continue;
      const f = this.registry.get(l.kind);
      if (!f.hitTest) continue;
      const g = f.hitTest({
        seriesId: l.id,
        data: l.data,
        wx: a,
        wy: h,
        tolx: s,
        toly: n
      });
      g && (!c || g.dist2 < c.dist2) && (c = g);
    }
    return c;
  }
  nextPaletteColor() {
    const t = [
      [0.16, 0.63, 0.98, 1],
      [0.97, 0.38, 0.33, 1],
      [0.12, 0.78, 0.42, 1],
      [0.98, 0.76, 0.18, 1],
      [0.58, 0.38, 0.98, 1],
      [0.16, 0.82, 0.82, 1],
      [0.98, 0.55, 0.18, 1],
      [0.8, 0.08, 0.64, 1]
    ], e = t[this.paletteIndex++ % t.length] ?? t[0] ?? [0.2, 0.6, 1, 1];
    return [e[0], e[1], e[2], e[3]];
  }
}
const H = 1e3, K = 60 * H, j = 60 * K, Y = 24 * j, at = [
  { unit: "ms", step: 1, ms: 1 },
  { unit: "ms", step: 2, ms: 2 },
  { unit: "ms", step: 5, ms: 5 },
  { unit: "ms", step: 10, ms: 10 },
  { unit: "ms", step: 20, ms: 20 },
  { unit: "ms", step: 50, ms: 50 },
  { unit: "ms", step: 100, ms: 100 },
  { unit: "ms", step: 200, ms: 200 },
  { unit: "ms", step: 500, ms: 500 },
  { unit: "s", step: 1, ms: H },
  { unit: "s", step: 2, ms: 2 * H },
  { unit: "s", step: 5, ms: 5 * H },
  { unit: "s", step: 10, ms: 10 * H },
  { unit: "s", step: 15, ms: 15 * H },
  { unit: "s", step: 30, ms: 30 * H },
  { unit: "m", step: 1, ms: K },
  { unit: "m", step: 2, ms: 2 * K },
  { unit: "m", step: 5, ms: 5 * K },
  { unit: "m", step: 10, ms: 10 * K },
  { unit: "m", step: 15, ms: 15 * K },
  { unit: "m", step: 30, ms: 30 * K },
  { unit: "h", step: 1, ms: j },
  { unit: "h", step: 2, ms: 2 * j },
  { unit: "h", step: 3, ms: 3 * j },
  { unit: "h", step: 6, ms: 6 * j },
  { unit: "h", step: 12, ms: 12 * j },
  { unit: "d", step: 1, ms: Y },
  { unit: "d", step: 2, ms: 2 * Y },
  { unit: "d", step: 7, ms: 7 * Y },
  { unit: "d", step: 14, ms: 14 * Y },
  { unit: "mo", step: 1, ms: 30 * Y },
  { unit: "mo", step: 3, ms: 90 * Y },
  { unit: "mo", step: 6, ms: 180 * Y },
  { unit: "y", step: 1, ms: 365 * Y },
  { unit: "y", step: 2, ms: 730 * Y },
  { unit: "y", step: 5, ms: 1825 * Y },
  { unit: "y", step: 10, ms: 3650 * Y }
], Pt = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];
function oe(i) {
  return {
    mode: (i == null ? void 0 : i.mode) ?? "numeric",
    scale: (i == null ? void 0 : i.scale) ?? "linear",
    offset: i == null ? void 0 : i.offset,
    timezone: (i == null ? void 0 : i.timezone) ?? "local",
    formatter: i == null ? void 0 : i.formatter
  };
}
function ce(i) {
  for (const t of at)
    if (i <= t.ms) return t;
  return at[at.length - 1];
}
function C(i, t, e) {
  if (t === "utc")
    switch (e) {
      case "fullYear":
        return i.getUTCFullYear();
      case "month":
        return i.getUTCMonth();
      case "date":
        return i.getUTCDate();
      case "hours":
        return i.getUTCHours();
      case "minutes":
        return i.getUTCMinutes();
      case "seconds":
        return i.getUTCSeconds();
      case "ms":
        return i.getUTCMilliseconds();
    }
  switch (e) {
    case "fullYear":
      return i.getFullYear();
    case "month":
      return i.getMonth();
    case "date":
      return i.getDate();
    case "hours":
      return i.getHours();
    case "minutes":
      return i.getMinutes();
    case "seconds":
      return i.getSeconds();
    case "ms":
      return i.getMilliseconds();
  }
}
function B(i, t, e, s) {
  if (t === "utc")
    switch (e) {
      case "fullYear":
        i.setUTCFullYear(s);
        return;
      case "month":
        i.setUTCMonth(s);
        return;
      case "date":
        i.setUTCDate(s);
        return;
      case "hours":
        i.setUTCHours(s);
        return;
      case "minutes":
        i.setUTCMinutes(s);
        return;
      case "seconds":
        i.setUTCSeconds(s);
        return;
      case "ms":
        i.setUTCMilliseconds(s);
        return;
    }
  switch (e) {
    case "fullYear":
      i.setFullYear(s);
      return;
    case "month":
      i.setMonth(s);
      return;
    case "date":
      i.setDate(s);
      return;
    case "hours":
      i.setHours(s);
      return;
    case "minutes":
      i.setMinutes(s);
      return;
    case "seconds":
      i.setSeconds(s);
      return;
    case "ms":
      i.setMilliseconds(s);
      return;
  }
}
function ae(i, t, e) {
  if (t.unit === "ms")
    return Math.floor(i / t.ms) * t.ms;
  const s = new Date(i);
  if (t.unit === "s") {
    const r = C(s, e, "seconds");
    return B(s, e, "seconds", r - r % t.step), B(s, e, "ms", 0), s.getTime();
  }
  if (t.unit === "m") {
    const r = C(s, e, "minutes");
    return B(s, e, "minutes", r - r % t.step), B(s, e, "seconds", 0), B(s, e, "ms", 0), s.getTime();
  }
  if (t.unit === "h") {
    const r = C(s, e, "hours");
    return B(s, e, "hours", r - r % t.step), B(s, e, "minutes", 0), B(s, e, "seconds", 0), B(s, e, "ms", 0), s.getTime();
  }
  if (t.unit === "d") {
    const r = C(s, e, "date");
    return B(s, e, "date", r - (r - 1) % t.step), B(s, e, "hours", 0), B(s, e, "minutes", 0), B(s, e, "seconds", 0), B(s, e, "ms", 0), s.getTime();
  }
  if (t.unit === "mo") {
    const r = C(s, e, "month");
    return B(s, e, "month", r - r % t.step), B(s, e, "date", 1), B(s, e, "hours", 0), B(s, e, "minutes", 0), B(s, e, "seconds", 0), B(s, e, "ms", 0), s.getTime();
  }
  const n = C(s, e, "fullYear");
  return B(s, e, "fullYear", n - n % t.step), B(s, e, "month", 0), B(s, e, "date", 1), B(s, e, "hours", 0), B(s, e, "minutes", 0), B(s, e, "seconds", 0), B(s, e, "ms", 0), s.getTime();
}
function le(i, t, e) {
  if (t.unit === "ms" || t.unit === "s" || t.unit === "m" || t.unit === "h")
    return i + t.ms;
  const s = new Date(i);
  if (t.unit === "d") {
    const r = C(s, e, "date");
    return B(s, e, "date", r + t.step), s.getTime();
  }
  if (t.unit === "mo") {
    const r = C(s, e, "month");
    return B(s, e, "month", r + t.step), s.getTime();
  }
  const n = C(s, e, "fullYear");
  return B(s, e, "fullYear", n + t.step), s.getTime();
}
function he(i, t, e) {
  switch (t.unit) {
    case "ms":
    case "s":
    case "m":
    case "h":
      return Math.round(i / t.ms);
    case "d": {
      const s = new Date(i), n = C(s, e, "fullYear"), r = C(s, e, "month"), o = C(s, e, "date"), c = e === "utc" ? Date.UTC(n, r, o) : new Date(n, r, o).getTime(), a = Math.floor(c / Y);
      return Math.floor(a / t.step);
    }
    case "mo": {
      const s = new Date(i), n = C(s, e, "fullYear"), r = C(s, e, "month"), o = n * 12 + r;
      return Math.floor(o / t.step);
    }
    case "y": {
      const s = new Date(i), n = C(s, e, "fullYear");
      return Math.floor(n / t.step);
    }
  }
  return Math.round(i / t.ms);
}
function G(i) {
  return i < 10 ? `0${i}` : `${i}`;
}
function Lt(i) {
  return i < 10 ? `00${i}` : i < 100 ? `0${i}` : `${i}`;
}
function ue(i, t, e, s) {
  const n = new Date(i), r = C(n, e, "fullYear"), o = C(n, e, "month"), c = C(n, e, "date"), a = C(n, e, "hours"), h = C(n, e, "minutes"), l = C(n, e, "seconds"), f = C(n, e, "ms"), g = `${Pt[o]} ${c}`;
  if (t.unit === "y") return `${r}`;
  if (t.unit === "mo") return `${Pt[o]} ${r}`;
  if (t.unit === "d") return g;
  const x = t.unit === "s" ? `${G(a)}:${G(h)}:${G(l)}` : t.unit === "m" || t.unit === "h" ? `${G(a)}:${G(h)}` : `${G(a)}:${G(h)}:${G(l)}.${Lt(f)}`;
  return s && a === 0 && h === 0 && l === 0 && f === 0 ? g : x;
}
function fe(i, t, e) {
  const s = new Date(i), n = C(s, e, "fullYear"), r = C(s, e, "month") + 1, o = C(s, e, "date"), c = C(s, e, "hours"), a = C(s, e, "minutes"), h = C(s, e, "seconds"), l = C(s, e, "ms"), f = t < H, g = t < K, x = t < Y, u = `${n}-${G(r)}-${G(o)}`;
  if (!x) return u;
  const y = g ? `${G(c)}:${G(a)}:${G(h)}${f ? `.${Lt(l)}` : ""}` : `${G(c)}:${G(a)}`;
  return `${u} ${y}`;
}
function de(i) {
  if (i <= 0 || !Number.isFinite(i)) return 1;
  const t = Math.pow(10, Math.floor(Math.log10(i))), e = i / t;
  return e <= 1 ? 1 * t : e <= 2 ? 2 * t : e <= 5 ? 5 * t : 10 * t;
}
function me(i, t) {
  if (!Number.isFinite(i)) return "0";
  const e = Math.abs(t);
  if (e > 0 && Math.abs(i) < e * 0.5 && (i = 0), i === 0) return "0";
  const s = Math.abs(i), n = Math.max(0, -Math.floor(Math.log10(e || 1)) + 1);
  if (s >= 1e6 || s < 1e-4)
    return i.toExponential(4);
  let r = i.toFixed(Math.min(6, n));
  return r.includes(".") && (r = r.replace(/\.?0+$/, "")), r;
}
function ot(i) {
  const { range: t, pixelSpan: e, spacingPx: s, spec: n, labels: r } = i;
  if (n.mode === "time") {
    const f = n.offset ?? 0, g = n.timezone ?? "local", x = t.min + f, u = t.max + f, y = u - x, k = Math.max(2, Math.floor(e / s)), v = ce(y / k), b = [];
    if (!Number.isFinite(y) || y <= 0) return { step: v.ms, ticks: b };
    const m = y >= Y || Math.floor(x / Y) !== Math.floor(u / Y);
    let p = ae(x, v, g);
    const w = u + v.ms * 0.5;
    for (let P = 0; p <= w; P++) {
      const S = {
        value: p - f,
        major: P % 5 === 0,
        index: he(p, v, g)
      };
      r && (S.label = ue(p, v, g, m)), b.push(S), p = le(p, v, g);
    }
    return { step: v.ms, ticks: b };
  }
  const o = t.max - t.min, c = Math.max(2, Math.floor(e / s)), a = de(o / c), h = Math.ceil(t.min / a) * a, l = [];
  if (!Number.isFinite(a) || a === 0) return { step: 0, ticks: [] };
  for (let f = h, g = 0; f <= t.max + a * 0.5; f += a, g++) {
    const x = Math.round(f / a), u = { value: f, major: g % 5 === 0, index: x };
    r && (u.label = et({ axis: i.axis, value: f, step: a, spec: n })), l.push(u);
  }
  return { step: a, ticks: l };
}
function et(i) {
  const { axis: t, value: e, step: s, spec: n } = i;
  if (n.formatter)
    return n.formatter({
      axis: t,
      value: e,
      step: s,
      mode: n.mode,
      scale: n.scale
    });
  if (n.mode === "time") {
    const r = n.timezone ?? "local", o = n.offset ?? 0;
    return fe(e + o, s || H, r);
  }
  return me(e, s);
}
function ht(i, t) {
  var n, r;
  const e = t === "x" ? (n = i.config.axisMode) == null ? void 0 : n.x : (r = i.config.axisMode) == null ? void 0 : r.y, s = (e == null ? void 0 : e.formatter) ?? (i.config.tickFormatter ? (o) => i.config.tickFormatter(o.value, o.step, o.axis) : void 0);
  return oe({ ...e, formatter: s });
}
function Dt(i, t) {
  const e = ht(i, "x"), s = ht(i, "y"), n = ot({
    axis: "x",
    range: t.world.x,
    pixelSpan: t.plot.size.width,
    spacingPx: i.config.gridSpacing[0],
    spec: e,
    labels: !1
  }).step || 1, r = ot({
    axis: "y",
    range: t.world.y,
    pixelSpan: t.plot.size.height,
    spacingPx: i.config.gridSpacing[1],
    spec: s,
    labels: !1
  }).step || 1;
  return { xSpec: e, ySpec: s, xStep: n, yStep: r };
}
function St(i, t) {
  return {
    x: et({
      axis: "x",
      value: t.x,
      step: i.xStep,
      spec: i.xSpec
    }),
    y: et({
      axis: "y",
      value: t.y,
      step: i.yStep,
      spec: i.ySpec
    })
  };
}
function pe(i, t) {
  const { x: e, y: s, start: n, count: r } = t;
  if (r <= 0) return i;
  const o = n + r, c = i.levels[0];
  if (!c || n < c.count) return i;
  const a = Math.min(e.length, s.length);
  if (o > a) return i;
  if (o > c.minIdx.length) {
    const x = Math.max(c.minIdx.length * 2, o, a), u = new Uint32Array(x), y = new Uint32Array(x);
    c.count > 0 && (u.set(c.minIdx.subarray(0, c.count), 0), y.set(c.maxIdx.subarray(0, c.count), 0)), c.minIdx = u, c.maxIdx = y;
  }
  for (let x = 0; x < r; x++) {
    const u = n + x;
    c.minIdx[u] = u, c.maxIdx[u] = u;
  }
  const h = c.count;
  c.count = o;
  let l = c, f = h, g = 1;
  for (; l.count > 1; ) {
    const x = l.stride * 2, u = Math.ceil(l.count / 2);
    let y = i.levels[g];
    const k = (y == null ? void 0 : y.count) ?? Math.ceil(f / 2), v = Math.max(0, Math.floor((f - 1) / 2)), b = Math.ceil(a / x);
    if (!y)
      y = {
        stride: x,
        minIdx: new Uint32Array(Math.max(16, b)),
        maxIdx: new Uint32Array(Math.max(16, b)),
        count: 0
      }, i.levels[g] = y;
    else if (y.minIdx.length < b) {
      const m = Math.max(y.minIdx.length * 2, b), p = new Uint32Array(m), w = new Uint32Array(m);
      y.count > 0 && (p.set(y.minIdx.subarray(0, y.count), 0), w.set(y.maxIdx.subarray(0, y.count), 0)), y.minIdx = p, y.maxIdx = w;
    }
    for (let m = v; m < u; m++) {
      const p = m * 2, w = p + 1, P = l.minIdx[p] ?? 0, M = l.maxIdx[p] ?? 0, S = w < l.count ? l.minIdx[w] ?? P : P, T = w < l.count ? l.maxIdx[w] ?? M : M, _ = (s[P] ?? 0) <= (s[S] ?? 0) ? P : S, L = (s[M] ?? 0) >= (s[T] ?? 0) ? M : T;
      y.minIdx[m] = _, y.maxIdx[m] = L;
    }
    y.stride = x, y.count = u, f = k, l = y, g += 1;
  }
  return i.sourceCount = o, i;
}
function it(i) {
  const { x: t, y: e, count: s, revision: n } = i, r = Math.min(s, t.length, e.length), o = Math.min(t.length, e.length), c = [], a = new Uint32Array(o), h = new Uint32Array(o);
  for (let f = 0; f < r; f++)
    a[f] = f, h[f] = f;
  c.push({ stride: 1, minIdx: a, maxIdx: h, count: r });
  let l = c[0];
  for (; l.count > 1; ) {
    const f = Math.ceil(l.count / 2), g = Math.ceil(o / (l.stride * 2)), x = new Uint32Array(g), u = new Uint32Array(g);
    for (let k = 0; k < f; k++) {
      const v = k * 2, b = v + 1, m = l.minIdx[v] ?? 0, p = l.maxIdx[v] ?? 0, w = b < l.count ? l.minIdx[b] ?? m : m, P = b < l.count ? l.maxIdx[b] ?? p : p, M = (e[m] ?? 0) <= (e[w] ?? 0) ? m : w, S = (e[p] ?? 0) >= (e[P] ?? 0) ? p : P;
      x[k] = M, u[k] = S;
    }
    const y = {
      stride: l.stride * 2,
      minIdx: x,
      maxIdx: u,
      count: f
    };
    c.push(y), l = y;
  }
  return { levels: c, sourceCount: r, revision: n, x0: t[0] ?? 0 };
}
var ut = /* @__PURE__ */ ((i) => (i.TopLeft = "top-left", i.Center = "center", i))(ut || {});
const xt = 1024, xe = 1e6, ye = 2e6, ge = 3e6;
function Tt(i, t) {
  return xe + i * xt + t;
}
function It(i, t) {
  return ye + i * xt + t;
}
function ve(i, t) {
  return ge + i * xt + t;
}
class we {
  constructor() {
    d(this, "f32buf", new Float32Array(1024));
    d(this, "f32off", 0);
  }
  reset() {
    this.f32off = 0;
  }
  f32(t) {
    this.f32off + t > this.f32buf.length && (this.f32buf = new Float32Array(
      Math.max(this.f32buf.length * 2, this.f32off + t, 1024)
    ));
    const e = this.f32buf.subarray(this.f32off, this.f32off + t);
    return this.f32off += t, e;
  }
}
function ke(i, t, e, s, n) {
  if (t <= 0) return null;
  const r = e.world.x.min - n, o = e.world.x.max - n;
  let c = ft(i, r, t) - s, a = dt(i, o, t) + s;
  return c < 0 && (c = 0), a > t - 1 && (a = t - 1), a < c ? null : { start: c, count: a - c + 1 };
}
function Me(i, t, e, s, n, r, o, c, a, h) {
  const l = t.plot;
  if (l.size.width <= 0 || l.size.height <= 0) return;
  const f = (a == null ? void 0 : a.x) ?? 0, g = (a == null ? void 0 : a.y) ?? 0, x = h == null ? void 0 : h.xSpec, u = h == null ? void 0 : h.ySpec;
  if (!x || !u) return;
  const y = ot({
    axis: "x",
    range: t.world.x,
    pixelSpan: l.size.width,
    spacingPx: i.gridSpacing[0],
    spec: x,
    labels: !0
  }), k = ot({
    axis: "y",
    range: t.world.y,
    pixelSpan: l.size.height,
    spacingPx: i.gridSpacing[1],
    spec: u,
    labels: !0
  }), v = [0.82, 0.84, 0.88, 1], b = 6, m = c == null ? void 0 : c.x, p = c == null ? void 0 : c.y, w = (I) => o ? o({ text: I }) : { width: I.length * 6, height: 12 }, P = (() => {
    let I = 0, R = 0;
    for (const D of y.ticks) {
      if (!D.label) continue;
      const W = w(D.label);
      I = Math.max(I, W.width), R = Math.max(R, W.height);
    }
    return { maxWidth: I, maxHeight: R };
  })(), M = (() => {
    let I = 0, R = 0;
    for (const D of k.ticks) {
      if (!D.label) continue;
      const W = w(D.label);
      I = Math.max(I, W.width), R = Math.max(R, W.height);
    }
    return { maxWidth: I, maxHeight: R };
  })();
  m && (m.maxWidth = Math.max(m.maxWidth, P.maxWidth), m.maxHeight = Math.max(m.maxHeight, P.maxHeight)), p && (p.maxWidth = Math.max(p.maxWidth, M.maxWidth), p.maxHeight = Math.max(p.maxHeight, M.maxHeight));
  const S = t.world.x.max - t.world.x.min, T = t.world.y.max - t.world.y.min, _ = S > 0 ? l.size.width / S * y.step : Number.POSITIVE_INFINITY, L = T > 0 ? l.size.height / T * k.step : Number.POSITIVE_INFINITY, N = Math.max(i.gridSpacing[0], P.maxWidth + b), z = Math.max(i.gridSpacing[1], M.maxHeight + b), Q = Math.max(1, Math.ceil(N / Math.max(_, 1))), $ = Math.max(1, Math.ceil(z / Math.max(L, 1))), O = (I, R) => (I % R + R) % R;
  for (const I of y.ticks) {
    const R = I.value - f, D = t.world.y.min - g, W = t.world.y.max - g, E = r.f32(4);
    if (E[0] = R, E[1] = D, E[2] = R, E[3] = W, s.push({
      kind: "path",
      points: E,
      count: 2,
      widthPx: 0.5,
      join: "miter",
      cap: "butt",
      color: i.gridColor,
      opacity: 1
    }), I.label) {
      if (Q > 1 && O(I.index ?? 0, Q) !== 0)
        continue;
      const V = w(I.label), A = wt(e, I.value, t.world.y.min);
      if (A.x < l.origin.x || A.x > l.origin.x + l.size.width)
        continue;
      const F = A.x - V.width * 0.5;
      n.push({
        x: F,
        y: l.origin.y + l.size.height + 6,
        text: I.label,
        color: v,
        align: "top-left"
        /* TopLeft */
      });
    }
  }
  for (const I of k.ticks) {
    const R = I.value - g, D = t.world.x.min - f, W = t.world.x.max - f, E = r.f32(4);
    if (E[0] = D, E[1] = R, E[2] = W, E[3] = R, s.push({
      kind: "path",
      points: E,
      count: 2,
      widthPx: 0.5,
      join: "miter",
      cap: "butt",
      color: i.gridColor,
      opacity: 1
    }), I.label) {
      if ($ > 1 && O(I.index ?? 0, $) !== 0)
        continue;
      const V = w(I.label), A = wt(e, t.world.x.min, I.value);
      if (A.y < l.origin.y || A.y > l.origin.y + l.size.height)
        continue;
      const F = A.y - V.height * 0.5;
      n.push({
        x: l.origin.x - 8 - V.width,
        y: F,
        text: I.label,
        color: v,
        align: "top-left"
        /* TopLeft */
      });
    }
  }
}
const lt = 4096, Bt = 2;
function be(i, t, e) {
  const s = Math.max(0, Math.min(1, (e - i) / (t - i)));
  return s * s * (3 - 2 * s);
}
function st(i) {
  const {
    x: t,
    y: e,
    total: s,
    drawRange: n,
    level: r,
    resourceKey: o,
    revision: c,
    bufferBytes: a,
    widthPx: h,
    color: l,
    opacity: f,
    join: g,
    cap: x,
    scratch: u
  } = i, y = r.stride, k = Math.max(0, Math.floor(n.start / y)), v = Math.min(
    r.count - 1,
    Math.floor((n.start + n.count - 1) / y)
  );
  if (v < k) return null;
  const b = v - k + 1, m = u.f32(b * 8);
  let p = 0, w = -1;
  const P = (M) => {
    M < 0 || M >= s || M !== w && (m[p++] = t[M] ?? 0, m[p++] = e[M] ?? 0, w = M);
  };
  for (let M = k; M <= v; M++) {
    const S = M * y, T = Math.min(S + y - 1, s - 1);
    let _ = r.minIdx[M] ?? S, L = r.maxIdx[M] ?? S;
    if ((_ < S || _ > T) && (_ = S), (L < S || L > T) && (L = T), _ > L) {
      const N = _;
      _ = L, L = N;
    }
    P(S), P(_), P(L), P(T);
  }
  return p < 4 ? null : {
    kind: "path",
    points: m.subarray(0, p),
    count: p / 2,
    resourceKey: o,
    revision: c,
    bufferBytes: a,
    dynamic: !0,
    widthPx: h,
    join: g,
    cap: x,
    color: l,
    opacity: f
  };
}
function Ct(i, t) {
  return [
    Math.min(1, i[0] + t),
    Math.min(1, i[1] + t),
    Math.min(1, i[2] + t),
    i[3]
  ];
}
function Pe(i, t) {
  if (t < 0) return null;
  if (i.kind === U.line || i.kind === U.step) {
    const e = i.data;
    return t >= e.count ? null : { x: e.x[t] ?? 0, y: e.y[t] ?? 0, sizePx: 6 };
  }
  if (i.kind === U.scatter) {
    const e = i.data;
    return t >= e.count ? null : {
      x: e.x[t] ?? 0,
      y: e.y[t] ?? 0,
      sizePx: Math.max(6, e.sizePx * 1.4)
    };
  }
  return null;
}
function Se(i) {
  var l, f, g;
  const { item: t, handles: e, out: s, scratch: n, pickTable: r } = i;
  if (!e.length) return;
  const o = ((l = i.axisOffset) == null ? void 0 : l.x) ?? 0, c = ((f = i.axisOffset) == null ? void 0 : f.y) ?? 0, a = n.f32(e.length * 2), h = r.length;
  for (let x = 0; x < e.length; x++) {
    const u = e[x];
    a[x * 2] = u.x - o, a[x * 2 + 1] = u.y - c, r.push({
      kind: "item-handle",
      itemId: t.id,
      handleId: u.handleId
    });
  }
  s.push({
    kind: "quad",
    mode: "marker",
    centers: a,
    count: e.length,
    sizePx: ((g = e[0]) == null ? void 0 : g.sizePx) ?? 8,
    fill: [0.6, 1, 0.6, 1],
    stroke: [0.6, 1, 0.6, 1],
    strokeWidthPx: 0,
    roundness: 0,
    opacity: 1,
    pick: { idBase: h, perInstance: !0 }
  });
}
function Te(i, t, e, s, n, r, o) {
  const c = i.model.config, a = (r == null ? void 0 : r.x) ?? 0, h = (r == null ? void 0 : r.y) ?? 0;
  if (i.crosshair.enabled) {
    const f = i.view.plot, g = i.screenToWorld(
      i.crosshair.sx,
      i.crosshair.sy
    ), x = o == null ? void 0 : o.xSpec, u = o == null ? void 0 : o.ySpec;
    if (x && u) {
      const y = (o == null ? void 0 : o.xStep) ?? 1, k = (o == null ? void 0 : o.yStep) ?? 1, v = et({
        axis: "x",
        value: g.x,
        step: y,
        spec: x
      }), b = et({
        axis: "y",
        value: g.y,
        step: k,
        spec: u
      }), m = [0.86, 0.88, 0.92, 1], p = v.length * 6;
      let w = i.crosshair.sx + 6;
      w + p > f.origin.x + f.size.width - 2 && (w = f.origin.x + f.size.width - p - 2), w < f.origin.x + 2 && (w = f.origin.x + 2);
      const P = f.origin.y + f.size.height - 16;
      e.push({
        x: w,
        y: P,
        text: v,
        color: m,
        align: "top-left"
        /* TopLeft */
      });
      let M = i.crosshair.sy - 6;
      const S = i.crosshair.sy - 14, T = i.crosshair.sy + 10;
      S >= f.origin.y + 2 ? M = S : M = T, M < f.origin.y + 2 && (M = f.origin.y + 2), M > f.origin.y + f.size.height - 12 && (M = f.origin.y + f.size.height - 12), e.push({
        x: f.origin.x + 4,
        y: M,
        text: b,
        color: m,
        align: "top-left"
        /* TopLeft */
      });
    }
  }
  if (i.selection) {
    const { start: f, current: g } = i.selection, x = Math.min(f[0], g[0]), u = Math.max(f[0], g[0]), y = Math.min(f[1], g[1]), k = Math.max(f[1], g[1]), v = s.f32(4);
    v[0] = x - a, v[1] = y - h, v[2] = u - x, v[3] = k - y, t.push({
      kind: "quad",
      mode: "rect",
      rects: v,
      count: 1,
      fill: [
        c.crosshairColor[0],
        c.crosshairColor[1],
        c.crosshairColor[2],
        c.crosshairColor[3] * 0.15
      ],
      stroke: c.crosshairColor,
      strokeWidthPx: 0.6,
      roundness: 0,
      opacity: 1
    });
  }
  const l = i.hover;
  if (l && (l.kind === "item" || l.kind === "item-handle")) {
    const f = i.model.getItem(l.itemId);
    if (!f) return;
    const g = i.model.itemRegistry.get(f.kind);
    if (!g.handles) return;
    const x = g.handles({ itemId: f.id, data: f.data });
    Se({
      item: f,
      handles: x,
      out: t,
      scratch: s,
      pickTable: n,
      axisOffset: { x: a, y: h }
    });
  }
  if (l && l.kind === "series-point") {
    const f = i.model.getSeries(l.seriesId);
    if (!f) return;
    if (f.kind === U.bars) {
      const x = f.data, u = l.index;
      if (u >= 0 && u < x.x.length && u < x.y.length) {
        const y = s.f32(4), k = x.x[u] ?? 0, v = x.y[u] ?? 0, b = -x.offsetY;
        y[0] = k - x.width * 0.5, y[1] = b, y[2] = x.width, y[3] = v - b;
        const m = Ct(f.style.color, 0.18);
        t.push({
          kind: "quad",
          mode: "rect",
          rects: y,
          count: 1,
          fill: m,
          stroke: m,
          strokeWidthPx: 1,
          roundness: 0,
          opacity: 0.9
        });
      }
    }
    const g = Pe(f, l.index);
    if (g) {
      const x = s.f32(2);
      x[0] = g.x, x[1] = g.y;
      const u = Ct(f.style.color, 0.25);
      t.push({
        kind: "quad",
        mode: "marker",
        centers: x,
        count: 1,
        sizePx: g.sizePx,
        fill: u,
        stroke: u,
        strokeWidthPx: 0,
        roundness: 0,
        opacity: 1
      });
    }
  }
}
class Ie {
  constructor() {
    d(this, "scratch", new we());
    d(this, "persistentScratch", {
      f32: (t) => new Float32Array(t)
    });
    d(this, "grid", []);
    d(this, "series", []);
    d(this, "items", []);
    d(this, "overlays", []);
    d(this, "text", []);
    d(this, "pickTable", []);
  }
  build(t) {
    const { model: e, engine: s } = t;
    this.scratch.reset(), this.grid.length = 0, this.series.length = 0, this.items.length = 0, this.overlays.length = 0, this.text.length = 0, this.pickTable.length = 1, this.pickTable[0] = null;
    const n = {
      x: { maxWidth: 0, maxHeight: 0 },
      y: { maxWidth: 0, maxHeight: 0 }
    }, r = Dt(e, s.view), o = (x, u) => {
      const y = x.cache.primitives;
      if (!y || x.change.dirty) {
        const k = u();
        return x.cache.primitives = k, ct(x.change), k;
      }
      return y;
    };
    Me(
      e.config,
      s.view,
      s.transform,
      this.grid,
      this.text,
      this.scratch,
      t.measureText,
      n,
      e.axisOffset,
      r
    );
    for (const x of e.listSeries()) {
      if (!x.visible) continue;
      const u = e.getSeries(x.id);
      if (!u) continue;
      let y = null, k = !1;
      if (u.kind === U.line || u.kind === U.step) {
        const m = u.data, p = Math.min(m.count ?? 0, m.x.length, m.y.length);
        if (p >= lt) {
          const w = u.cache, P = m.x[0] ?? 0;
          if (!w.lod || w.lod.revision > u.change.revision || w.lod.sourceCount > p || w.lod.x0 !== P)
            w.lod = it({
              x: m.x,
              y: m.y,
              count: p,
              revision: u.change.revision
            });
          else if (w.lod.revision === u.change.revision - 1) {
            const M = p - w.lod.sourceCount;
            M > 0 ? (w.lod = pe(w.lod, {
              x: m.x,
              y: m.y,
              start: w.lod.sourceCount,
              count: M
            }), w.lod.sourceCount === p ? (w.lod.revision = u.change.revision, w.lod.x0 = P) : w.lod = it({
              x: m.x,
              y: m.y,
              count: p,
              revision: u.change.revision
            })) : M === 0 ? w.lod.revision = u.change.revision : w.lod = it({
              x: m.x,
              y: m.y,
              count: p,
              revision: u.change.revision
            });
          } else w.lod.revision !== u.change.revision && (w.lod = it({
            x: m.x,
            y: m.y,
            count: p,
            revision: u.change.revision
          }));
        }
        if (y = ke(
          m.x,
          p,
          s.view,
          2,
          e.axisOffset.x
        ), y && p >= lt && (k = !0), (u.kind === U.line || u.kind === U.step) && y) {
          const w = y.count, P = s.view.plot.size.width * s.view.dpr;
          if (w >= lt && P > 0) {
            const M = w / P;
            if (M > Bt) {
              const T = u.cache.lod;
              if (T) {
                const _ = M / Bt, L = Math.log2(Math.max(1, _)), N = T.levels.length - 1, z = Math.max(
                  0,
                  Math.min(N, Math.floor(L))
                ), Q = L - z, $ = Math.min(N, z + 1), O = z === N ? 0 : be(0.2, 0.8, Q), I = u.kind === U.step ? "miter" : "round", R = u.kind === U.step ? "butt" : "round", D = T.levels[z], W = T.levels[$], E = ve(u.id, 0), V = (A) => {
                  const F = Math.max(2, A.count * 4);
                  return Math.max(1, F - 1) * 4 * 4;
                };
                if (O <= 0.01 || z === $) {
                  const A = st({
                    x: m.x,
                    y: m.y,
                    total: p,
                    drawRange: y,
                    level: D,
                    resourceKey: E + z,
                    revision: u.change.revision,
                    bufferBytes: V(D),
                    widthPx: m.widthPx,
                    color: u.style.color,
                    opacity: 1,
                    join: I,
                    cap: R,
                    scratch: this.scratch
                  });
                  if (A) {
                    this.series.push(A);
                    continue;
                  }
                } else if (O >= 0.99) {
                  const A = st({
                    x: m.x,
                    y: m.y,
                    total: p,
                    drawRange: y,
                    level: W,
                    resourceKey: E + $,
                    revision: u.change.revision,
                    bufferBytes: V(W),
                    widthPx: m.widthPx,
                    color: u.style.color,
                    opacity: 1,
                    join: I,
                    cap: R,
                    scratch: this.scratch
                  });
                  if (A) {
                    this.series.push(A);
                    continue;
                  }
                } else {
                  const A = st({
                    x: m.x,
                    y: m.y,
                    total: p,
                    drawRange: y,
                    level: D,
                    resourceKey: E + z,
                    revision: u.change.revision,
                    bufferBytes: V(D),
                    widthPx: m.widthPx,
                    color: u.style.color,
                    opacity: 1 - O,
                    join: I,
                    cap: R,
                    scratch: this.scratch
                  }), F = st({
                    x: m.x,
                    y: m.y,
                    total: p,
                    drawRange: y,
                    level: W,
                    resourceKey: E + $,
                    revision: u.change.revision,
                    bufferBytes: V(W),
                    widthPx: m.widthPx,
                    color: u.style.color,
                    opacity: O,
                    join: I,
                    cap: R,
                    scratch: this.scratch
                  });
                  if (A || F) {
                    A && this.series.push(A), F && this.series.push(F);
                    continue;
                  }
                }
                k = !1;
              }
            }
          }
        }
      } else if (u.kind === U.bars) {
        const m = u.data, p = Math.min(m.x.length, m.y.length);
        if (p > 0) {
          const w = (m.width ?? 1) * 0.5, P = e.axisOffset.x, M = s.view.world.x.min - P - w, S = s.view.world.x.max - P + w;
          let T = ft(m.x, M, p) - 1, _ = dt(m.x, S, p) + 1;
          T < 0 && (T = 0), _ > p - 1 && (_ = p - 1), _ >= T && (y = { start: T, count: _ - T + 1 });
        }
      }
      const v = u.cache.primitives;
      if (u.change.dirty && v && (u.kind === U.line || u.kind === U.step)) {
        const m = v.find((P) => P.kind === "path"), p = u.data, w = Math.min(p.count ?? 0, p.x.length, p.y.length);
        if (m && w > 0)
          if (u.kind === U.line) {
            const P = w * 2;
            if (m.points.length >= P) {
              for (let M = 0; M < w; M++)
                m.points[M * 2] = p.x[M] ?? 0, m.points[M * 2 + 1] = p.y[M] ?? 0;
              m.count = w, m.revision = u.change.revision, ct(u.change);
            }
          } else {
            const M = (w * 2 - 1) * 2;
            if (m.points.length >= M) {
              const S = _t(
                p.x,
                p.y,
                w,
                p.align ?? "end",
                m.points
              );
              m.count = S / 2, m.revision = u.change.revision, ct(u.change);
            }
          }
      }
      const b = o(u, () => {
        const m = [];
        e.registry.get(u.kind).buildPrimitives({
          seriesId: u.id,
          data: u.data,
          style: { color: u.style.color },
          out: m,
          scratch: this.persistentScratch
        });
        for (let p = 0; p < m.length; p++) {
          const w = m[p];
          w.resourceKey = Tt(u.id, p), w.revision = u.change.revision;
        }
        return m;
      });
      if (b)
        for (let m = 0; m < b.length; m++) {
          const p = b[m];
          if (p.resourceKey == null && (p.resourceKey = Tt(u.id, m)), p.revision == null && (p.revision = u.change.revision), y) {
            if (p.kind === "path") {
              if (u.kind === U.step) {
                const w = u.data, P = Math.min(
                  w.count ?? 0,
                  w.x.length,
                  w.y.length
                ), M = Math.max(0, P * 2 - 1), S = Math.min(
                  M,
                  Math.max(0, y.start * 2)
                );
                let T = y.count * 2 - 1;
                S + T > M && (T = M - S), T <= 0 ? p.draw = void 0 : p.draw = { start: S, count: T };
              } else
                p.draw = y;
              if (k && p.draw) {
                const w = p.draw.count;
                p.dynamic = !0, p.bufferBytes = Math.max(1, w - 1) * 4 * 4;
              } else (p.dynamic || p.bufferBytes) && (p.dynamic = !1, p.bufferBytes = void 0);
            }
            p.kind === "quad" && p.mode === "rect" && (p.draw = y);
          } else "draw" in p && p.draw && (p.draw = void 0);
          this.series.push(p);
        }
    }
    for (const x of e.listItems()) {
      if (!x.visible) continue;
      const u = this.items.length, y = o(x, () => {
        const k = [];
        e.itemRegistry.get(x.kind).buildPrimitives({
          itemId: x.id,
          data: x.data,
          style: x.style,
          view: s.view,
          out: k,
          text: this.text,
          scratch: this.persistentScratch,
          axisOffset: e.axisOffset
        });
        for (let v = 0; v < k.length; v++) {
          const b = k[v];
          b.resourceKey = It(x.id, v), b.revision = x.change.revision;
        }
        return k;
      });
      if (y)
        for (let k = 0; k < y.length; k++) {
          const v = y[k];
          v.resourceKey == null && (v.resourceKey = It(x.id, k)), v.revision == null && (v.revision = x.change.revision), this.items.push(v);
        }
      if (this.items.length > u) {
        const k = this.pickTable.length;
        this.pickTable.push({ kind: "item", itemId: x.id });
        for (let v = u; v < this.items.length; v++) {
          const b = this.items[v];
          b && b.kind === "quad" && b.mode === "rect" && (b.pick = { idBase: k });
        }
      }
    }
    Te(
      s,
      this.overlays,
      this.text,
      this.scratch,
      this.pickTable,
      e.axisOffset,
      r
    ), e.config, this.text;
    const c = e.axisOffset.x ?? 0, a = e.axisOffset.y ?? 0, h = {
      world: {
        x: {
          min: s.view.world.x.min - c,
          max: s.view.world.x.max - c
        },
        y: {
          min: s.view.world.y.min - a,
          max: s.view.world.y.max - a
        }
      },
      dpr: s.view.dpr,
      canvas: {
        width: s.view.canvas.width,
        height: s.view.canvas.height
      },
      plot: {
        origin: {
          x: s.view.plot.origin.x,
          y: s.view.plot.origin.y
        },
        size: {
          width: s.view.plot.size.width,
          height: s.view.plot.size.height
        }
      }
    }, l = { ...s.transform }, f = {
      x: l.renderOriginWorldX - c,
      y: l.renderOriginWorldY - a
    }, g = s.crosshair.enabled ? {
      sx: s.crosshair.sx,
      sy: s.crosshair.sy,
      color: e.config.crosshairColor
    } : void 0;
    return {
      viewport: h,
      transform: l,
      background: e.config.background,
      borderColor: e.config.borderColor,
      grid: this.grid,
      series: this.series,
      items: this.items,
      overlays: this.overlays,
      text: this.text,
      pickTable: this.pickTable,
      crosshair: g,
      axisMetrics: n,
      renderOrigin: f
    };
  }
}
class Be {
  constructor() {
    d(this, "map", /* @__PURE__ */ new Map());
  }
  subscribe(t, e) {
    let s = this.map.get(t);
    return s || (s = /* @__PURE__ */ new Set(), this.map.set(t, s)), s.add(e), () => {
      s == null || s.delete(e);
    };
  }
  emit(t, e) {
    const s = this.map.get(t);
    if (s)
      for (const n of s) n(e);
  }
}
var q = /* @__PURE__ */ ((i) => (i[i.None = 0] = "None", i[i.View = 1] = "View", i[i.Layout = 2] = "Layout", i[i.Config = 4] = "Config", i[i.Series = 8] = "Series", i[i.Items = 16] = "Items", i[i.Interaction = 32] = "Interaction", i))(q || {});
class Ce {
  constructor(t, e, s) {
    this.engine = t, this.model = e, this.picker = s;
  }
  dispatch(t) {
    this.engine.dispatch(t);
  }
  screenToWorld(t, e) {
    return this.engine.screenToWorld(t, e);
  }
  pickIdAt(t, e) {
    var s;
    return ((s = this.picker) == null ? void 0 : s.pickIdAt(t, e)) ?? 0;
  }
  pickHitAt(t, e) {
    var o, c;
    const s = this.pickIdAt(t, e);
    if (s) {
      const a = this.engine.resolvePick(s);
      if (a) return a;
    }
    const n = this.screenToWorld(t, e), r = this.hitTestWorld(n.x, n.y, 6, { includeScatter: !0 });
    return r ? r.hit : (c = (o = this.picker) == null ? void 0 : o.isPickPending) != null && c.call(o) ? this.engine.hover : null;
  }
  hitTestWorld(t, e, s = 6, n) {
    const { tolx: r, toly: o } = this.engine.toleranceWorld(s);
    return this.model.hitTest(t, e, r, o, n);
  }
}
class Re {
  constructor(t) {
    d(this, "model");
    d(this, "events", new Be());
    d(this, "onInvalidate", null);
    d(this, "view");
    d(this, "transform");
    d(this, "cursor", { active: !1, x: 0, y: 0 });
    d(this, "lastPointer", null);
    d(this, "hover", null);
    d(this, "selection", null);
    d(this, "crosshair", {
      enabled: !1,
      sx: 0,
      sy: 0
    });
    d(this, "actionsEnabled", !0);
    d(this, "dirty", 7);
    d(this, "tools");
    d(this, "pickTable", null);
    d(this, "picker");
    d(this, "axisCtx", null);
    this.model = t.model, this.view = t.initialViewport, this.tools = t.tools, this.transform = this.rebuildTransform();
  }
  setPickTable(t) {
    this.pickTable = t;
  }
  setPicker(t) {
    this.picker = t;
  }
  resolvePick(t) {
    return !t || !this.pickTable ? null : this.pickTable[t] ?? null;
  }
  setActionsEnabled(t) {
    this.actionsEnabled !== t && (this.actionsEnabled = t, t || (this.hover = null, this.selection = null, this.invalidate(
      32
      /* Interaction */
    )));
  }
  pointerMove(t, e, s) {
    this.lastPointer = { sx: t, sy: e }, this.updateCrosshair(t, e), this.actionsEnabled && this.dispatchTools("pointerMove", t, e, s), this.emitCursorAndHover(t, e);
  }
  pointerDown(t, e, s, n) {
    this.lastPointer = { sx: e, sy: s }, this.updateCrosshair(e, s), this.actionsEnabled && this.dispatchTools("pointerDown", t, e, s, n), this.emitClick(t, e, s);
  }
  pointerUp(t, e, s, n) {
    this.updateCrosshair(e, s), this.actionsEnabled && this.dispatchTools("pointerUp", t, e, s, n);
  }
  wheel(t, e, s, n) {
    this.lastPointer = { sx: e, sy: s }, this.actionsEnabled && this.dispatchTools("wheel", t, e, s, n);
  }
  doubleClick(t, e, s) {
    this.actionsEnabled && this.dispatchTools("doubleClick", t, e, s);
  }
  pointerLeave() {
    this.actionsEnabled && this.dispatchTools("leave"), this.lastPointer = null, this.crosshair.enabled && (this.crosshair.enabled = !1, this.invalidate(
      32
      /* Interaction */
    )), this.hover && (this.hover = null, this.invalidate(
      32
      /* Interaction */
    )), this.events.emit("cursor", {
      inside: !1,
      plotRect: {
        origin: {
          x: this.view.plot.origin.x,
          y: this.view.plot.origin.y
        },
        size: {
          width: this.view.plot.size.width,
          height: this.view.plot.size.height
        }
      }
    });
  }
  dispatch(t) {
    switch (t.type) {
      case "VIEW/SET_RANGES":
        this.applyViewChange(1, t.emit, () => {
          this.view.world.x = { ...t.x }, this.view.world.y = { ...t.y };
        });
        break;
      case "VIEW/SET_LAYOUT":
        this.applyViewChange(3, t.emit, () => {
          this.view.dpr = t.layout.dpr, this.view.canvas = {
            width: t.layout.canvas.width,
            height: t.layout.canvas.height
          }, this.view.plot = {
            origin: {
              x: t.layout.plot.origin.x,
              y: t.layout.plot.origin.y
            },
            size: {
              width: t.layout.plot.size.width,
              height: t.layout.plot.size.height
            }
          };
        });
        break;
      case "VIEW/PAN_BY_PX": {
        this.applyViewChange(1, t.emit, () => {
          const e = Ft(
            this.transform,
            t.dx,
            t.dy
          );
          this.view.world.x = e.x, this.view.world.y = e.y;
        });
        break;
      }
      case "VIEW/ZOOM_AT": {
        this.applyViewChange(1, t.emit, () => {
          const e = this.screenToWorld(t.sx, t.sy), s = Math.exp(t.deltaY * 1e-3), n = this.axisSpec("x"), r = this.axisSpec("y");
          (t.axis === "x" || t.axis === "xy") && (this.view.world.x = kt(
            this.view.world.x,
            e.x,
            s,
            n.scale
          )), (t.axis === "y" || t.axis === "xy") && (this.view.world.y = kt(
            this.view.world.y,
            e.y,
            s,
            r.scale
          ));
        });
        break;
      }
      case "VIEW/RESET":
        this.applyViewChange(1, t.emit, () => {
          this.view.world.x = { ...this.model.resetWorld.x }, this.view.world.y = { ...this.model.resetWorld.y };
        });
        break;
      case "MODEL/SET_CONFIG":
        this.model.setConfig(t.patch), this.invalidate(
          4
          /* Config */
        );
        break;
      case "MODEL/SET_SERIES_VISIBLE":
        this.model.setSeriesVisible(t.id, t.on), this.invalidate(
          8
          /* Series */
        );
        break;
      case "MODEL/UPDATE_ITEM":
        this.model.updateItem(t.id, t.patch) && this.invalidate(
          16
          /* Items */
        );
        break;
      case "INTERACTION/SET_CURSOR":
        this.cursor.active = t.active, t.x != null && (this.cursor.x = t.x), t.y != null && (this.cursor.y = t.y), this.invalidate(
          32
          /* Interaction */
        );
        break;
      case "INTERACTION/SET_HOVER":
        this.hover = t.hover, this.invalidate(
          32
          /* Interaction */
        );
        break;
      case "INTERACTION/SET_SELECTION":
        this.selection = t.selection, this.invalidate(
          32
          /* Interaction */
        );
        break;
      case "INTERACTION/SET_CROSSHAIR":
        this.crosshair.enabled = t.enabled, t.sx != null && (this.crosshair.sx = t.sx), t.sy != null && (this.crosshair.sy = t.sy), this.invalidate(
          32
          /* Interaction */
        );
        break;
    }
  }
  applyViewChange(t, e, s) {
    s(), this.invalidate(t), this.rebuildTransform(), this.recomputeHoverFromPointer({ hitTest: !1 }), e && this.emitView();
  }
  invalidate(t) {
    var e;
    this.dirty |= t, t & 7 && (this.axisCtx = null), (e = this.onInvalidate) == null || e.call(this);
  }
  resetDirty() {
    this.dirty = 0;
  }
  screenToWorld(t, e) {
    return Vt(this.transform, t, e);
  }
  toleranceWorld(t) {
    const e = this.transform.x, s = this.transform.y, n = t * Math.abs((e == null ? void 0 : e.invScale) ?? 1), r = t * Math.abs((s == null ? void 0 : s.invScale) ?? 1);
    return { tolx: n, toly: r };
  }
  getAxisCtx() {
    return this.axisCtx || (this.axisCtx = Dt(this.model, this.view)), this.axisCtx;
  }
  axisSpec(t) {
    return ht(this.model, t);
  }
  formatCrosshairLabel(t, e) {
    const s = this.getAxisCtx(), n = St(s, { x: t, y: e });
    return `${n.x}, ${n.y}`;
  }
  emitView() {
    this.events.emit("view", {
      x: { ...this.view.world.x },
      y: { ...this.view.world.y }
    });
  }
  updateCrosshair(t, e) {
    if (!tt(this.view.plot, t, e)) {
      this.crosshair.enabled && (this.crosshair.enabled = !1, this.invalidate(
        32
        /* Interaction */
      ));
      return;
    }
    (!this.crosshair.enabled || this.crosshair.sx !== t || this.crosshair.sy !== e) && (this.crosshair.enabled = !0, this.crosshair.sx = t, this.crosshair.sy = e, this.invalidate(
      32
      /* Interaction */
    ));
  }
  emitCursorAndHover(t, e) {
    const s = this.view.plot, n = tt(this.view.plot, t, e), r = { x: t, y: e }, o = n ? this.screenToWorld(t, e) : void 0, c = n ? this.hitInfo(this.hover) : void 0, a = o ? St(this.getAxisCtx(), o) : void 0;
    this.events.emit("cursor", {
      inside: n,
      screen: r,
      world: o,
      hit: c,
      formatted: a,
      plotRect: {
        origin: { x: s.origin.x, y: s.origin.y },
        size: { width: s.size.width, height: s.size.height }
      }
    }), n && this.events.emit("hover", { screen: r, world: o, hit: c });
  }
  recomputeHoverFromPointer(t) {
    if (!this.lastPointer) return;
    const { sx: e, sy: s } = this.lastPointer;
    if (!tt(this.view.plot, e, s)) {
      this.hover && (this.hover = null, this.invalidate(
        32
        /* Interaction */
      ));
      return;
    }
    const r = this.screenToWorld(e, s);
    if ((t == null ? void 0 : t.hitTest) === !1) {
      this.emitCursorAndHover(e, s);
      return;
    }
    const o = this.toleranceWorld(6), c = this.model.hitTest(r.x, r.y, o.tolx, o.toly, {
      includeScatter: !0
    }), a = (c == null ? void 0 : c.hit) ?? null;
    a !== this.hover && (this.hover = a, this.invalidate(
      32
      /* Interaction */
    )), this.emitCursorAndHover(e, s);
  }
  emitClick(t, e, s) {
    if (!tt(this.view.plot, e, s)) return;
    const r = { x: e, y: s }, o = this.screenToWorld(e, s), c = this.hitInfo(this.hover);
    this.events.emit("click", { screen: r, world: o, button: t, hit: c });
  }
  hitInfo(t) {
    if (t) {
      if (t.kind === "series-point") {
        const e = this.model.getSeries(t.seriesId);
        return e ? {
          ...t,
          seriesName: e.name,
          color: e.style.color,
          datum: this.model.getDatum(t.seriesId, t.index) ?? void 0
        } : t;
      }
      return t.kind === "item" || t.kind === "item-handle", t;
    }
  }
  rebuildTransform() {
    const t = this.axisSpec("x"), e = this.axisSpec("y");
    return this.transform = Xt({
      worldX: this.view.world.x,
      worldY: this.view.world.y,
      originX: this.view.plot.origin.x,
      originY: this.view.plot.origin.y,
      screenW: this.view.plot.size.width,
      screenH: this.view.plot.size.height,
      dpr: this.view.dpr,
      scaleX: t.scale,
      scaleY: e.scale
    }), this.transform;
  }
  dispatchTools(t, ...e) {
    const s = this.buildToolContext();
    for (const n of this.tools) {
      const r = n[t];
      if (!r) continue;
      if (r.call(n, s, ...e)) break;
    }
  }
  buildToolContext() {
    return new Ce(this, this.model, this.picker);
  }
}
class _e {
  constructor() {
    d(this, "dragging", !1);
    d(this, "lastX", 0);
    d(this, "lastY", 0);
  }
  pointerDown(t, e, s, n, r) {
    if (e === "left" && !r.shift)
      return this.dragging = !0, this.lastX = s, this.lastY = n, !0;
  }
  pointerMove(t, e, s, n) {
    if (!this.dragging) return;
    const r = e - this.lastX, o = s - this.lastY;
    this.lastX = e, this.lastY = s, t.dispatch({ type: "VIEW/PAN_BY_PX", dx: r, dy: o, emit: !0 });
  }
  pointerUp(t, e) {
    if (this.dragging)
      return this.dragging = !1, !0;
  }
  wheel(t, e, s, n, r) {
    const o = r.shift ? "x" : r.alt ? "y" : "xy";
    return t.dispatch({ type: "VIEW/ZOOM_AT", deltaY: e, sx: s, sy: n, axis: o, emit: !0 }), !0;
  }
}
class Ee {
  constructor() {
    d(this, "active", !1);
    d(this, "start", [0, 0]);
    d(this, "startScreen", [0, 0]);
    d(this, "currentScreen", [0, 0]);
  }
  pointerDown(t, e, s, n, r) {
    if (e !== "left" || !r.shift || !tt(t.engine.view.plot, s, n))
      return;
    const o = t.screenToWorld(s, n);
    return this.active = !0, this.start = [o.x, o.y], this.startScreen = [s, n], this.currentScreen = [s, n], t.dispatch({
      type: "INTERACTION/SET_SELECTION",
      selection: { start: this.start, current: this.start, axis: "xy" }
    }), !0;
  }
  pointerMove(t, e, s, n) {
    if (!this.active) return;
    const r = t.screenToWorld(e, s);
    return this.currentScreen = [e, s], t.dispatch({
      type: "INTERACTION/SET_SELECTION",
      selection: { start: this.start, current: [r.x, r.y], axis: "xy" }
    }), !0;
  }
  pointerUp(t, e) {
    if (!this.active) return;
    const s = t.engine.selection, n = Math.abs(this.startScreen[0] - this.currentScreen[0]), r = Math.abs(this.startScreen[1] - this.currentScreen[1]), o = 6;
    if (s && n > o && r > o) {
      const c = Math.min(s.start[0], s.current[0]), a = Math.max(s.start[0], s.current[0]), h = Math.min(s.start[1], s.current[1]), l = Math.max(s.start[1], s.current[1]);
      t.dispatch({
        type: "VIEW/SET_RANGES",
        x: { min: c, max: a },
        y: { min: h, max: l },
        emit: !0
      });
    }
    return this.active = !1, t.dispatch({ type: "INTERACTION/SET_SELECTION", selection: null }), !0;
  }
}
class Ae {
  pointerMove(t, e, s, n) {
    const r = t.pickHitAt(e, s);
    t.dispatch({ type: "INTERACTION/SET_HOVER", hover: r });
  }
  pointerDown(t, e, s, n, r) {
    const o = t.pickHitAt(s, n);
    t.dispatch({ type: "INTERACTION/SET_HOVER", hover: o });
  }
}
class Ue {
  doubleClick(t, e, s, n) {
    return t.dispatch({ type: "VIEW/RESET", emit: !0 }), !0;
  }
}
class Le {
  constructor() {
    d(this, "active", null);
  }
  pointerDown(t, e, s, n, r) {
    if (e !== "left") return;
    const o = t.pickHitAt(s, n);
    if (!o || o.kind !== "item-handle") return;
    const c = t.screenToWorld(s, n);
    return this.active = { itemId: o.itemId, handleId: o.handleId, start: c }, !0;
  }
  pointerMove(t, e, s, n) {
    if (!this.active) return;
    const r = t.screenToWorld(e, s), o = t.model.getItem(this.active.itemId);
    if (!o) return !0;
    const c = t.model.itemRegistry.get(o.kind);
    if (!c.applyEdit) return !0;
    const a = c.applyEdit({
      data: o.data,
      edit: {
        kind: "drag-handle",
        handleId: this.active.handleId,
        start: this.active.start,
        now: r,
        minSize: (() => {
          const h = t.engine.toleranceWorld(2);
          return { x: h.tolx, y: h.toly };
        })()
      }
    });
    if (o.kind === J.rect) {
      const h = a, l = [
        { id: 0, x: h.xMin, y: h.yMin },
        { id: 1, x: h.xMax, y: h.yMin },
        { id: 2, x: h.xMax, y: h.yMax },
        { id: 3, x: h.xMin, y: h.yMax }
      ];
      let f = this.active.handleId, g = 1 / 0;
      for (const x of l) {
        const u = r.x - x.x, y = r.y - x.y, k = u * u + y * y;
        k < g && (g = k, f = x.id);
      }
      this.active.handleId = f;
    }
    t.dispatch({
      type: "MODEL/UPDATE_ITEM",
      id: o.id,
      patch: { data: a }
    });
  }
  pointerUp(t, e) {
    if (this.active)
      return this.active = null, !0;
  }
}
const Wt = `struct ViewUbo {
  v0: vec4<f32>,
  v1: vec4<f32>,
  v2: vec4<f32>,
};

struct DrawUbo {
  fill: vec4<f32>,
  stroke: vec4<f32>,
  params0: vec4<f32>, // size, strokeWidth, opacity, pickFlags
  params1: vec4<f32>, // pickBase, roundness, unused...
};

@group(0) @binding(0) var<uniform> view: ViewUbo;
@group(1) @binding(0) var<uniform> draw: DrawUbo;

fn world_to_device(p: vec2<f32>) -> vec2<f32> {
  let worldMin = vec2<f32>(view.v1.z, view.v1.w);
  let worldSpan = vec2<f32>(view.v2.x, view.v2.y);
  let origin = vec2<f32>(view.v2.z, view.v2.w);
  let plotOrigin = vec2<f32>(view.v0.z, view.v0.w);
  let plotSize = vec2<f32>(view.v1.x, view.v1.y);
  let pRel = p - origin;
  let worldMinRel = worldMin - origin;
  let t = (pRel - worldMinRel) / worldSpan;
  let px = plotOrigin.x + t.x * plotSize.x;
  let py = plotOrigin.y + (1.0 - t.y) * plotSize.y;
  return vec2<f32>(px, py);
}

fn device_to_clip(p: vec2<f32>) -> vec4<f32> {
  let canvas = vec2<f32>(view.v0.x, view.v0.y);
  let ndc = vec2<f32>(
    (p.x / canvas.x) * 2.0 - 1.0,
    1.0 - (p.y / canvas.y) * 2.0
  );
  return vec4<f32>(ndc, 0.0, 1.0);
}

fn rect_sdf(p: vec2<f32>, half: vec2<f32>, r: f32) -> f32 {
  let q = abs(p) - (half - vec2<f32>(r));
  return length(max(q, vec2<f32>(0.0))) + min(max(q.x, q.y), 0.0) - r;
}
`, De = `${Wt}

struct VsOutQuad {
  @builtin(position) pos: vec4<f32>,
  @location(0) local: vec2<f32>,
  @location(1) halfDev: vec2<f32>,
};

@vertex
fn vs_marker(
  @location(0) corner: vec2<f32>,
  @location(1) world: vec2<f32>
) -> VsOutQuad {
  let size = draw.params0.x;
  let halfDev = vec2<f32>(size * 0.5);
  let center = world_to_device(world);
  let posDev = center + corner * halfDev;
  var out: VsOutQuad;
  out.pos = device_to_clip(posDev);
  out.local = corner;
  out.halfDev = halfDev;
  return out;
}

@vertex
fn vs_rect(
  @location(0) corner: vec2<f32>,
  @location(1) rect: vec4<f32>
) -> VsOutQuad {
  let p0 = world_to_device(rect.xy);
  let p1 = world_to_device(rect.xy + rect.zw);
  let minp = vec2<f32>(min(p0.x, p1.x), min(p0.y, p1.y));
  let maxp = vec2<f32>(max(p0.x, p1.x), max(p0.y, p1.y));
  let center = (minp + maxp) * 0.5;
  let halfDev = (maxp - minp) * 0.5;
  let posDev = center + corner * halfDev;
  var out: VsOutQuad;
  out.pos = device_to_clip(posDev);
  out.local = corner;
  out.halfDev = halfDev;
  return out;
}

struct VsOutStroke {
  @builtin(position) pos: vec4<f32>,
};

struct VsOutTri {
  @builtin(position) pos: vec4<f32>,
};

@vertex
fn vs_stroke(
  @location(0) corner: vec2<f32>,
  @location(1) a: vec2<f32>,
  @location(2) b: vec2<f32>
) -> VsOutStroke {
  let aDev = world_to_device(a);
  let bDev = world_to_device(b);
  let dir = bDev - aDev;
  let len = max(length(dir), 1e-6);
  let d = dir / len;
  let n = vec2<f32>(-d.y, d.x);
  let half = draw.params0.x * 0.5;
  let posDev = aDev + d * (corner.x * len) + n * (corner.y * half);
  var out: VsOutStroke;
  out.pos = device_to_clip(posDev);
  return out;
}

@vertex
fn vs_tris(
  @location(0) pos: vec2<f32>
) -> VsOutTri {
  let dev = world_to_device(pos);
  var out: VsOutTri;
  out.pos = device_to_clip(dev);
  return out;
}

@fragment
fn fs_quad(in: VsOutQuad) -> @location(0) vec4<f32> {
  let opacity = draw.params0.z;
  let fill = vec4<f32>(draw.fill.rgb, draw.fill.a * opacity);
  let stroke = vec4<f32>(draw.stroke.rgb, draw.stroke.a * opacity);
  let strokeW = draw.params0.y;
  let roundness = draw.params1.y;
  let half = in.halfDev;
  let r = min(half.x, half.y) * roundness;
  let p = in.local * half;
  let d = rect_sdf(p, half, r);
  let aa = max(fwidth(d), 0.5);
  let outer = smoothstep(0.0, aa, d);
  let inner = smoothstep(0.0, aa, d + strokeW);
  let fillAlpha = 1.0 - inner;
  let strokeAlpha = max(inner - outer, 0.0);
  return fill * fillAlpha + stroke * strokeAlpha;
}

@fragment
fn fs_stroke() -> @location(0) vec4<f32> {
  let opacity = draw.params0.z;
  return vec4<f32>(draw.fill.rgb, draw.fill.a * opacity);
}

@fragment
fn fs_tris() -> @location(0) vec4<f32> {
  let opacity = draw.params0.z;
  return vec4<f32>(draw.fill.rgb, draw.fill.a * opacity);
}

// heatmap pipeline removed in minimal primitive set
`, We = `${Wt}

struct VsOutPick {
  @builtin(position) pos: vec4<f32>,
  @location(0) pickId: u32,
  @location(1) local: vec2<f32>,
  @location(2) halfDev: vec2<f32>,
};

fn pick_id(inst: u32) -> u32 {
  let base = u32(draw.params1.x);
  let perInstance = draw.params0.w > 0.5;
  return select(base, base + inst, perInstance);
}

@vertex
fn vs_marker(
  @location(0) corner: vec2<f32>,
  @location(1) world: vec2<f32>,
  @builtin(instance_index) inst: u32
) -> VsOutPick {
  let size = draw.params0.x;
  let halfDev = vec2<f32>(size * 0.5);
  let center = world_to_device(world);
  let posDev = center + corner * halfDev;
  var out: VsOutPick;
  out.pos = device_to_clip(posDev);
  out.pickId = pick_id(inst);
  out.local = corner;
  out.halfDev = halfDev;
  return out;
}

@vertex
fn vs_rect(
  @location(0) corner: vec2<f32>,
  @location(1) rect: vec4<f32>,
  @builtin(instance_index) inst: u32
) -> VsOutPick {
  let p0 = world_to_device(rect.xy);
  let p1 = world_to_device(rect.xy + rect.zw);
  let minp = vec2<f32>(min(p0.x, p1.x), min(p0.y, p1.y));
  let maxp = vec2<f32>(max(p0.x, p1.x), max(p0.y, p1.y));
  let center = (minp + maxp) * 0.5;
  let halfDev = (maxp - minp) * 0.5;
  let posDev = center + corner * halfDev;
  var out: VsOutPick;
  out.pos = device_to_clip(posDev);
  out.pickId = pick_id(inst);
  out.local = corner;
  out.halfDev = halfDev;
  return out;
}

@vertex
fn vs_stroke(
  @location(0) corner: vec2<f32>,
  @location(1) a: vec2<f32>,
  @location(2) b: vec2<f32>,
  @builtin(instance_index) inst: u32
) -> VsOutPick {
  let aDev = world_to_device(a);
  let bDev = world_to_device(b);
  let dir = bDev - aDev;
  let len = max(length(dir), 1e-6);
  let d = dir / len;
  let n = vec2<f32>(-d.y, d.x);
  let half = draw.params0.x * 0.5;
  let posDev = aDev + d * (corner.x * len) + n * (corner.y * half);
  var out: VsOutPick;
  out.pos = device_to_clip(posDev);
  out.pickId = pick_id(inst);
  out.local = corner;
  out.halfDev = vec2<f32>(0.0);
  return out;
}

@fragment
fn fs_pick(in: VsOutPick) -> @location(0) u32 {
  let roundness = draw.params1.y;
  let half = in.halfDev;
  let r = min(half.x, half.y) * roundness;
  let p = in.local * half;
  let d = rect_sdf(p, half, r);
  if (d > 0.0) {
    discard;
  }
  return in.pickId;
}
`;
async function Ye(i) {
  var c, a, h;
  if (!("gpu" in navigator)) return null;
  const t = i.getContext("webgpu");
  if (!t) return null;
  const e = await navigator.gpu.requestAdapter();
  if (!e) return null;
  const s = [];
  e.features.has("timestamp-query") && s.push("timestamp-query");
  const n = await e.requestDevice({ requiredFeatures: s }), r = navigator.gpu.getPreferredCanvasFormat();
  t.configure({ device: n, format: r, alphaMode: "premultiplied" });
  const o = ((c = n.limits) == null ? void 0 : c.timestampPeriod) ?? ((h = (a = n.queue).getTimestampPeriod) == null ? void 0 : h.call(a)) ?? 0;
  return { device: n, queue: n.queue, format: r, context: t, timestampPeriod: o };
}
const Ge = 16;
class nt {
  constructor() {
    d(this, "map", /* @__PURE__ */ new Map());
  }
  clear() {
    for (const t of this.map.values()) t.buffer.destroy();
    this.map.clear();
  }
  get(t, e, s, n) {
    const r = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
    let o = this.map.get(e);
    const c = !o || o.capacity < s, a = !o || c || o.revision !== n;
    if (!o || c) {
      const h = Math.max(s, o != null && o.capacity ? o.capacity * 2 : 1024);
      o = { buffer: t.createBuffer({ size: h, usage: r }), capacity: h, revision: n }, this.map.set(e, o);
    } else o.revision !== n && (o.revision = n);
    return { buffer: o.buffer, write: a, entry: o };
  }
}
class ze {
  constructor(t) {
    d(this, "gpu", null);
    d(this, "ready", !1);
    d(this, "viewBuffer", null);
    d(this, "drawBuffer", null);
    d(this, "viewBindGroup", null);
    d(this, "drawBindGroup", null);
    d(this, "viewBindGroupLayout", null);
    d(this, "drawBindGroupLayout", null);
    d(this, "drawBuffers", []);
    d(this, "drawBindGroups", []);
    d(this, "drawIndex", 0);
    d(this, "pipelineMarker", null);
    d(this, "pipelineRect", null);
    d(this, "pipelineStroke", null);
    d(this, "pipelineTris", null);
    d(this, "pickPipelineMarker", null);
    d(this, "pickPipelineRect", null);
    d(this, "pickPipelineStroke", null);
    d(this, "quadBuffer", null);
    d(this, "strokeCornerBuffer", null);
    d(this, "quadIndex", null);
    d(this, "markerBuffers", []);
    d(this, "markerCaps", []);
    d(this, "rectBuffers", []);
    d(this, "rectCaps", []);
    d(this, "strokeBuffers", []);
    d(this, "strokeCaps", []);
    d(this, "trisBuffers", []);
    d(this, "trisCaps", []);
    d(this, "markerCache", new nt());
    d(this, "rectCache", new nt());
    d(this, "strokeCache", new nt());
    d(this, "trisCache", new nt());
    d(this, "markerIndex", 0);
    d(this, "rectIndex", 0);
    d(this, "strokeIndex", 0);
    d(this, "trisIndex", 0);
    d(this, "pickTexture", null);
    d(this, "pickView", null);
    d(this, "pickSize", { w: 0, h: 0 });
    d(this, "pickTexSize", { w: 0, h: 0 });
    d(this, "pickReadBuffer", null);
    d(this, "pickRequest", null);
    d(this, "pickPending", !1);
    d(this, "lastPickId", 0);
    d(this, "lastGpuMs", 0);
    d(this, "gpuPending", !1);
    d(this, "timestampSupported", !1);
    d(this, "timestampPeriod", 0);
    d(this, "timestampQuerySet", null);
    d(this, "timestampResolveBuffer", null);
    d(this, "timestampReadBuffer", null);
    d(this, "timestampPending", !1);
    d(this, "viewUniform", new Float32Array(12));
    d(this, "drawUniform", new Float32Array(Ge));
    d(this, "segmentScratch", new Float32Array(0));
    t && this.setGpu(t);
  }
  setGpu(t) {
    this.clearCachedBuffers(), this.gpu = t, this.timestampPeriod = t.timestampPeriod ?? 0, this.timestampSupported = this.timestampPeriod > 0, this.lastGpuMs = this.timestampSupported ? 0 : -1, this.init();
  }
  requestPick(t, e, s) {
    this.pickRequest = { x: t, y: e, dpr: s };
  }
  getPickId() {
    return this.lastPickId;
  }
  isPickPending() {
    return this.pickPending;
  }
  getGpuMs() {
    return this.lastGpuMs;
  }
  render(t) {
    if (!this.ready || !this.gpu) return;
    const { device: e, queue: s, context: n } = this.gpu;
    this.updateView(t), this.drawIndex = 0, this.markerIndex = 0, this.rectIndex = 0, this.strokeIndex = 0, this.trisIndex = 0;
    const r = n.getCurrentTexture().createView(), o = e.createCommandEncoder(), c = {
      colorAttachments: [
        {
          view: r,
          loadOp: "clear",
          storeOp: "store",
          clearValue: {
            r: t.background[0],
            g: t.background[1],
            b: t.background[2],
            a: t.background[3]
          }
        }
      ]
    };
    this.timestampSupported && this.timestampQuerySet && (c.timestampWrites = {
      querySet: this.timestampQuerySet,
      beginningOfPassWriteIndex: 0,
      endOfPassWriteIndex: 1
    });
    const a = o.beginRenderPass(c);
    a.setBindGroup(0, this.viewBindGroup), this.setPlotScissor(a, t), this.drawList(a, t.grid, t.viewport.dpr, !1), this.drawList(a, t.series, t.viewport.dpr, !1), this.drawList(a, t.items, t.viewport.dpr, !1), this.drawList(a, t.overlays, t.viewport.dpr, !1), a.end(), this.timestampSupported && this.timestampQuerySet && this.timestampResolveBuffer && this.timestampReadBuffer && (o.resolveQuerySet(
      this.timestampQuerySet,
      0,
      2,
      this.timestampResolveBuffer,
      0
    ), o.copyBufferToBuffer(
      this.timestampResolveBuffer,
      0,
      this.timestampReadBuffer,
      0,
      16
    )), s.submit([o.finish()]), this.timestampSupported ? this.scheduleGpuRead() : this.lastGpuMs = -1;
  }
  renderPicking(t) {
    if (!this.ready || !this.gpu || !this.pickRequest || this.pickPending) return;
    const { device: e, queue: s } = this.gpu;
    if (this.updateView(t), this.drawIndex = 0, this.markerIndex = 0, this.rectIndex = 0, this.strokeIndex = 0, this.trisIndex = 0, this.ensurePickTexture(), !this.pickView) return;
    const n = e.createCommandEncoder(), r = n.beginRenderPass({
      colorAttachments: [
        {
          view: this.pickView,
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0, g: 0, b: 0, a: 0 }
        }
      ]
    });
    r.setBindGroup(0, this.viewBindGroup), this.setPlotScissor(r, t), this.drawList(r, t.grid, t.viewport.dpr, !0), this.drawList(r, t.series, t.viewport.dpr, !0), this.drawList(r, t.items, t.viewport.dpr, !0), this.drawList(r, t.overlays, t.viewport.dpr, !0), r.end(), this.copyPickPixel(n), s.submit([n.finish()]), this.schedulePickRead();
  }
  dispose() {
    var t, e, s, n, r, o, c;
    (t = this.pickTexture) == null || t.destroy(), this.pickTexture = null, this.pickView = null, (e = this.pickReadBuffer) == null || e.destroy(), this.pickReadBuffer = null, (s = this.drawBuffer) == null || s.destroy(), (n = this.viewBuffer) == null || n.destroy(), (r = this.timestampQuerySet) == null || r.destroy(), (o = this.timestampResolveBuffer) == null || o.destroy(), (c = this.timestampReadBuffer) == null || c.destroy(), this.timestampQuerySet = null, this.timestampResolveBuffer = null, this.timestampReadBuffer = null;
    for (const a of this.drawBuffers) a.destroy();
    this.drawBuffers = [], this.drawBindGroups = [];
    for (const a of this.markerBuffers) a.destroy();
    for (const a of this.rectBuffers) a.destroy();
    for (const a of this.strokeBuffers) a.destroy();
    for (const a of this.trisBuffers) a.destroy();
    this.markerBuffers = [], this.rectBuffers = [], this.strokeBuffers = [], this.trisBuffers = [], this.markerCaps = [], this.rectCaps = [], this.strokeCaps = [], this.trisCaps = [], this.clearCachedBuffers();
  }
  clearCachedBuffers() {
    this.markerCache.clear(), this.rectCache.clear(), this.strokeCache.clear(), this.trisCache.clear();
  }
  init() {
    if (!this.gpu || this.ready) return;
    const { device: t, format: e } = this.gpu, s = t.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" }
        }
      ]
    }), n = t.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" }
        }
      ]
    });
    this.viewBindGroupLayout = s, this.drawBindGroupLayout = n;
    const r = t.createPipelineLayout({
      bindGroupLayouts: [s, n]
    });
    this.viewBuffer = t.createBuffer({
      size: this.viewUniform.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    }), this.drawBuffer = t.createBuffer({
      size: this.drawUniform.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    }), this.viewBindGroup = t.createBindGroup({
      layout: s,
      entries: [{ binding: 0, resource: { buffer: this.viewBuffer } }]
    }), this.drawBindGroup = t.createBindGroup({
      layout: n,
      entries: [{ binding: 0, resource: { buffer: this.drawBuffer } }]
    });
    const o = t.createShaderModule({ code: De }), c = t.createShaderModule({ code: We }), a = {
      color: {
        srcFactor: "src-alpha",
        dstFactor: "one-minus-src-alpha",
        operation: "add"
      },
      alpha: {
        srcFactor: "one",
        dstFactor: "one-minus-src-alpha",
        operation: "add"
      }
    }, h = new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]);
    this.quadBuffer = t.createBuffer({
      size: h.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    }), t.queue.writeBuffer(this.quadBuffer, 0, h);
    const l = new Float32Array([0, -1, 1, -1, 1, 1, 0, 1]);
    this.strokeCornerBuffer = t.createBuffer({
      size: l.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    }), t.queue.writeBuffer(this.strokeCornerBuffer, 0, l);
    const f = new Uint16Array([0, 1, 2, 0, 2, 3]);
    this.quadIndex = t.createBuffer({
      size: f.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    }), t.queue.writeBuffer(this.quadIndex, 0, f);
    const g = [
      {
        arrayStride: 8,
        stepMode: "vertex",
        attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }]
      },
      {
        arrayStride: 8,
        stepMode: "instance",
        attributes: [{ shaderLocation: 1, offset: 0, format: "float32x2" }]
      }
    ], x = [
      {
        arrayStride: 8,
        stepMode: "vertex",
        attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }]
      },
      {
        arrayStride: 16,
        stepMode: "instance",
        attributes: [{ shaderLocation: 1, offset: 0, format: "float32x4" }]
      }
    ], u = [
      {
        arrayStride: 8,
        stepMode: "vertex",
        attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }]
      },
      {
        arrayStride: 16,
        stepMode: "instance",
        attributes: [
          { shaderLocation: 1, offset: 0, format: "float32x2" },
          { shaderLocation: 2, offset: 8, format: "float32x2" }
        ]
      }
    ];
    this.pipelineMarker = t.createRenderPipeline({
      layout: r,
      vertex: {
        module: o,
        entryPoint: "vs_marker",
        buffers: g
      },
      fragment: {
        module: o,
        entryPoint: "fs_quad",
        targets: [{ format: e, blend: a }]
      },
      primitive: { topology: "triangle-list", cullMode: "none" }
    }), this.pipelineRect = t.createRenderPipeline({
      layout: r,
      vertex: { module: o, entryPoint: "vs_rect", buffers: x },
      fragment: {
        module: o,
        entryPoint: "fs_quad",
        targets: [{ format: e, blend: a }]
      },
      primitive: { topology: "triangle-list", cullMode: "none" }
    }), this.pipelineTris = t.createRenderPipeline({
      layout: r,
      vertex: {
        module: o,
        entryPoint: "vs_tris",
        buffers: [
          {
            arrayStride: 8,
            stepMode: "vertex",
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }]
          }
        ]
      },
      fragment: {
        module: o,
        entryPoint: "fs_tris",
        targets: [{ format: e, blend: a }]
      },
      primitive: { topology: "triangle-list", cullMode: "none" }
    }), this.pipelineStroke = t.createRenderPipeline({
      layout: r,
      vertex: {
        module: o,
        entryPoint: "vs_stroke",
        buffers: u
      },
      fragment: {
        module: o,
        entryPoint: "fs_stroke",
        targets: [{ format: e, blend: a }]
      },
      primitive: { topology: "triangle-list", cullMode: "none" }
    }), this.pickPipelineMarker = t.createRenderPipeline({
      layout: r,
      vertex: {
        module: c,
        entryPoint: "vs_marker",
        buffers: g
      },
      fragment: {
        module: c,
        entryPoint: "fs_pick",
        targets: [{ format: "r32uint" }]
      },
      primitive: { topology: "triangle-list", cullMode: "none" }
    }), this.pickPipelineRect = t.createRenderPipeline({
      layout: r,
      vertex: {
        module: c,
        entryPoint: "vs_rect",
        buffers: x
      },
      fragment: {
        module: c,
        entryPoint: "fs_pick",
        targets: [{ format: "r32uint" }]
      },
      primitive: { topology: "triangle-list", cullMode: "none" }
    }), this.pickPipelineStroke = t.createRenderPipeline({
      layout: r,
      vertex: {
        module: c,
        entryPoint: "vs_stroke",
        buffers: u
      },
      fragment: {
        module: c,
        entryPoint: "fs_pick",
        targets: [{ format: "r32uint" }]
      },
      primitive: { topology: "triangle-list", cullMode: "none" }
    }), this.timestampSupported && (this.timestampQuerySet = t.createQuerySet({
      type: "timestamp",
      count: 2
    }), this.timestampResolveBuffer = t.createBuffer({
      size: 16,
      usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC
    }), this.timestampReadBuffer = t.createBuffer({
      size: 16,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    })), this.ready = !0;
  }
  updateView(t) {
    if (!this.gpu || !this.viewBuffer) return;
    const e = t.viewport.dpr || 1, s = Math.max(
      1,
      Math.round(t.viewport.canvas.width * e)
    ), n = Math.max(
      1,
      Math.round(t.viewport.canvas.height * e)
    ), r = t.viewport.plot.origin.x * e, o = t.viewport.plot.origin.y * e, c = t.viewport.plot.size.width * e, a = t.viewport.plot.size.height * e, h = t.viewport.world.x.min, l = t.viewport.world.y.min, f = t.viewport.world.x.max - h || 1, g = t.viewport.world.y.max - l || 1, x = t.renderOrigin ?? {
      x: h + f * 0.5,
      y: l + g * 0.5
    };
    this.viewUniform[0] = s, this.viewUniform[1] = n, this.viewUniform[2] = r, this.viewUniform[3] = o, this.viewUniform[4] = c, this.viewUniform[5] = a, this.viewUniform[6] = h, this.viewUniform[7] = l, this.viewUniform[8] = f, this.viewUniform[9] = g, this.viewUniform[10] = x.x, this.viewUniform[11] = x.y, this.writeBuffer(this.viewBuffer, this.viewUniform), this.pickSize.w = s, this.pickSize.h = n;
  }
  ensurePickTexture() {
    var n;
    if (!this.gpu) return;
    const { device: t } = this.gpu, e = this.pickSize.w, s = this.pickSize.h;
    !e || !s || this.pickTexture && this.pickTexSize.w === e && this.pickTexSize.h === s && this.pickView || ((n = this.pickTexture) == null || n.destroy(), this.pickTexture = t.createTexture({
      size: { width: e, height: s },
      format: "r32uint",
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
    }), this.pickView = this.pickTexture.createView(), this.pickTexSize.w = e, this.pickTexSize.h = s);
  }
  setPlotScissor(t, e) {
    const s = e.viewport.dpr || 1, n = Math.max(0, Math.floor(e.viewport.plot.origin.x * s)), r = Math.max(0, Math.floor(e.viewport.plot.origin.y * s)), o = Math.max(1, Math.ceil(e.viewport.plot.size.width * s)), c = Math.max(1, Math.ceil(e.viewport.plot.size.height * s));
    t.setScissorRect(n, r, o, c);
  }
  ensurePickReadBuffer() {
    this.gpu && (this.pickReadBuffer || (this.pickReadBuffer = this.gpu.device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    })));
  }
  copyPickPixel(t) {
    if (!this.gpu || !this.pickTexture || !this.pickRequest || (this.ensurePickReadBuffer(), !this.pickReadBuffer)) return;
    const { x: e, y: s, dpr: n } = this.pickRequest, r = Math.min(
      Math.max(0, Math.floor(e * n)),
      Math.max(0, this.pickSize.w - 1)
    ), o = Math.min(
      Math.max(0, Math.floor(s * n)),
      Math.max(0, this.pickSize.h - 1)
    );
    t.copyTextureToBuffer(
      { texture: this.pickTexture, origin: { x: r, y: o } },
      { buffer: this.pickReadBuffer, bytesPerRow: 256 },
      { width: 1, height: 1, depthOrArrayLayers: 1 }
    ), this.pickRequest = null;
  }
  schedulePickRead() {
    !this.gpu || !this.pickReadBuffer || this.pickPending || (this.pickPending = !0, this.gpu.queue.onSubmittedWorkDone().then(() => this.pickReadBuffer.mapAsync(GPUMapMode.READ)).then(() => {
      const t = new Uint32Array(this.pickReadBuffer.getMappedRange());
      this.lastPickId = t[0] ?? 0, this.pickReadBuffer.unmap();
    }).catch(() => {
    }).finally(() => {
      this.pickPending = !1;
    }));
  }
  scheduleGpuRead() {
    if (!this.gpu || !this.timestampReadBuffer || this.timestampPending) return;
    this.timestampPending = !0;
    const t = this.timestampPeriod;
    this.gpu.queue.onSubmittedWorkDone().then(() => this.timestampReadBuffer.mapAsync(GPUMapMode.READ)).then(() => {
      const e = new BigUint64Array(
        this.timestampReadBuffer.getMappedRange()
      ), s = e[0] ?? 0n, n = e[1] ?? 0n;
      if (this.timestampReadBuffer.unmap(), n >= s && t > 0) {
        const r = Number(n - s);
        this.lastGpuMs = r * t / 1e6;
      } else
        this.lastGpuMs = 0;
    }).catch(() => {
    }).finally(() => {
      this.timestampPending = !1;
    });
  }
  drawList(t, e, s, n) {
    for (const r of e)
      switch (r.kind) {
        case "quad":
          r.mode === "marker" ? this.drawQuadMarkers(t, r, s, n) : this.drawQuadRects(t, r, s, n);
          break;
        case "path":
          this.drawPaths(t, r, s, n);
          break;
        case "mesh":
          this.drawMesh(t, r, s, n);
          break;
      }
  }
  drawQuadMarkers(t, e, s, n) {
    const r = n ? Math.max(e.sizePx, 4) : e.sizePx;
    this.drawInstancedQuad({
      pass: t,
      data: e.centers,
      dataBytes: e.centers.byteLength,
      primCount: e.count,
      draw: e.draw,
      resourceKey: e.resourceKey,
      revision: e.revision,
      cache: this.markerCache,
      bufferKind: "marker",
      pipeline: this.pipelineMarker,
      pickPipeline: this.pickPipelineMarker,
      uniform: {
        fill: e.fill,
        stroke: e.stroke,
        sizePx: r,
        strokeWidthPx: e.strokeWidthPx,
        opacity: e.opacity,
        roundness: e.roundness,
        pick: e.pick
      },
      dpr: s,
      picking: n
    });
  }
  drawQuadRects(t, e, s, n) {
    this.drawInstancedQuad({
      pass: t,
      data: e.rects,
      dataBytes: e.rects.byteLength,
      primCount: e.count,
      draw: e.draw,
      resourceKey: e.resourceKey,
      revision: e.revision,
      cache: this.rectCache,
      bufferKind: "rect",
      pipeline: this.pipelineRect,
      pickPipeline: this.pickPipelineRect,
      uniform: {
        fill: e.fill,
        stroke: e.stroke,
        sizePx: 0,
        strokeWidthPx: e.strokeWidthPx,
        opacity: e.opacity,
        roundness: e.roundness,
        pick: e.pick
      },
      dpr: s,
      picking: n
    });
  }
  drawInstancedQuad(t) {
    var c, a;
    if (!this.gpu) return;
    const e = t.primCount;
    if (e <= 0 || t.picking && !t.uniform.pick) return;
    let s = ((c = t.draw) == null ? void 0 : c.start) ?? 0, n = ((a = t.draw) == null ? void 0 : a.count) ?? e;
    if (s < 0 && (s = 0), s >= e || (n > e - s && (n = e - s), n <= 0)) return;
    let r;
    if (t.resourceKey != null && t.revision != null) {
      const h = this.getCachedBuffer(
        t.cache,
        t.resourceKey,
        t.dataBytes,
        t.revision
      );
      r = h.buffer, h.write && this.writeBuffer(r, t.data);
    } else
      r = this.ensureGeomBuffer(
        t.bufferKind,
        t.bufferKind === "marker" ? this.markerIndex++ : this.rectIndex++,
        t.dataBytes
      ), this.writeBuffer(r, t.data);
    const o = this.writeDrawUniform({
      fill: t.uniform.fill,
      stroke: t.uniform.stroke,
      size: t.uniform.sizePx * t.dpr,
      strokeWidth: t.uniform.strokeWidthPx * t.dpr,
      opacity: t.uniform.opacity,
      roundness: t.uniform.roundness,
      pick: t.uniform.pick
    });
    t.pass.setPipeline(t.picking ? t.pickPipeline : t.pipeline), t.pass.setBindGroup(1, o), t.pass.setVertexBuffer(0, this.quadBuffer), t.pass.setVertexBuffer(1, r), t.pass.setIndexBuffer(this.quadIndex, "uint16"), t.pass.drawIndexed(6, n, 0, 0, s);
  }
  drawPaths(t, e, s, n) {
    var g, x;
    if (!this.gpu || e.count < 2 || n) return;
    let r, o = ((g = e.draw) == null ? void 0 : g.start) ?? 0, c = ((x = e.draw) == null ? void 0 : x.count) ?? e.count;
    if (o < 0 && (o = 0), o >= e.count || (c > e.count - o && (c = e.count - o), c < 2)) return;
    const a = c - 1;
    if (a <= 0) return;
    let h = o, l = a;
    if (e.dynamic && e.draw)
      if (h = 0, l = a, e.resourceKey != null && e.revision != null) {
        const u = e.bufferBytes ?? a * 4 * 4, y = this.getCachedBuffer(
          this.strokeCache,
          e.resourceKey,
          u,
          e.revision
        );
        r = y.buffer;
        const k = this.ensureSegmentScratch(a * 4);
        this.fillSegments(e.points, o, a, k), this.writeBuffer(r, k.subarray(0, a * 4)), y.entry.count = a;
      } else {
        const u = this.ensureSegmentScratch(a * 4);
        this.fillSegments(e.points, o, a, u), r = this.ensureGeomBuffer(
          "stroke",
          this.strokeIndex++,
          u.byteLength
        ), this.writeBuffer(r, u.subarray(0, a * 4));
      }
    else {
      const y = e.count - 1;
      if (h < 0 && (h = 0), h > y - 1 || (l > y - h && (l = y - h), l <= 0)) return;
      if (e.resourceKey != null && e.revision != null) {
        const k = e.bufferBytes ?? y * 4 * 4, v = this.getCachedBuffer(
          this.strokeCache,
          e.resourceKey,
          k,
          e.revision
        );
        if (r = v.buffer, v.write || e.dynamic) {
          const b = this.ensureSegmentScratch(y * 4);
          this.fillSegments(e.points, 0, y, b), this.writeBuffer(r, b.subarray(0, y * 4)), v.entry.count = y;
        }
      } else {
        const k = this.ensureSegmentScratch(y * 4);
        this.fillSegments(e.points, 0, y, k), r = this.ensureGeomBuffer(
          "stroke",
          this.strokeIndex++,
          k.byteLength
        ), this.writeBuffer(r, k.subarray(0, y * 4));
      }
    }
    const f = this.writeDrawUniform({
      fill: e.color,
      stroke: e.color,
      size: e.widthPx * s,
      strokeWidth: 0,
      opacity: e.opacity,
      pick: void 0
    });
    if (t.setPipeline(this.pipelineStroke), t.setBindGroup(1, f), t.setVertexBuffer(0, this.strokeCornerBuffer), t.setVertexBuffer(1, r), t.setIndexBuffer(this.quadIndex, "uint16"), t.drawIndexed(6, l, 0, 0, h), e.join === "round") {
      let u;
      if (e.resourceKey != null && e.revision != null) {
        const k = this.getCachedBuffer(
          this.markerCache,
          e.resourceKey,
          e.points.byteLength,
          e.revision
        );
        u = k.buffer, k.write && this.writeBuffer(u, e.points);
      } else
        u = this.ensureGeomBuffer(
          "marker",
          this.markerIndex++,
          e.points.byteLength
        ), this.writeBuffer(u, e.points);
      const y = this.writeDrawUniform({
        fill: e.color,
        stroke: e.color,
        size: e.widthPx * s,
        strokeWidth: 0,
        opacity: e.opacity,
        roundness: 1,
        pick: void 0
      });
      t.setPipeline(this.pipelineMarker), t.setBindGroup(1, y), t.setVertexBuffer(0, this.quadBuffer), t.setVertexBuffer(1, u), t.setIndexBuffer(this.quadIndex, "uint16"), t.drawIndexed(6, c, 0, 0, o);
    }
  }
  drawMesh(t, e, s, n) {
    if (!this.gpu || e.count <= 0 || n) return;
    let r;
    if (e.resourceKey != null && e.revision != null) {
      const c = this.getCachedBuffer(
        this.trisCache,
        e.resourceKey,
        e.positions.byteLength,
        e.revision
      );
      r = c.buffer, c.write && this.writeBuffer(r, e.positions);
    } else
      r = this.ensureGeomBuffer(
        "tris",
        this.trisIndex++,
        e.positions.byteLength
      ), this.writeBuffer(r, e.positions);
    const o = this.writeDrawUniform({
      fill: e.fill,
      stroke: e.fill,
      size: 0,
      strokeWidth: 0,
      opacity: e.opacity,
      roundness: 0,
      pick: void 0
    });
    t.setPipeline(this.pipelineTris), t.setBindGroup(1, o), t.setVertexBuffer(0, r), t.draw(e.count, 1, 0, 0);
  }
  ensureGeomBuffer(t, e, s) {
    if (!this.gpu) throw new Error("GPU not ready");
    const n = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, r = this.gpu.device;
    let o, c;
    t === "marker" ? (o = this.markerBuffers, c = this.markerCaps) : t === "rect" ? (o = this.rectBuffers, c = this.rectCaps) : t === "stroke" ? (o = this.strokeBuffers, c = this.strokeCaps) : (o = this.trisBuffers, c = this.trisCaps);
    let a = o[e], h = c[e] ?? 0;
    if (!a || h < s) {
      const l = Math.max(s, h * 2, 1024);
      a = r.createBuffer({ size: l, usage: n }), o[e] = a, c[e] = l;
    }
    return a;
  }
  getCachedBuffer(t, e, s, n) {
    if (!this.gpu) throw new Error("GPU not ready");
    return t.get(this.gpu.device, e, s, n);
  }
  ensureSegmentScratch(t) {
    return this.segmentScratch.length < t && (this.segmentScratch = new Float32Array(t * 2)), this.segmentScratch;
  }
  fillSegments(t, e, s, n) {
    for (let r = 0; r < s; r++) {
      const o = (e + r) * 2, c = r * 4;
      n[c] = t[o] ?? 0, n[c + 1] = t[o + 1] ?? 0, n[c + 2] = t[o + 2] ?? 0, n[c + 3] = t[o + 3] ?? 0;
    }
  }
  writeBuffer(t, e) {
    this.gpu && this.gpu.queue.writeBuffer(
      t,
      0,
      e.buffer,
      e.byteOffset,
      e.byteLength
    );
  }
  writeDrawUniform(t) {
    var o, c;
    if (!this.gpu || !this.drawBindGroupLayout) return this.drawBindGroup;
    const e = this.drawUniform;
    e[0] = t.fill[0], e[1] = t.fill[1], e[2] = t.fill[2], e[3] = t.fill[3], e[4] = t.stroke[0], e[5] = t.stroke[1], e[6] = t.stroke[2], e[7] = t.stroke[3], e[8] = t.size, e[9] = t.strokeWidth, e[10] = t.opacity, e[11] = (o = t.pick) != null && o.perInstance ? 1 : 0, e[12] = ((c = t.pick) == null ? void 0 : c.idBase) ?? 0, e[13] = t.roundness ?? 0, e[14] = 0, e[15] = 0;
    const s = this.drawIndex++;
    let n = this.drawBuffers[s], r = this.drawBindGroups[s];
    return (!n || !r) && (n = this.gpu.device.createBuffer({
      size: this.drawUniform.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    }), r = this.gpu.device.createBindGroup({
      layout: this.drawBindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: n } }]
    }), this.drawBuffers[s] = n, this.drawBindGroups[s] = r), this.writeBuffer(n, e), r;
  }
}
const Yt = "12px IBM Plex Sans, system-ui, sans-serif";
class Xe {
  constructor(t) {
    this.canvas = t;
  }
  render(t) {
    const { dpr: e, canvas: s } = t.viewport, n = Math.max(1, Math.round(s.width * e)), r = Math.max(1, Math.round(s.height * e));
    (this.canvas.width !== n || this.canvas.height !== r) && (this.canvas.width = n, this.canvas.height = r);
    const o = this.canvas.getContext("2d");
    if (!o) return;
    o.setTransform(1, 0, 0, 1, 0, 0), o.clearRect(0, 0, this.canvas.width, this.canvas.height), o.setTransform(e, 0, 0, e, 0, 0);
    const c = t.viewport.plot;
    if (c.size.width > 0 && c.size.height > 0 && (o.strokeStyle = `rgba(${Math.round(t.borderColor[0] * 255)},${Math.round(t.borderColor[1] * 255)},${Math.round(t.borderColor[2] * 255)},${t.borderColor[3]})`, o.lineWidth = 0.5, o.strokeRect(
      c.origin.x + 0.5,
      c.origin.y + 0.5,
      c.size.width - 1,
      c.size.height - 1
    )), t.crosshair && c.size.width > 0 && c.size.height > 0) {
      const a = { x: t.crosshair.sx, y: t.crosshair.sy };
      o.save(), o.beginPath(), o.rect(c.origin.x, c.origin.y, c.size.width, c.size.height), o.clip(), o.strokeStyle = `rgba(${Math.round(t.crosshair.color[0] * 255)},${Math.round(t.crosshair.color[1] * 255)},${Math.round(t.crosshair.color[2] * 255)},${t.crosshair.color[3]})`, o.lineWidth = 0.5, o.beginPath(), o.moveTo(a.x, c.origin.y), o.lineTo(a.x, c.origin.y + c.size.height), o.moveTo(c.origin.x, a.y), o.lineTo(c.origin.x + c.size.width, a.y), o.stroke(), o.restore();
    }
    o.fillStyle = "#cfd7e3", o.font = Yt;
    for (const a of t.text) {
      switch (a.align) {
        case ut.Center:
          o.textAlign = "center", o.textBaseline = "middle";
          break;
        case ut.TopLeft:
        default:
          o.textAlign = "left", o.textBaseline = "top";
          break;
      }
      o.fillStyle = `rgba(${Math.round(a.color[0] * 255)},${Math.round(a.color[1] * 255)},${Math.round(a.color[2] * 255)},${a.color[3]})`, o.fillText(a.text, a.x, a.y);
    }
    if (t.stats) {
      const a = t.stats, h = a.gpuMs < 0 ? "gpu n/a" : `gpu ${a.gpuMs.toFixed(2)} ms`, l = `frame ${a.frameMs.toFixed(2)} ms  cpu ${a.cpuMs.toFixed(2)} ms  ${h}  ${a.fps.toFixed(0)} fps`, f = 6;
      o.textAlign = "right", o.textBaseline = "top", o.fillStyle = "rgba(210, 220, 235, 0.85)", o.fillText(
        l,
        c.origin.x + c.size.width - f,
        c.origin.y + f
      );
    }
  }
}
const Rt = 8, Ve = 1, Fe = 4;
function rt(i, t) {
  return t > i + Ve || t < i - Fe ? t : i;
}
function Oe(i) {
  const { layout: t, metricsX: e, metricsY: s, prev: n } = i, r = t.margin, o = typeof t.xAxis.size == "number" ? t.xAxis.size : Math.max(t.xAxis.min, e.maxHeight + Rt), c = typeof t.yAxis.size == "number" ? t.yAxis.size : Math.max(t.yAxis.min, s.maxWidth + Rt), a = {
    left: Math.max(r.left, c),
    right: r.right,
    top: r.top,
    bottom: Math.max(r.bottom, o)
  };
  return n ? {
    left: rt(n.left, a.left),
    right: rt(n.right, a.right),
    top: rt(n.top, a.top),
    bottom: rt(n.bottom, a.bottom)
  } : a;
}
class qe {
  constructor(t, e) {
    d(this, "lastId", 0);
    this.renderer = t, this.engine = e;
  }
  pickIdAt(t, e) {
    return this.renderer.requestPick(t, e, this.engine.view.dpr), this.engine.invalidate(q.Interaction), this.lastId = this.renderer.getPickId(), this.lastId;
  }
  isPickPending() {
    return this.renderer.isPickPending();
  }
}
class Ne {
  constructor(t) {
    d(this, "running", !1);
    d(this, "raf", 0);
    d(this, "frameRequested", !1);
    d(this, "ro", null);
    d(this, "picker");
    d(this, "lastFrame", 0);
    d(this, "resizeTarget", null);
    d(this, "pendingLayout", null);
    d(this, "appliedLayout", null);
    d(this, "axisMetrics", null);
    d(this, "axisGutters", null);
    d(this, "textCtx", null);
    d(this, "_listeners", null);
    d(this, "loop", () => {
      if (!this.running) return;
      this.frameRequested = !1;
      const t = performance.now(), e = this.lastFrame ? t - this.lastFrame : 0;
      this.lastFrame = t, this.pendingLayout && (this.applyLayout(this.pendingLayout), this.pendingLayout = null);
      const s = performance.now(), n = this.args.sceneBuilder.build({
        model: this.args.engine.model,
        engine: this.args.engine,
        measureText: this.measureText
      }), r = performance.now() - s;
      this.args.engine.setPickTable(n.pickTable ?? null), n.axisMetrics && (this.axisMetrics = n.axisMetrics, this.maybeUpdateLayoutFromMetrics(n.axisMetrics)), n.pickTable && n.pickTable.length > 1 && this.args.rendererGpu.renderPicking(n), this.args.rendererGpu.render(n);
      const o = performance.now() - t, c = this.args.rendererGpu.getGpuMs();
      n.stats = {
        fps: e > 0 ? 1e3 / e : 0,
        frameMs: o,
        cpuMs: r,
        gpuMs: c
      }, this.args.rendererText.render(n), this.args.engine.resetDirty();
    });
    d(this, "measureText", (t) => {
      const e = this.textCtx ?? (this.textCtx = this.args.textCanvas.getContext("2d"));
      if (!e) return { width: t.text.length * 6, height: 12 };
      e.font = Yt;
      const s = e.measureText(t.text), n = (s.actualBoundingBoxAscent ?? 9) + (s.actualBoundingBoxDescent ?? 3);
      return { width: s.width, height: n || 12 };
    });
    this.args = t, this.picker = new qe(this.args.rendererGpu, this.args.engine), this.args.engine.setPicker(this.picker), this.args.engine.onInvalidate = () => this.requestFrame();
  }
  start() {
    this.running || (this.running = !0, this.attach(), this.updateLayout(), this.requestFrame());
  }
  stop() {
    this.running = !1, cancelAnimationFrame(this.raf);
  }
  dispose() {
    this.stop(), this.detach(), this.args.engine.onInvalidate = null;
  }
  requestFrame() {
    this.running && (this.frameRequested || (this.frameRequested = !0, this.raf = requestAnimationFrame(this.loop)));
  }
  attach() {
    const t = this.args.primaryCanvas, e = (a) => {
      const h = a;
      this.args.engine.pointerMove(h.offsetX, h.offsetY, this.modsFrom(h)), this.requestFrame();
    }, s = (a) => {
      const h = a, l = h.button === 2 ? "right" : "left";
      this.args.engine.pointerDown(
        l,
        h.offsetX,
        h.offsetY,
        this.modsFrom(h)
      ), this.requestFrame();
    }, n = (a) => {
      const h = a, l = h.button === 2 ? "right" : "left";
      this.args.engine.pointerUp(
        l,
        h.offsetX,
        h.offsetY,
        this.modsFrom(h)
      ), this.requestFrame();
    }, r = (a) => {
      const h = a;
      this.args.engine.wheel(
        h.deltaY,
        h.offsetX,
        h.offsetY,
        this.modsFrom(h)
      ), this.requestFrame();
    }, o = (a) => {
      const h = a;
      this.args.engine.doubleClick(h.offsetX, h.offsetY, this.modsFrom(h)), this.requestFrame();
    }, c = () => this.args.engine.pointerLeave();
    t.addEventListener("pointermove", e), t.addEventListener("pointerdown", s), t.addEventListener("pointerup", n), t.addEventListener("wheel", r, { passive: !0 }), t.addEventListener("dblclick", o), t.addEventListener("pointerleave", c), this.resizeTarget = t.parentElement ?? t, this.ro = new ResizeObserver(() => this.updateLayout()), this.ro.observe(this.resizeTarget), this._listeners = [
      ["pointermove", e],
      ["pointerdown", s],
      ["pointerup", n],
      ["wheel", r],
      ["dblclick", o],
      ["pointerleave", c]
    ];
  }
  detach() {
    var e;
    const t = this.args.primaryCanvas;
    if (this._listeners) {
      for (const [s, n] of this._listeners)
        t.removeEventListener(s, n);
      this._listeners = null;
    }
    (e = this.ro) == null || e.disconnect(), this.ro = null, this.resizeTarget = null;
  }
  updateLayout() {
    const t = this.args.primaryCanvas, s = (t.parentElement ?? t).getBoundingClientRect(), n = window.devicePixelRatio || 1, r = this.computeLayout(
      s.width,
      s.height,
      n,
      this.axisMetrics ?? void 0
    ), o = this.pendingLayout ?? this.appliedLayout;
    o && this.sameLayout(o, r) || (this.pendingLayout = r, this.requestFrame());
  }
  computeLayout(t, e, s, n) {
    const r = this.args.engine.model.config, o = r.layout.margin, c = n ? Oe({
      layout: r.layout,
      metricsX: n.x,
      metricsY: n.y,
      prev: this.axisGutters ?? void 0
    }) : {
      left: o.left,
      right: o.right,
      top: o.top,
      bottom: o.bottom
    };
    n && (this.axisGutters = c);
    const a = Math.max(1, t - c.left - c.right), h = Math.max(1, e - c.top - c.bottom);
    return {
      dpr: s,
      canvas: { width: t, height: e },
      plot: {
        origin: { x: c.left, y: c.top },
        size: { width: a, height: h }
      }
    };
  }
  sameLayout(t, e) {
    return t.dpr === e.dpr && t.canvas.width === e.canvas.width && t.canvas.height === e.canvas.height && t.plot.origin.x === e.plot.origin.x && t.plot.origin.y === e.plot.origin.y && t.plot.size.width === e.plot.size.width && t.plot.size.height === e.plot.size.height;
  }
  applyLayout(t) {
    const e = t.dpr, s = this.args.primaryCanvas, n = this.args.textCanvas, r = `${t.canvas.width}px`, o = `${t.canvas.height}px`;
    s.style.width !== r && (s.style.width = r), s.style.height !== o && (s.style.height = o), n.style.width !== r && (n.style.width = r), n.style.height !== o && (n.style.height = o);
    const c = Math.max(1, Math.round(t.canvas.width * e)), a = Math.max(1, Math.round(t.canvas.height * e));
    s.width !== c && (s.width = c), s.height !== a && (s.height = a), n.width !== c && (n.width = c), n.height !== a && (n.height = a), this.appliedLayout = t, this.args.engine.dispatch({ type: "VIEW/SET_LAYOUT", layout: t, emit: !0 });
  }
  modsFrom(t) {
    return {
      shift: t.shiftKey,
      ctrl: t.ctrlKey,
      alt: t.altKey,
      meta: t.metaKey
    };
  }
  maybeUpdateLayoutFromMetrics(t) {
    const e = this.pendingLayout ?? this.appliedLayout;
    if (!e) return;
    const s = this.computeLayout(
      e.canvas.width,
      e.canvas.height,
      e.dpr,
      t
    );
    this.sameLayout(e, s) || (this.pendingLayout = s, this.requestFrame());
  }
}
class $e {
  constructor(t) {
    d(this, "view", {
      set: (t) => this.impl.engine.dispatch({
        type: "VIEW/SET_RANGES",
        x: t.x,
        y: t.y,
        emit: !0
      }),
      reset: () => this.impl.engine.dispatch({ type: "VIEW/RESET", emit: !0 })
    });
    d(this, "style", {
      config: (t) => this.impl.engine.dispatch({ type: "MODEL/SET_CONFIG", patch: t })
    });
    d(this, "series", {
      add: (t, e, s) => {
        const n = this.impl.model.addSeries(t, e, s);
        return this.impl.engine.invalidate(q.Series), n;
      },
      append: (t, e) => {
        const s = this.impl.model.append(t, e);
        return s && this.impl.engine.invalidate(q.Series), s;
      },
      set: (t, e) => {
        const s = this.impl.model.setSeriesData(t, e);
        return s && this.impl.engine.invalidate(q.Series), s;
      },
      write: (t, e) => {
        const s = this.impl.model.writeSeriesData(t, e);
        return s && this.impl.engine.invalidate(q.Series), s;
      },
      visible: (t, e) => this.impl.engine.dispatch({
        type: "MODEL/SET_SERIES_VISIBLE",
        id: t,
        on: e
      }),
      list: () => this.impl.model.listSeries(),
      datum: (t, e) => this.impl.model.getDatum(t, e)
    });
    d(this, "items", {
      add: (t, e) => {
        const s = this.impl.model.addItem(t, e);
        return this.impl.engine.invalidate(q.Items), s;
      },
      update: (t, e) => {
        const s = this.impl.model.updateItem(t, e);
        return s && this.impl.engine.invalidate(q.Items), s;
      },
      remove: (t) => {
        const e = this.impl.model.removeItem(t);
        return e && this.impl.engine.invalidate(q.Items), e;
      },
      list: () => this.impl.model.listItems(),
      get: (t) => this.impl.model.getItem(t)
    });
    d(this, "actions", {
      setEnabled: (t) => this.impl.engine.setActionsEnabled(t)
    });
    d(this, "coords", {
      screenToWorld: (t, e) => this.impl.engine.screenToWorld(t, e),
      plotRect: () => ({ ...this.impl.engine.view.plot })
    });
    this.impl = t;
  }
  start() {
    this.impl.runtime.start();
  }
  stop() {
    this.impl.runtime.stop();
  }
  dispose() {
    this.impl.runtime.dispose();
  }
  subscribe(t, e) {
    return this.impl.engine.events.subscribe(t, e);
  }
}
function Qe(i) {
  const t = i.seriesRegistry ?? new Ot();
  i.seriesRegistry || (t.register(Nt), t.register($t), t.register(Kt), t.register(Qt), t.register(jt), t.register(Jt));
  const e = i.itemRegistry ?? new qt();
  i.itemRegistry || (e.register(Zt), e.register(te), e.register(ee), e.register(ie), e.register(se));
  const s = new re({
    registry: t,
    itemRegistry: e,
    initialWorld: i.initialWorld,
    config: i.config
  }), n = [
    new Le(),
    new _e(),
    new Ae(),
    new Ee(),
    new Ue()
  ], r = i.tools ?? n, o = {
    world: { x: { ...i.initialWorld.x }, y: { ...i.initialWorld.y } },
    dpr: 1,
    canvas: { width: 1, height: 1 },
    plot: { origin: { x: 0, y: 0 }, size: { width: 1, height: 1 } }
  }, c = new Re({ model: s, initialViewport: o, tools: r }), a = new Ie(), h = new ze(i.gpu ?? null);
  i.gpu || Ye(i.canvas).then((g) => {
    g && (h.setGpu(g), c.invalidate(q.View | q.Layout));
  });
  const l = new Xe(i.textCanvas), f = new Ne({
    primaryCanvas: i.canvas,
    textCanvas: i.textCanvas,
    engine: c,
    sceneBuilder: a,
    rendererGpu: h,
    rendererText: l
  });
  return i.link && i.link.group.register(c, i.link), new $e({ engine: c, runtime: f, model: s });
}
export {
  $e as Plot,
  Qe as createPlot
};
