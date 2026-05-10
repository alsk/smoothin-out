// Each preset is a list of anchors: { x, y, hIn:{dx,dy}|null, hOut:{dx,dy}|null }
// The first/last anchor are the start/end (0,0)/(1,1) and only have one side.

const cb = (cp1x, cp1y, cp2x, cp2y) => [
  { x: 0, y: 0, hIn: null, hOut: { dx: cp1x, dy: cp1y } },
  { x: 1, y: 1, hIn: { dx: cp2x - 1, dy: cp2y - 1 }, hOut: null },
];

// Catmull-Rom-to-Bezier smoothing for a polyline of points.
// Returns anchors with handles set so the curve passes through every point.
function smoothPolyline(points, tension = 0.5) {
  const n = points.length;
  const anchors = points.map((p) => ({
    x: p.x,
    y: p.y,
    hIn: null,
    hOut: null,
  }));
  for (let i = 0; i < n; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(n - 1, i + 1)];
    const dx = (next.x - prev.x) * tension * (1 / 3);
    const dy = (next.y - prev.y) * tension * (1 / 3);
    if (i > 0) anchors[i].hIn = { dx: -dx, dy: -dy };
    if (i < n - 1) anchors[i].hOut = { dx, dy };
  }
  return anchors;
}

// Quadratic-piecewise bounce sampled then smoothed.
function bounceOutSamples() {
  const f = (x) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) {
      const xx = x - 1.5 / d1;
      return n1 * xx * xx + 0.75;
    }
    if (x < 2.5 / d1) {
      const xx = x - 2.25 / d1;
      return n1 * xx * xx + 0.9375;
    }
    const xx = x - 2.625 / d1;
    return n1 * xx * xx + 0.984375;
  };
  // Anchors at the bottoms (touch points) and the peaks of each bump.
  const xs = [
    0,
    1 / 2.75 * 0.5,
    1 / 2.75,
    1.5 / 2.75,
    2 / 2.75,
    2.25 / 2.75,
    2.5 / 2.75,
    2.625 / 2.75,
    1,
  ];
  return xs.map((x) => ({ x, y: f(x) }));
}

function findLocalExtrema(f) {
  // Sample densely, keep only points where the derivative changes sign.
  const N = 600;
  const ys = Array.from({ length: N + 1 }, (_, i) => f(i / N));
  const pts = [{ x: 0, y: ys[0] }];
  for (let i = 1; i < N; i++) {
    if ((ys[i] - ys[i - 1]) * (ys[i + 1] - ys[i]) < 0) {
      pts.push({ x: i / N, y: ys[i] });
    }
  }
  pts.push({ x: 1, y: ys[N] });
  return pts;
}

function elasticOutSamples() {
  const p = 0.3;
  const f = (x) => {
    if (x === 0) return 0;
    if (x === 1) return 1;
    return Math.pow(2, -10 * x) * Math.sin(((x - p / 4) * (2 * Math.PI)) / p) + 1;
  };
  return findLocalExtrema(f);
}

// inOut from in: y(x) = in(2x)/2 for x<.5 ; 1 - in(2-2x)/2 for x>=.5
// We model these with cubic-bezier approximations (single segment) using the
// canonical Penner-equivalent control points.

export const PRESETS = {
  none: { variants: { default: cb(0, 0, 1, 1) } },

  power1: {
    variants: {
      in: cb(0.55, 0.085, 0.68, 0.53),
      out: cb(0.25, 0.46, 0.45, 0.94),
      inOut: cb(0.455, 0.03, 0.515, 0.955),
    },
  },
  power2: {
    variants: {
      in: cb(0.55, 0.055, 0.675, 0.19),
      out: cb(0.215, 0.61, 0.355, 1),
      inOut: cb(0.645, 0.045, 0.355, 1),
    },
  },
  power3: {
    variants: {
      in: cb(0.895, 0.03, 0.685, 0.22),
      out: cb(0.165, 0.84, 0.44, 1),
      inOut: cb(0.77, 0, 0.175, 1),
    },
  },
  power4: {
    variants: {
      in: cb(0.755, 0.05, 0.855, 0.06),
      out: cb(0.23, 1, 0.32, 1),
      inOut: cb(0.86, 0, 0.07, 1),
    },
  },
  back: {
    variants: {
      in: cb(0.6, -0.28, 0.735, 0.045),
      out: cb(0.175, 0.885, 0.32, 1.275),
      inOut: cb(0.68, -0.55, 0.265, 1.55),
    },
  },
  bounce: {
    variants: {
      out: smoothPolyline(bounceOutSamples(), 0.4),
    },
  },
  circ: {
    variants: {
      in: cb(0.6, 0.04, 0.98, 0.335),
      out: cb(0.075, 0.82, 0.165, 1),
      inOut: cb(0.785, 0.135, 0.15, 0.86),
    },
  },
  elastic: {
    variants: {
      out: smoothPolyline(elasticOutSamples(), 0.5),
      in: smoothPolyline(
        elasticOutSamples().map((p) => ({ x: 1 - p.x, y: 1 - p.y })).reverse(),
        0.5
      ),
    },
  },
  expo: {
    variants: {
      in: cb(0.95, 0.05, 0.795, 0.035),
      out: cb(0.19, 1, 0.22, 1),
      inOut: cb(1, 0, 0, 1),
    },
  },
  sine: {
    variants: {
      in: cb(0.47, 0, 0.745, 0.715),
      out: cb(0.39, 0.575, 0.565, 1),
      inOut: cb(0.445, 0.05, 0.55, 0.95),
    },
  },
  bump: {
    variants: {
      out: [
        { x: 0,    y: 0,    hIn: null,                       hOut: { dx: 0.007, dy: 0.72 } },
        { x: 0.13, y: 1.1,  hIn: { dx: -0.05, dy: -0.055 }, hOut: { dx: 0.08,  dy: -0.068 } },
        { x: 1,    y: 1,    hIn: { dx: -0.58, dy: 0 },      hOut: null },
      ],
      soft: [
        { x: 0,    y: 0,    hIn: null,                        hOut: { dx: 0.05, dy: 0.06 } },
        { x: 0.21, y: 1.05, hIn: { dx: -0.1,  dy: -0.075 },  hOut: { dx: 0.08, dy: -0.056 } },
        { x: 1,    y: 1,    hIn: { dx: -0.58, dy: 0 },       hOut: null },
      ],
    },
  },
  // Single clean overshoot — Framer Motion default spring approximation.
  // Peaks later and higher than back.out, then settles horizontally.
  settle: {
    variants: {
      out: cb(0.34, 1.56, 0.64, 1),
    },
  },
  // Physical momentum / inertia: very high initial velocity, long coasting tail.
  // Reaches ~50% in the first 6% of time, then decelerates slowly.
  drift: {
    variants: {
      out: smoothPolyline([
        { x: 0,    y: 0 },
        { x: 0.06, y: 0.5 },
        { x: 0.18, y: 0.78 },
        { x: 0.42, y: 0.93 },
        { x: 0.72, y: 0.99 },
        { x: 1,    y: 1 },
      ], 0.38),
    },
  },
  // Ultra-crisp ease — sharper than expo, inspired by Framer Motion tween timing.
  swift: {
    variants: {
      in:    cb(0.9,  0.1, 0.94, 0.06),
      out:   cb(0.06, 0.9, 0.1,  1),
      inOut: cb(0.76, 0,   0.24, 1),
    },
  },
  snap: {
    variants: {
      inOut: [
        { x: 0,     y: 0,     hIn: null,                        hOut: { dx: 0.244, dy: 0 } },
        { x: 0.28,  y: 0.856, hIn: { dx: -0.087, dy: -0.134 }, hOut: { dx: 0.072, dy: 0.11 } },
        { x: 1,     y: 1,     hIn: { dx: -0.626, dy: 0 },       hOut: null },
      ],
      out: [
        { x: 0,     y: 0,     hIn: null,                        hOut: { dx: 0.01, dy: 0.627 } },
        { x: 0.131, y: 0.864, hIn: { dx: -0.056, dy: -0.068 }, hOut: { dx: 0.093, dy: 0.113 } },
        { x: 1,     y: 1,     hIn: { dx: -0.626, dy: 0 },       hOut: null },
      ],
      soft: [
        { x: 0,     y: 0,     hIn: null,                        hOut: { dx: 0.06, dy: 0.056 } },
        { x: 0.191, y: 0.859, hIn: { dx: -0.168, dy: -0.173 }, hOut: { dx: 0.109, dy: 0.112 } },
        { x: 1,     y: 1,     hIn: { dx: -0.626, dy: 0 },       hOut: null },
      ],
    },
  },
};

export const CORE_NAMES = [
  "snap",
  "bump",
  "none",
  "power1",
  "power2",
  "power3",
  "power4",
  "back",
  "bounce",
  "circ",
  "elastic",
  "settle",
  "drift",
  "swift",
  "expo",
  "sine",
];

// Display label for a (preset, variant) pair, matching the "inSine / outSine /
// inOutSine" convention. `none` and `steps` are special-cased.
function formatLabel(name, variant) {
  if (name === "none") return "none";
  if (name === "steps") return `steps${variant}`;
  if (variant === "default") return name;
  // variant is "in" | "out" | "inOut"
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  return `${variant}${cap}`;
}

// Order in which to flatten presets into a single grid.
// Within each preset, prefer in → out → inOut.
const VARIANT_ORDER = ["in", "out", "inOut", "soft", "default"];

export function flattenPresets() {
  const out = [];
  for (const name of CORE_NAMES) {
    const preset = PRESETS[name];
    if (!preset) continue;
    const variantKeys = Object.keys(preset.variants);
    const ordered = [...variantKeys].sort((a, b) => {
      const ia = VARIANT_ORDER.indexOf(a);
      const ib = VARIANT_ORDER.indexOf(b);
      const sa = ia === -1 ? 100 : ia;
      const sb = ib === -1 ? 100 : ib;
      if (sa !== sb) return sa - sb;
      return a.localeCompare(b);
    });
    for (const v of ordered) {
      out.push({
        name,
        variant: v,
        key: `${name}.${v}`,
        label: formatLabel(name, v),
        anchors: preset.variants[v],
      });
    }
  }
  return out;
}

const _first = flattenPresets()[0];
export const DEFAULT_ANCHORS = _first.anchors;
export const DEFAULT_ACTIVE_KEY = _first.key;
