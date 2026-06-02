import { Skia, type SkPath } from "@shopify/react-native-skia";

export const ROAD_IMG_W = 1536;
export const ROAD_IMG_H = 1024;
export const ROAD_IMG_ASPECT = ROAD_IMG_W / ROAD_IMG_H;

export interface BezierSeg {
  c1: [number, number];
  c2: [number, number];
  end: [number, number];
  depth: number;
  loopPhase?: { from: number; to: number };
}

export interface RoadPath {
  start: [number, number];
  startDepth: number;
  segments: BezierSeg[];
}

/**
 * Portrait centerline traced on portrait/L0_far.png (1536×1024).
 * Includes the wide left sweep (x≈0.05, off-frame on phone) before the loop.
 */
export const PORTRAIT_ROAD: RoadPath = {
  start: [0.487, 0.039],
  startDepth: 0.05,
  segments: [
    { c1: [0.493, 0.045], c2: [0.524, 0.06], end: [0.521, 0.078], depth: 0.08 },
    { c1: [0.518, 0.096], c2: [0.499, 0.118], end: [0.469, 0.146], depth: 0.12 },
    { c1: [0.439, 0.174], c2: [0.404, 0.211], end: [0.339, 0.244], depth: 0.2 },
    { c1: [0.274, 0.277], c2: [0.127, 0.314], end: [0.078, 0.342], depth: 0.28 },
    { c1: [0.029, 0.37], c2: [0.048, 0.386], end: [0.046, 0.41], depth: 0.34 },
    { c1: [0.044, 0.434], c2: [0.047, 0.462], end: [0.065, 0.488], depth: 0.38 },
    { c1: [0.083, 0.514], c2: [0.123, 0.54], end: [0.156, 0.566], depth: 0.44 },
    { c1: [0.189, 0.592], c2: [0.23, 0.619], end: [0.26, 0.645], depth: 0.5 },
    { c1: [0.291, 0.671], c2: [0.315, 0.697], end: [0.339, 0.723], depth: 0.56 },
    { c1: [0.363, 0.749], c2: [0.387, 0.775], end: [0.404, 0.801], depth: 0.62 },
    { c1: [0.421, 0.827], c2: [0.435, 0.856], end: [0.443, 0.879], depth: 0.72 },
    { c1: [0.451, 0.902], c2: [0.43, 0.961], end: [0.454, 0.938], depth: 0.85 },
    {
      c1: [0.478, 0.915],
      c2: [0.589, 0.81],
      end: [0.589, 0.742],
      depth: 0.65,
      loopPhase: { from: 0, to: 0.25 },
    },
    {
      c1: [0.589, 0.674],
      c2: [0.499, 0.532],
      end: [0.454, 0.532],
      depth: 0.42,
      loopPhase: { from: 0.25, to: 0.5 },
    },
    {
      c1: [0.409, 0.532],
      c2: [0.318, 0.674],
      end: [0.318, 0.742],
      depth: 0.65,
      loopPhase: { from: 0.5, to: 0.75 },
    },
    {
      c1: [0.318, 0.81],
      c2: [0.401, 0.918],
      end: [0.454, 0.938],
      depth: 0.85,
      loopPhase: { from: 0.75, to: 1 },
    },
    { c1: [0.507, 0.957], c2: [0.575, 0.892], end: [0.638, 0.859], depth: 0.55 },
    { c1: [0.701, 0.826], c2: [0.8, 0.761], end: [0.833, 0.742], depth: 0.25 },
  ],
};

export const PORTRAIT_LOOP_CENTER: [number, number] = [0.454, 0.738];

/** Hand-traced path from portrait/L0_far.png (two segments — road exits then re-enters). */
export const PORTRAIT_PATH_SVG =
  "M 828.69 102.96 " +
  "C 824.99 103.71 813.90 106.01 806.50 107.48 " +
  "C 799.10 108.95 791.72 110.36 784.29 111.80 " +
  "C 776.86 113.23 769.39 114.66 761.93 116.10 " +
  "C 754.47 117.54 746.97 118.98 739.53 120.42 " +
  "C 732.10 121.86 724.76 123.29 717.31 124.75 " +
  "C 709.86 126.21 702.35 127.68 694.86 129.18 " +
  "C 687.36 130.67 679.77 132.20 672.32 133.72 " +
  "C 664.87 135.24 657.55 136.75 650.16 138.30 " +
  "C 642.77 139.86 635.37 141.44 627.96 143.07 " +
  "C 620.56 144.69 613.15 146.34 605.73 148.08 " +
  "C 598.32 149.82 590.78 151.59 583.45 153.50 " +
  "C 576.13 155.41 568.95 157.16 561.78 159.53 " +
  "C 554.61 161.90 546.37 163.83 540.43 167.74 " +
  "C 534.49 171.64 525.85 177.85 526.13 182.97 " +
  "C 526.42 188.10 536.41 193.65 542.14 198.50 " +
  "C 547.88 203.36 554.09 208.17 560.55 212.10 " +
  "C 567.00 216.03 573.96 218.98 580.87 222.09 " +
  "C 587.78 225.19 594.95 227.91 602.00 230.73 " +
  "C 609.05 233.55 616.12 236.22 623.19 239.01 " +
  "C 630.25 241.79 637.37 244.53 644.39 247.45 " +
  "C 651.40 250.37 658.44 253.23 665.29 256.51 " +
  "C 672.14 259.79 679.54 262.71 685.46 267.14 " +
  "C 691.39 271.58 700.46 277.60 700.82 283.13 " +
  "C 701.18 288.65 693.15 295.61 687.64 300.31 " +
  "C 682.13 305.00 674.49 307.96 667.74 311.31 " +
  "C 661.00 314.65 654.17 317.48 647.17 320.39 " +
  "C 640.17 323.31 632.88 326.10 625.75 328.80 " +
  "C 618.61 331.50 611.52 334.05 604.37 336.61 " +
  "C 597.21 339.17 590.00 341.65 582.82 344.16 " +
  "C 575.64 346.67 568.39 349.07 561.29 351.67 " +
  "C 554.20 354.27 543.75 358.41 540.24 359.76 " +
  "M 546.25 816.88 " +
  "C 576.03 819.01 669.85 846.59 724.93 829.70 " +
  "C 780.02 812.80 844.72 766.06 876.77 715.52 " +
  "C 908.82 664.97 925.78 571.96 917.23 526.42 " +
  "C 908.69 480.88 866.29 448.10 825.49 442.29 " +
  "C 784.69 436.48 703.50 463.06 672.45 491.57 " +
  "C 641.40 520.08 627.71 561.48 639.20 613.36 " +
  "C 650.68 665.24 693.82 766.13 741.36 802.85 " +
  "C 788.90 839.58 880.91 831.63 924.44 833.70 " +
  "C 967.98 835.77 989.55 818.35 1002.57 815.27";

/** When true, buildRoadPath / buildRoadSamples read PORTRAIT_PATH_SVG (supports multi-segment traces). */
export const USE_TRACED_SVG_PATH = true;

export interface RoadSample {
  x: number;
  y: number;
  angle: number;
  loopPhase: number;
  /** Screen-plane roll (radians) for the loop-the-loop. 0 = upright. */
  roll: number;
  /** Opacity multiplier — fades to 0 on the off-screen gap ramps. */
  alpha: number;
  /** 1 = back-facing frames allowed, 0 = forbid backs (segment 1). */
  allowBack: number;
}

// ---------------------------------------------------------------------------
// Loop + off-screen transition tuning (segment 2 = second SVG sub-path)
// ---------------------------------------------------------------------------
/** Loop window within segment 2 (arc-length fraction) where the avatar rolls. */
const LOOP_START_FRAC = 0.13;
const LOOP_END_FRAC = 0.8;
/** Length of the off-screen ride-out after segment 1, as fraction of max(W,H). */
const SEG1_EXIT_FRAC = 0.32;
/** Length of the off-screen glide-in before segment 2, as fraction of max(W,H). */
const SEG2_ENTRY_FRAC = 0.32;

/** Manual nudge applied after the cover-fit matrix (tweak in RainbowRoadBackground). */
export interface PathManualAdjust {
  offsetX: number;
  offsetY: number;
  scale: number;
  /** 0..1 — keep only this fraction of SVG subpath index 1 (second M segment). */
  segment2EndT?: number;
  /** Off-screen exit after segment 2, as fraction of max(screenW, screenH). 0 = disabled. */
  exitExtension?: number;
}

export const DEFAULT_PATH_ADJUST: PathManualAdjust = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  segment2EndT: 1,
  exitExtension: 0,
};

export interface RoadSamplesResult {
  samples: RoadSample[];
  /** Normalized t [0,1] where traced road ends; beyond this the avatar rides off-screen. */
  roadEndT: number;
}

function coverSrcRect(screenW: number, screenH: number) {
  if (screenW <= 0 || screenH <= 0) {
    return { x: 0, y: 0, width: ROAD_IMG_W, height: ROAD_IMG_H };
  }
  let srcW: number;
  let srcH: number;
  if (screenW / screenH > ROAD_IMG_ASPECT) {
    srcW = ROAD_IMG_W;
    srcH = (ROAD_IMG_W * screenH) / screenW;
  } else {
    srcW = (ROAD_IMG_H * screenW) / screenH;
    srcH = ROAD_IMG_H;
  }
  return {
    x: (ROAD_IMG_W - srcW) / 2,
    y: (ROAD_IMG_H - srcH) / 2,
    width: srcW,
    height: srcH,
  };
}

/** Cover-fit matrix terms (translate then uniform scale on image pixels). */
export function getCoverTransform(screenW: number, screenH: number) {
  const src = coverSrcRect(screenW, screenH);
  const scale = screenW / src.width;
  return {
    offsetX: -src.x * scale,
    offsetY: -src.y * scale,
    scale,
  };
}

/** Map normalized image coord → screen pixel (matches Skia Image fit="cover"). */
export function imageToScreen(
  imgX: number,
  imgY: number,
  screenW: number,
  screenH: number,
  adjust: PathManualAdjust = DEFAULT_PATH_ADJUST,
): [number, number] {
  const { offsetX, offsetY, scale } = getCoverTransform(screenW, screenH);
  const px = imgX * ROAD_IMG_W;
  const py = imgY * ROAD_IMG_H;
  const s = scale * adjust.scale;
  return [
    px * s + offsetX + adjust.offsetX,
    py * s + offsetY + adjust.offsetY,
  ];
}

/** Inverse of imageToScreen — screen tap → 1536×1024 image pixel. */
export function screenToImagePixel(
  screenX: number,
  screenY: number,
  screenW: number,
  screenH: number,
  adjust: PathManualAdjust = DEFAULT_PATH_ADJUST,
): [number, number] {
  const { offsetX, offsetY, scale } = getCoverTransform(screenW, screenH);
  const s = scale * adjust.scale;
  if (s === 0) return [0, 0];
  return [
    (screenX - offsetX - adjust.offsetX) / s,
    (screenY - offsetY - adjust.offsetY) / s,
  ];
}

/** Map image pixel → screen for trace overlay (cover fit only, no path nudge). */
export function imagePixelToScreen(
  imgPx: number,
  imgPy: number,
  screenW: number,
  screenH: number,
): [number, number] {
  return imageToScreen(imgPx / ROAD_IMG_W, imgPy / ROAD_IMG_H, screenW, screenH);
}

function remapPath(
  road: RoadPath,
  screenW: number,
  screenH: number,
  adjust: PathManualAdjust = DEFAULT_PATH_ADJUST,
): RoadPath {
  const map = (pt: [number, number]): [number, number] => {
    const [sx, sy] = imageToScreen(pt[0], pt[1], screenW, screenH, adjust);
    return [sx / screenW, sy / screenH];
  };
  return {
    start: map(road.start),
    startDepth: road.startDepth,
    segments: road.segments.map((seg) => ({
      c1: map(seg.c1),
      c2: map(seg.c2),
      end: map(seg.end),
      depth: seg.depth,
      loopPhase: seg.loopPhase,
    })),
  };
}

function bezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const omt = 1 - t;
  return (
    omt * omt * omt * p0 +
    3 * omt * omt * t * p1 +
    3 * omt * t * t * p2 +
    t * t * t * p3
  );
}

function bezierD(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const omt = 1 - t;
  return (
    3 * omt * omt * (p1 - p0) +
    6 * omt * t * (p2 - p1) +
    3 * t * t * (p3 - p2)
  );
}

function buildArcLengths(path: RoadPath, w: number, h: number, samplesPerSeg = 28): number[] {
  const cum = [0];
  let total = 0;
  let prev = path.start;
  for (const seg of path.segments) {
    let segLen = 0;
    let prevX = prev[0] * w;
    let prevY = prev[1] * h;
    for (let j = 1; j <= samplesPerSeg; j++) {
      const u = j / samplesPerSeg;
      const sx = bezier(u, prev[0], seg.c1[0], seg.c2[0], seg.end[0]) * w;
      const sy = bezier(u, prev[1], seg.c1[1], seg.c2[1], seg.end[1]) * h;
      segLen += Math.hypot(sx - prevX, sy - prevY);
      prevX = sx;
      prevY = sy;
    }
    total += segLen;
    cum.push(total);
    prev = seg.end;
  }
  return cum;
}

function pointAt(
  path: RoadPath,
  cum: number[],
  t: number,
  w: number,
  h: number,
): RoadSample {
  const total = cum[cum.length - 1] ?? 1;
  const target = Math.max(0, Math.min(1, t)) * total;
  let i = 0;
  for (let k = 1; k < cum.length; k++) {
    const v = cum[k];
    if (v !== undefined && v >= target) {
      i = k - 1;
      break;
    }
    i = k - 1;
  }
  const segStart = i === 0 ? path.start : path.segments[i - 1]!.end;
  const seg = path.segments[i]!;
  const lenStart = cum[i] ?? 0;
  const lenEnd = cum[i + 1] ?? lenStart;
  const span = Math.max(1, lenEnd - lenStart);
  const u = (target - lenStart) / span;
  const x = bezier(u, segStart[0], seg.c1[0], seg.c2[0], seg.end[0]) * w;
  const y = bezier(u, segStart[1], seg.c1[1], seg.c2[1], seg.end[1]) * h;
  const dx = bezierD(u, segStart[0], seg.c1[0], seg.c2[0], seg.end[0]) * w;
  const dy = bezierD(u, segStart[1], seg.c1[1], seg.c2[1], seg.end[1]) * h;
  let loopPhase = -1;
  if (seg.loopPhase !== undefined) {
    loopPhase = seg.loopPhase.from + (seg.loopPhase.to - seg.loopPhase.from) * u;
  }
  return { x, y, angle: Math.atan2(dy, dx), loopPhase, roll: 0, alpha: 1, allowBack: 1 };
}

const PATH_SAMPLE_COUNT = 480;
const TANGENT_DELTA = 0.004;
const SAMPLES_PER_CONTOUR = 120;

function mapImagePixelToScreen(
  imgPx: number,
  imgPy: number,
  screenW: number,
  screenH: number,
  adjust: PathManualAdjust,
): [number, number] {
  return imageToScreen(imgPx / ROAD_IMG_W, imgPy / ROAD_IMG_H, screenW, screenH, adjust);
}

function contourArcLength(samples: RoadSample[]): number {
  let len = 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]!;
    const b = samples[i]!;
    len += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return len;
}

function sampleWithinContour(samples: RoadSample[], t: number): RoadSample {
  if (samples.length === 0)
    return { x: 0, y: 0, angle: 0, loopPhase: -1, roll: 0, alpha: 1, allowBack: 1 };
  if (samples.length === 1) return samples[0]!;
  const total = contourArcLength(samples);
  if (total <= 0) return samples[0]!;
  const target = Math.max(0, Math.min(1, t)) * total;
  let walked = 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]!;
    const b = samples[i]!;
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (walked + seg >= target) {
      const f = seg > 0 ? (target - walked) / seg : 0;
      return {
        x: a.x + (b.x - a.x) * f,
        y: a.y + (b.y - a.y) * f,
        angle: a.angle + (b.angle - a.angle) * f,
        loopPhase: -1,
        roll: a.roll + (b.roll - a.roll) * f,
        alpha: a.alpha + (b.alpha - a.alpha) * f,
        allowBack: a.allowBack + (b.allowBack - a.allowBack) * f,
      };
    }
    walked += seg;
  }
  return samples[samples.length - 1]!;
}

function segmentEndT(adjust: PathManualAdjust, contourIndex: number): number {
  if (contourIndex === 1) {
    return Math.max(0.05, Math.min(1, adjust.segment2EndT ?? 1));
  }
  return 1;
}

function smoothstep(p: number): number {
  const c = Math.max(0, Math.min(1, p));
  return c * c * (3 - 2 * c);
}

/** Off-screen ride-out continuing the source contour's final tangent (alpha 1→0). */
function buildExitRamp(
  source: RoadSample[],
  screenW: number,
  screenH: number,
  extensionFrac: number,
): RoadSample[] {
  if (source.length < 2 || extensionFrac <= 0) return [];

  const last = source[source.length - 1]!;
  const prev = source[source.length - 2]!;
  const dx = last.x - prev.x;
  const dy = last.y - prev.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const angle = Math.atan2(dy, dx);
  const distance = Math.max(screenW, screenH) * extensionFrac;
  const steps = 24;
  const ramp: RoadSample[] = [];

  for (let i = 1; i <= steps; i++) {
    const f = i / steps;
    const d = f * distance;
    ramp.push({
      x: last.x + ux * d,
      y: last.y + uy * d,
      angle,
      loopPhase: -1,
      roll: last.roll,
      alpha: 1 - f,
      allowBack: last.allowBack,
    });
  }
  return ramp;
}

/** Off-screen glide-in that approaches the target contour's first point (alpha 0→1). */
function buildEntranceRamp(
  target: RoadSample[],
  screenW: number,
  screenH: number,
  extensionFrac: number,
): RoadSample[] {
  if (target.length < 2 || extensionFrac <= 0) return [];

  const first = target[0]!;
  const next = target[1]!;
  const dx = next.x - first.x;
  const dy = next.y - first.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const angle = Math.atan2(dy, dx);
  const distance = Math.max(screenW, screenH) * extensionFrac;
  const steps = 24;
  const ramp: RoadSample[] = [];

  // Start far behind the segment-2 entry (alpha 0) and glide toward it (alpha 1).
  for (let i = 0; i < steps; i++) {
    const f = i / steps;
    const d = (1 - f) * distance;
    ramp.push({
      x: first.x - ux * d,
      y: first.y - uy * d,
      angle,
      loopPhase: -1,
      roll: 0,
      alpha: f,
      allowBack: first.allowBack,
    });
  }
  return ramp;
}

/** Roll the avatar a full turn across the loop window (upside-down at the apex). */
function annotateLoopRoll(seg: RoadSample[]): void {
  const n = seg.length;
  if (n < 4) return;
  const a = Math.max(0, Math.floor(LOOP_START_FRAC * (n - 1)));
  const b = Math.min(n - 1, Math.floor(LOOP_END_FRAC * (n - 1)));
  if (b <= a) return;

  // Winding direction of the path tangent across the loop window.
  let h = seg[a]!.angle;
  let total = 0;
  for (let i = a + 1; i <= b; i++) {
    let cur = seg[i]!.angle;
    while (cur - h > Math.PI) cur -= 2 * Math.PI;
    while (cur - h < -Math.PI) cur += 2 * Math.PI;
    total += cur - h;
    h = cur;
  }
  const sign = total >= 0 ? 1 : -1;
  const fullTurn = sign * 2 * Math.PI;

  for (let i = 0; i < n; i++) {
    if (i < a) {
      seg[i]!.roll = 0;
    } else if (i > b) {
      seg[i]!.roll = fullTurn; // hold at a full turn (visually upright)
    } else {
      const p = (i - a) / (b - a);
      seg[i]!.roll = fullTurn * smoothstep(p);
    }
  }
}

function resampleContours(
  contours: RoadSample[][],
  roadTotalLength: number,
): { samples: RoadSample[]; roadEndT: number } {
  if (contours.length === 0) return { samples: [], roadEndT: 1 };

  const lengths = contours.map(contourArcLength);
  const totalLength = lengths.reduce((a, b) => a + b, 0);
  const roadEndT =
    totalLength > 0 ? Math.min(1, roadTotalLength / totalLength) : 1;

  const samples: RoadSample[] = [];
  for (let i = 0; i < PATH_SAMPLE_COUNT; i++) {
    const dist = (i / (PATH_SAMPLE_COUNT - 1)) * totalLength;
    let walked = 0;
    let picked = contours[0]![0]!;
    for (let c = 0; c < contours.length; c++) {
      const segLen = lengths[c] ?? 0;
      if (walked + segLen >= dist || c === contours.length - 1) {
        const localT = segLen > 0 ? (dist - walked) / segLen : 0;
        picked = sampleWithinContour(contours[c]!, localT);
        break;
      }
      walked += segLen;
    }
    samples.push(picked);
  }

  return { samples, roadEndT };
}

function buildSamplesFromSvg(
  screenW: number,
  screenH: number,
  adjust: PathManualAdjust,
): RoadSamplesResult {
  const svgPath = Skia.Path.MakeFromSVGString(PORTRAIT_PATH_SVG);
  if (!svgPath) return { samples: [], roadEndT: 1 };

  // One entry per SVG sub-path (index 0 = segment 1, index 1 = segment 2/loop).
  const segments: RoadSample[][] = [];
  const iter = Skia.ContourMeasureIter(svgPath, false, 1);
  let contour = iter.next();
  let contourIndex = 0;

  while (contour) {
    const length = contour.length();
    const endT = segmentEndT(adjust, contourIndex);
    const effectiveLength = length * endT;
    const count = Math.max(2, Math.round(SAMPLES_PER_CONTOUR * (effectiveLength / 800)));
    // Segment 1 (index 0) never shows the troll's back; segment 2 may.
    const allowBack = contourIndex === 0 ? 0 : 1;
    const contourSamples: RoadSample[] = [];
    for (let i = 0; i < count; i++) {
      const d1 = (i / (count - 1)) * effectiveLength;
      const d2 = Math.min(d1 + length * TANGENT_DELTA, effectiveLength);
      const [p1] = contour.getPosTan(d1);
      const [p2] = contour.getPosTan(d2);
      const [sx1, sy1] = mapImagePixelToScreen(p1.x, p1.y, screenW, screenH, adjust);
      const [sx2, sy2] = mapImagePixelToScreen(p2.x, p2.y, screenW, screenH, adjust);
      contourSamples.push({
        x: sx1,
        y: sy1,
        angle: Math.atan2(sy2 - sy1, sx2 - sx1),
        loopPhase: -1,
        roll: 0,
        alpha: 1,
        allowBack,
      });
    }
    if (contourSamples.length >= 2) {
      if (contourIndex === 1) annotateLoopRoll(contourSamples);
      segments.push(contourSamples);
    }
    contour = iter.next();
    contourIndex++;
  }

  if (segments.length === 0) return { samples: [], roadEndT: 1 };

  // Assemble the ride order, inserting off-screen ramps so the avatar exits
  // after segment 1, disappears briefly, then glides back in for segment 2.
  const ordered: RoadSample[][] = [];
  for (let s = 0; s < segments.length; s++) {
    const seg = segments[s]!;
    if (s > 0) {
      const entrance = buildEntranceRamp(seg, screenW, screenH, SEG2_ENTRY_FRAC);
      if (entrance.length >= 2) ordered.push(entrance);
    }
    ordered.push(seg);
    const isLast = s === segments.length - 1;
    const exitFrac = isLast ? adjust.exitExtension ?? 0 : SEG1_EXIT_FRAC;
    if (exitFrac > 0) {
      const exit = buildExitRamp(seg, screenW, screenH, exitFrac);
      if (exit.length >= 2) ordered.push(exit);
    }
  }

  const totalLength = ordered.map(contourArcLength).reduce((a, b) => a + b, 0);
  return resampleContours(ordered, totalLength);
}

function buildDebugPathFromSvg(
  screenW: number,
  screenH: number,
  adjust: PathManualAdjust,
): SkPath | null {
  const svgPath = Skia.Path.MakeFromSVGString(PORTRAIT_PATH_SVG);
  if (!svgPath) return null;

  const skPath = Skia.Path.Make();
  const iter = Skia.ContourMeasureIter(svgPath, false, 1);
  let contour = iter.next();
  let contourIndex = 0;
  let hasPath = false;

  while (contour) {
    const length = contour.length();
    const endT = segmentEndT(adjust, contourIndex);
    const effectiveLength = length * endT;
    const steps = Math.max(2, Math.round(SAMPLES_PER_CONTOUR * (effectiveLength / 800)));
    for (let i = 0; i < steps; i++) {
      const [pos] = contour.getPosTan((i / (steps - 1)) * effectiveLength);
      const [sx, sy] = mapImagePixelToScreen(pos.x, pos.y, screenW, screenH, adjust);
      if (i === 0) skPath.moveTo(sx, sy);
      else skPath.lineTo(sx, sy);
      hasPath = true;
    }
    contour = iter.next();
    contourIndex++;
  }

  return hasPath ? skPath : null;
}

function buildScreenPath(
  screenW: number,
  screenH: number,
  adjust: PathManualAdjust = DEFAULT_PATH_ADJUST,
) {
  if (USE_TRACED_SVG_PATH) {
    const result = buildSamplesFromSvg(screenW, screenH, adjust);
    return { useSvg: true as const, ...result };
  }
  const path = remapPath(PORTRAIT_ROAD, screenW, screenH, adjust);
  const cum = buildArcLengths(path, screenW, screenH);
  return { useSvg: false as const, path, cum, samples: [] as RoadSample[], roadEndT: 1 };
}

/** Build the road path in screen coordinates (debug overlay). */
export function buildRoadPath(
  screenW: number,
  screenH: number,
  adjust: PathManualAdjust = DEFAULT_PATH_ADJUST,
): SkPath | null {
  const built = buildScreenPath(screenW, screenH, adjust);
  const skPath = Skia.Path.Make();
  let started = false;

  if (built.useSvg) {
    return buildDebugPathFromSvg(screenW, screenH, adjust);
  }

  const { path, cum } = built;
  for (let i = 0; i <= PATH_SAMPLE_COUNT; i++) {
    const sample = pointAt(path, cum, i / PATH_SAMPLE_COUNT, screenW, screenH);
    if (!started) {
      skPath.moveTo(sample.x, sample.y);
      started = true;
    } else {
      skPath.lineTo(sample.x, sample.y);
    }
  }

  return started ? skPath : null;
}

/** Precompute position + tangent samples along the cover-mapped path. */
export function buildRoadSamples(
  screenW: number,
  screenH: number,
  adjust: PathManualAdjust = DEFAULT_PATH_ADJUST,
): RoadSamplesResult {
  const built = buildScreenPath(screenW, screenH, adjust);
  if (built.useSvg) {
    return { samples: built.samples, roadEndT: built.roadEndT };
  }

  const { path, cum } = built;
  const samples: RoadSample[] = [];
  for (let i = 0; i < PATH_SAMPLE_COUNT; i++) {
    samples.push(pointAt(path, cum, i / (PATH_SAMPLE_COUNT - 1), screenW, screenH));
  }
  return { samples, roadEndT: 1 };
}

export function getLoopCenterScreen(
  screenW: number,
  screenH: number,
): { x: number; y: number } {
  const [x, y] = imageToScreen(
    PORTRAIT_LOOP_CENTER[0],
    PORTRAIT_LOOP_CENTER[1],
    screenW,
    screenH,
  );
  return { x, y };
}

/** Interpolate a sample at normalized arc length t ∈ [0, 1]. Worklet-safe. */
export function sampleAt(samples: RoadSample[], t: number): RoadSample {
  "worklet";
  const n = samples.length;
  if (n === 0)
    return { x: 0, y: 0, angle: 0, loopPhase: -1, roll: 0, alpha: 1, allowBack: 1 };
  const clamped = Math.max(0, Math.min(1, t));
  const idx = clamped * (n - 1);
  const i0 = Math.floor(idx);
  const i1 = Math.min(i0 + 1, n - 1);
  const f = idx - i0;
  const s0 = samples[i0]!;
  const s1 = samples[i1]!;
  return {
    x: s0.x + (s1.x - s0.x) * f,
    y: s0.y + (s1.y - s0.y) * f,
    angle: s0.angle + (s1.angle - s0.angle) * f,
    loopPhase: s0.loopPhase + (s1.loopPhase - s0.loopPhase) * f,
    roll: s0.roll + (s1.roll - s0.roll) * f,
    alpha: s0.alpha + (s1.alpha - s0.alpha) * f,
    allowBack: s0.allowBack + (s1.allowBack - s0.allowBack) * f,
  };
}

/** Upright rotation from two consecutive path samples (worklet-safe). */
export function uprightRotationFromSamples(
  samples: RoadSample[],
  t: number,
): number {
  "worklet";
  const p1 = sampleAt(samples, t);
  const p2 = sampleAt(samples, (t + 0.002) % 1);
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  return angle - Math.PI / 2;
}