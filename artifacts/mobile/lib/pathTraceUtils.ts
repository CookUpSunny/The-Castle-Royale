import { Skia } from "@shopify/react-native-skia";
import { imagePixelToScreen } from "./rainbowRoadPath";

export interface TracePoint {
  screenX: number;
  screenY: number;
  imgPx: number;
  imgPy: number;
}

/** Resample a locked SVG subpath into trace points (for re-tracing segment 2 only). */
export function lockedTracePointsFromSvgSegment(
  svg: string,
  contourIndex: number,
  screenW: number,
  screenH: number,
  samples = 32,
): TracePoint[] {
  const path = Skia.Path.MakeFromSVGString(svg);
  if (!path) return [];

  const iter = Skia.ContourMeasureIter(path, false, 1);
  let contour = iter.next();
  let idx = 0;
  while (contour && idx < contourIndex) {
    contour = iter.next();
    idx++;
  }
  if (!contour) return [];

  const length = contour.length();
  const points: TracePoint[] = [];
  for (let j = 0; j < samples; j++) {
    const [pos] = contour.getPosTan((j / (samples - 1)) * length);
    const [screenX, screenY] = imagePixelToScreen(pos.x, pos.y, screenW, screenH);
    points.push({ screenX, screenY, imgPx: pos.x, imgPy: pos.y });
  }
  return points;
}

type Pt = [number, number];

/** Catmull-Rom spline segment → cubic bezier control points. */
export function catmullRomToBezierSegments(
  points: Pt[],
  tension = 0.5,
): Array<{ c1: Pt; c2: Pt; end: Pt }> {
  if (points.length < 2) return [];

  const segs: Array<{ c1: Pt; c2: Pt; end: Pt }> = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;
    segs.push({
      c1: [
        p1[0] + ((p2[0] - p0[0]) * tension) / 3,
        p1[1] + ((p2[1] - p0[1]) * tension) / 3,
      ],
      c2: [
        p2[0] - ((p3[0] - p1[0]) * tension) / 3,
        p2[1] - ((p3[1] - p1[1]) * tension) / 3,
      ],
      end: p2,
    });
  }
  return segs;
}

const fmt = (n: number) => n.toFixed(2);

/** Smooth cubic SVG path through arbitrary 2D points. */
export function pointsToSvgPath(points: Pt[]): string {
  if (points.length < 2) return "";
  const [sx, sy] = points[0]!;
  let d = `M ${fmt(sx)} ${fmt(sy)}`;
  for (const seg of catmullRomToBezierSegments(points)) {
    d += ` C ${fmt(seg.c1[0])} ${fmt(seg.c1[1])} ${fmt(seg.c2[0])} ${fmt(seg.c2[1])} ${fmt(seg.end[0])} ${fmt(seg.end[1])}`;
  }
  return d;
}

/** Multiple disjoint subpaths — each gets its own M…C sequence (road exits then re-enters). */
export function segmentsToSvgPath(segments: Pt[][]): string {
  return segments
    .filter((seg) => seg.length >= 2)
    .map((seg) => pointsToSvgPath(seg))
    .join(" ");
}

/** SVG path in 1536×1024 image pixel space. */
export function imagePointsToSvgPath(points: Pt[]): string {
  return pointsToSvgPath(points);
}

/** Multi-line JS string literal for a single subpath. */
export function imagePointsToJsSvgLiteral(points: Pt[]): string {
  const svg = pointsToSvgPath(points);
  const move = svg.match(/^M [^C]+/)?.[0]?.trim() ?? svg;
  const curves = svg.match(/C [^C]+/g) ?? [];
  return [move, ...curves.map((c) => c.trim())]
    .map((part) => `  "${part} "`)
    .join(" +\n");
}

/** JS literal for combined multi-segment path (concatenate subpath strings). */
export function segmentsToJsSvgLiteral(segments: Pt[][]): string {
  const parts = segments
    .filter((seg) => seg.length >= 2)
    .flatMap((seg) => {
      const svg = pointsToSvgPath(seg);
      const move = svg.match(/^M [^C]+/)?.[0]?.trim() ?? svg;
      const curves = svg.match(/C [^C]+/g) ?? [];
      return [move, ...curves.map((c) => c.trim())];
    });
  return parts.map((part) => `  "${part} "`).join(" +\n");
}

function tracePointsToImagePts(points: TracePoint[]): Pt[] {
  return points.map((p) => [p.imgPx, p.imgPy]);
}

export function logTraceSegment(
  segmentIndex: number,
  points: TracePoint[],
  imgW: number,
  imgH: number,
): void {
  const imgPts = tracePointsToImagePts(points);
  console.log(`\n--- ROAD TRACE: segment ${segmentIndex + 1} (${points.length} taps) ---`);
  console.log(imagePointsToSvgPath(imgPts));
  console.log(imagePointsToJsSvgLiteral(imgPts));
}

export function logTracePath(points: TracePoint[], imgW: number, imgH: number): void {
  logTraceSegments([points], imgW, imgH);
}

export function logTraceSegments(
  segments: TracePoint[][],
  imgW: number,
  imgH: number,
): void {
  const imgSegs = segments
    .filter((seg) => seg.length >= 2)
    .map(tracePointsToImagePts);

  if (imgSegs.length === 0) return;

  const combined = segmentsToSvgPath(imgSegs);
  const jsLiteral = segmentsToJsSvgLiteral(imgSegs);

  console.log("\n========== ROAD TRACE: COMBINED SVG (1536×1024 pixels) ==========");
  console.log(combined);
  console.log("\n========== ROAD TRACE: paste into PORTRAIT_PATH_SVG ==========");
  console.log(jsLiteral);

  imgSegs.forEach((seg, i) => {
    console.log(`\n--- segment ${i + 1} alone ---`);
    console.log(pointsToSvgPath(seg));
    console.log(
      JSON.stringify(
        seg.map(([px, py]) => [
          Math.round((px / imgW) * 10000) / 10000,
          Math.round((py / imgH) * 10000) / 10000,
        ]),
      ),
    );
  });

  console.log("\n============================================================\n");
}
