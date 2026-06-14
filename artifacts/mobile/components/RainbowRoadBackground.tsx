import React, { useMemo, useEffect, useRef, useState, useCallback } from "react";
import {
  Canvas,
  Image,
  Group,
  Circle,
  Path,
  BlurMask,
  useImage,
  Skia,
} from "@shopify/react-native-skia";
import {
  useSharedValue,
  useDerivedValue,
  useFrameCallback,
  makeMutable,
  withRepeat,
  withTiming,
  Easing,
  type SharedValue,
} from "react-native-reanimated";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import {
  buildRoadSamples,
  sampleAt,
  screenToImagePixel,
  ROAD_IMG_W,
  ROAD_IMG_H,
  DEFAULT_PATH_ADJUST,
  PORTRAIT_PATH_SVG,
  type RoadSample,
} from "@/lib/rainbowRoadPath";
import {
  logTraceSegment,
  logTraceSegments,
  pointsToSvgPath,
  lockedTracePointsFromSvgSegment,
  type TracePoint,
} from "@/lib/pathTraceUtils";

// ---------------------------------------------------------------------------
// Manual path alignment (offsets/scale applied after the cover-fit transform)
// ---------------------------------------------------------------------------
const PATH_OFFSET_X = 0;
const PATH_OFFSET_Y = 0;
const PATH_SCALE = 1.0;
/** 0..1 — shorten segment 2 (loop/re-entry). Lower = chop more off the end. */
const PATH_SEGMENT_2_TRIM = 1.0;
/** Off-screen ride-out after segment 2 ends (fraction of screen size). */
const PATH_EXIT_EXTENSION = 0.28;

// ---------------------------------------------------------------------------
// Developer trace mode — set true to re-trace the road centerline
// ---------------------------------------------------------------------------
const DEV_TRACE_PATH = false;
/** Keep segment 1 from PORTRAIT_PATH_SVG; only re-trace segment 2. */
const TRACE_RETRACE_SEGMENT_2_ONLY = true;
const TRACE_MIN_POINTS = 15;
const TRACE_MIN_POINTS_PER_SEGMENT = 5;
const TRACE_CLEAR_CORNER = 80;
const TRACE_SEGMENT_COLORS = ["#39ff14", "#00d4ff", "#ff9f0a"];

// ---------------------------------------------------------------------------
// Twinkling star overlay
// ---------------------------------------------------------------------------
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const TAU = Math.PI * 2;

interface StarData {
  cx: number;
  cy: number;
  r: number;
  baseOpacity: number;
}

function generateStars(w: number, h: number): StarData[] {
  return Array.from({ length: 35 }, () => ({
    cx: rand(0, w),
    cy: rand(0, h),
    r: rand(0.8, 2.2),
    baseOpacity: rand(0.2, 0.55),
  }));
}

const TwinkleStar = ({ star }: { star: StarData }) => {
  const opacity = useSharedValue(star.baseOpacity);
  const target = useRef(rand(0.1, 0.7)).current;
  const duration = useRef(rand(1800, 4500)).current;

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(target, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, []);

  return (
    <Circle cx={star.cx} cy={star.cy} r={star.r} color="white" opacity={opacity} />
  );
};

// ---------------------------------------------------------------------------
// Glitter particle trail — pooled, recycled, drawn behind each troll
// ---------------------------------------------------------------------------
/** Rainbow Road palette the particles draw their colors from. */
const RAINBOW_PALETTE = [
  "#ff3b5c",
  "#ff6a1a",
  "#ff8a3d",
  "#ffd23d",
  "#fff176", // bright yellow-white
  "#3dff7e",
  "#00ffcc",
  "#3de0ff",
  "#5b6dff",
  "#c14dff",
  "#ff5de3",
  "#ffffff", // pure white sparkle
];

const PARTICLES_PER_TROLL = 50;
/** Spawn one particle roughly every N ms while the troll is on-screen. */
const PARTICLE_SPAWN_MS = 18;
const PARTICLE_LIFE_MIN = 1200;
const PARTICLE_LIFE_VAR = 800; // total life 1200–2000ms
/** Only emit while the troll itself is visible (matches its alpha gate). */
const PARTICLE_VISIBLE_THRESHOLD = 0.35;


/**
 * Sim state packed as a flat number array per troll trail (worklet-side only).
 * Stride 4: [age, life, vx, vy] per particle.  life === 0 means inactive.
 */
const SIM_STRIDE = 4;

interface TrollTrailProps {
  startOffset: number;
  samples: RoadSample[];
  t: SharedValue<number>;
}

const TrollTrail = ({ startOffset, samples, t }: TrollTrailProps) => {
  const n = PARTICLES_PER_TROLL;

  /**
   * Each particle gets its own makeMutable SharedValues so Skia can subscribe
   * directly.  These are stable refs — never recreated after mount.
   */
  const pts = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => ({
        x: makeMutable(-9999),
        y: makeMutable(-9999),
        r: makeMutable(0),
        opacity: makeMutable(0),
        color: makeMutable(RAINBOW_PALETTE[i % RAINBOW_PALETTE.length]!),
      })),
    [],
  );

  // Internal physics state — worklet-side flat array.
  const sim = useSharedValue<number[]>(new Array(n * SIM_STRIDE).fill(0));
  // Per-particle base opacity (needed for fade calculation).
  const bops = useSharedValue<number[]>(new Array(n).fill(0.8));
  const spawnAcc = useSharedValue(0);
  const spawnIdx = useSharedValue(0);
  const spawnCount = useSharedValue(0);

  useFrameCallback((info) => {
    const dt = info.timeSincePreviousFrame ?? 16;
    const st = sim.value;
    const bo = bops.value;

    // Advance live particles.
    for (let i = 0; i < n; i++) {
      const b = i * SIM_STRIDE;
      const life = st[b + 1]!;
      if (life <= 0) continue; // inactive

      const age = st[b]! + dt;
      if (age >= life) {
        st[b + 1] = 0; // deactivate
        pts[i]!.r.value = 0;
        pts[i]!.opacity.value = 0;
        continue;
      }
      st[b] = age;
      pts[i]!.x.value = pts[i]!.x.value + st[b + 2]! * dt;
      pts[i]!.y.value = pts[i]!.y.value + st[b + 3]! * dt;
      pts[i]!.opacity.value = bo[i]! * Math.max(0, 1 - age / life);
    }

    // Spawn at the troll's current road position while visible.
    const phase = (t.value + startOffset) % 1;
    const s = sampleAt(samples, phase);
    spawnAcc.value += dt;

    while (spawnAcc.value >= PARTICLE_SPAWN_MS) {
      spawnAcc.value -= PARTICLE_SPAWN_MS;
      if (s.alpha <= PARTICLE_VISIBLE_THRESHOLD) continue;

      const idx = spawnIdx.value;
      spawnIdx.value = (idx + 1) % n;
      const cnt = spawnCount.value;
      spawnCount.value = cnt + 1;
      const sparkle = cnt % 3 === 0;

      const b = idx * SIM_STRIDE;
      st[b] = 0; // age
      st[b + 1] = PARTICLE_LIFE_MIN + Math.random() * PARTICLE_LIFE_VAR;
      const dir = Math.random() * TAU;
      const speed = 0.05 + Math.random() * 0.07; // faster spread
      st[b + 2] = Math.cos(dir) * speed;
      st[b + 3] = Math.sin(dir) * speed - 0.025; // stronger upward bias
      const baseOp = 1.0;
      bo[idx] = baseOp;

      const p = pts[idx]!;
      p.x.value = s.x;
      p.y.value = s.y;
      p.r.value = sparkle ? 5 + Math.random() * 3 : 2 + Math.random() * 3;
      p.opacity.value = baseOp;
      p.color.value = RAINBOW_PALETTE[(Math.random() * RAINBOW_PALETTE.length) | 0]!;
    }

    // Write back so persistent state survives across frames regardless of
    // whether Reanimated stores arrays by reference or by copy on the UI thread.
    sim.value = st;
    bops.value = bo;
  });

  return (
    <Group>
      {pts.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={p.r} color={p.color} opacity={p.opacity}>
          <BlurMask blur={5} style="normal" />
        </Circle>
      ))}
    </Group>
  );
};

// ---------------------------------------------------------------------------
// Troll rider — 6-frame turnaround sprite sheet + Skia depth layers
// ---------------------------------------------------------------------------
interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TrollSheetMeta {
  frames: { frame: FrameRect }[];
  meta: {
    size: { w: number; h: number };
    grid: { cols: number; rows: number };
    anchor: { x: number; y: number };
    frameCount?: number;
  };
}

interface TrollProps {
  sheet: number;
  meta: TrollSheetMeta;
  glowColor: string;
  startOffset: number;
  samples: RoadSample[];
  t: SharedValue<number>;
}

/** On-screen frame height in px (feet-to-hair, aspect preserved). Tweak this to resize. */
const TROLL_HEIGHT = 75;
/** New frame must persist this many reads before swapping (prevents flicker). */
const FRAME_STABLE_READS = 2;
const BOB_AMP = 3;
const BOB_CYCLES = 6;

const TrollRider = ({ sheet, meta, glowColor, startOffset, samples, t }: TrollProps) => {
  const image = useImage(sheet);

  const anchorY = meta.meta.anchor.y;
  const frameCount = meta.meta.frameCount ?? meta.frames.length;
  const sheetW = meta.meta.size.w;
  const sheetH = meta.meta.size.h;

  const stableFrame = useSharedValue(0);
  const candidateFrame = useSharedValue(-1);
  const candidateCount = useSharedValue(0);

  const placement = useDerivedValue(() => {
    const phase = (t.value + startOffset) % 1;
    const s = sampleAt(samples, phase);
    const sNext = sampleAt(samples, Math.min(phase + 0.005, 1));

    // Travel heading → frame index (6 frames, 60° each).
    const heading = Math.atan2(sNext.y - s.y, sNext.x - s.x);
    const normalized = ((heading % TAU) + TAU) % TAU;
    const adjusted = ((normalized - Math.PI / 2) + TAU) % TAU;
    let raw = Math.round((adjusted / TAU) * frameCount) % frameCount;

    // Segment 1: never show the troll's back — clamp to front hemisphere.
    if (s.allowBack < 0.5) {
      const maxSide = Math.floor(frameCount / 4);
      let d = raw;
      if (d > frameCount / 2) d -= frameCount;
      if (d > maxSide) raw = maxSide;
      else if (d < -maxSide) raw = frameCount - maxSide;
    }

    if (raw === stableFrame.value) {
      candidateFrame.value = -1;
      candidateCount.value = 0;
    } else if (raw === candidateFrame.value) {
      candidateCount.value += 1;
      if (candidateCount.value >= FRAME_STABLE_READS) {
        stableFrame.value = raw;
        candidateFrame.value = -1;
        candidateCount.value = 0;
      }
    } else {
      candidateFrame.value = raw;
      candidateCount.value = 1;
    }

    const frame = stableFrame.value;
    const fr = meta.frames[frame]!.frame;
    // Scale each frame so its tight-crop height maps to TROLL_HEIGHT on screen.
    const scale = TROLL_HEIGHT / fr.h;
    const dW = fr.w * scale;
    const dH = fr.h * scale;
    const cyc = t.value * TAU;
    const bob = Math.sin(cyc * BOB_CYCLES + startOffset * TAU) * BOB_AMP;

    return {
      px: s.x,
      py: s.y + bob,
      roll: s.roll,
      imgX: -fr.x * scale,
      imgY: -fr.y * scale,
      sheetScale: scale,
      dW,
      dH,
      opacity: s.alpha,
    };
  });

  const transform = useDerivedValue(() => [
    { translateX: placement.value.px },
    { translateY: placement.value.py },
    { rotate: placement.value.roll },
    { translateX: -placement.value.dW / 2 },
    { translateY: -placement.value.dH * anchorY },
  ]);
  const opacity = useDerivedValue(() => placement.value.opacity);
  const imgX = useDerivedValue(() => placement.value.imgX);
  const imgY = useDerivedValue(() => placement.value.imgY);
  const sheetScale = useDerivedValue(() => placement.value.sheetScale);
  const scaledSheetW = useDerivedValue(() => sheetW * sheetScale.value);
  const scaledSheetH = useDerivedValue(() => sheetH * sheetScale.value);
  const clip = useDerivedValue(() =>
    Skia.XYWHRect(0, 0, placement.value.dW, placement.value.dH),
  );
  const glowCx = useDerivedValue(() => placement.value.dW / 2);
  const glowCy = useDerivedValue(() => placement.value.dH * 0.42);
  const glowR = useDerivedValue(() => placement.value.dW * 0.55);
  const rimCy = useDerivedValue(() => placement.value.dH * 0.38);
  const rimR = useDerivedValue(() => placement.value.dW * 0.28);
  const shadowCy = useDerivedValue(() => placement.value.dH * 0.97);
  const shadowR = useDerivedValue(() => placement.value.dW * 0.2);

  if (!image) return null;

  return (
    <Group transform={transform} opacity={opacity}>
      {/* Wide soft aura — character-colored ambient glow. */}
      <Circle cx={glowCx} cy={glowCy} r={glowR} color={glowColor} opacity={0.12}>
        <BlurMask blur={18} style="normal" />
      </Circle>
      {/* Tight bright rim — gives the sprite a lit edge. */}
      <Circle cx={glowCx} cy={rimCy} r={rimR} color={glowColor} opacity={0.22}>
        <BlurMask blur={6} style="normal" />
      </Circle>
      {/* Ground contact shadow — anchors them to the road. */}
      <Circle cx={glowCx} cy={shadowCy} r={shadowR} color="#000000" opacity={0.35}>
        <BlurMask blur={10} style="normal" />
      </Circle>
      <Group clip={clip}>
        <Image image={image} x={imgX} y={imgY} width={scaledSheetW} height={scaledSheetH} />
      </Group>
    </Group>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const TROLLS = [
  {
    sheet: require("../assets/avatars/regenerated/ronin_turnaround_v1.png"),
    meta: require("../assets/avatars/regenerated/ronin_turnaround_v1.json") as TrollSheetMeta,
    glowColor: "#d24bff",
    startOffset: 0,
  },
  {
    sheet: require("../assets/avatars/regenerated/maverick_turnaround_v1.png"),
    meta: require("../assets/avatars/regenerated/maverick_turnaround_v1.json") as TrollSheetMeta,
    glowColor: "#a6ff3a",
    startOffset: 0.25,
  },
  {
    sheet: require("../assets/avatars/regenerated/empress_turnaround_v1.png"),
    meta: require("../assets/avatars/regenerated/empress_turnaround_v1.json") as TrollSheetMeta,
    glowColor: "#ff5db0",
    startOffset: 0.5,
  },
  {
    sheet: require("../assets/avatars/regenerated/viper_turnaround_v1.png"),
    meta: require("../assets/avatars/regenerated/viper_turnaround_v1.json") as TrollSheetMeta,
    glowColor: "#39d6ff",
    startOffset: 0.75,
  },
];


export default function RainbowRoadBackground() {
  const { width, height } = useWindowDimensions();
  const [traceSegments, setTraceSegments] = useState<TracePoint[][]>(() =>
    TRACE_RETRACE_SEGMENT_2_ONLY ? [[], []] : [[]],
  );
  const activeSegmentIndex = traceSegments.length - 1;
  const activeSegment = traceSegments[activeSegmentIndex] ?? [];

  useEffect(() => {
    if (!DEV_TRACE_PATH || !TRACE_RETRACE_SEGMENT_2_ONLY || width <= 0 || height <= 0) {
      return;
    }

    const lockedSeg1 = lockedTracePointsFromSvgSegment(
      PORTRAIT_PATH_SVG,
      0,
      width,
      height,
    );
    if (lockedSeg1.length === 0) return;

    setTraceSegments([lockedSeg1, []]);
    console.log(
      `[road-trace] Segment 1 locked (${lockedSeg1.length} pts). Tap the road where it re-enters to trace segment 2.`,
    );
  }, [width, height]);

  const bgImage = useImage(
    require("../assets/scenes/rainbowRoad/portrait/L0_far.jpg"),
  );

  const stars = useMemo(() => generateStars(width, height), [width, height]);

  const pathAdjust = useMemo(
    () => ({
      offsetX: PATH_OFFSET_X,
      offsetY: PATH_OFFSET_Y,
      scale: PATH_SCALE,
      segment2EndT: PATH_SEGMENT_2_TRIM,
      exitExtension: PATH_EXIT_EXTENSION,
    }),
    [],
  );

  const { samples } = useMemo(
    () => buildRoadSamples(width, height, pathAdjust),
    [width, height, pathAdjust],
  );

  // Single master clock so each troll's sprite and glitter trail stay in sync.
  const ride = useSharedValue(0);
  useEffect(() => {
    ride.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const tracePreviewPaths = useMemo(
    () =>
      traceSegments
        .map((seg, i) => {
          if (seg.length < 2) return null;
          const screenPts = seg.map((p) => [p.screenX, p.screenY] as [number, number]);
          const path = Skia.Path.MakeFromSVGString(pointsToSvgPath(screenPts));
          const color = TRACE_SEGMENT_COLORS[i % TRACE_SEGMENT_COLORS.length] ?? "#39ff14";
          return path ? { path, color, key: i } : null;
        })
        .filter(Boolean) as Array<{ path: NonNullable<ReturnType<typeof Skia.Path.MakeFromSVGString>>; color: string; key: number }>,
    [traceSegments],
  );

  const finishActiveSegment = useCallback((segments: TracePoint[][]) => {
    const idx = segments.length - 1;
    const current = segments[idx] ?? [];
    if (current.length < TRACE_MIN_POINTS_PER_SEGMENT) {
      console.log(
        `[road-trace] Segment ${idx + 1} needs at least ${TRACE_MIN_POINTS_PER_SEGMENT} points before finishing.`,
      );
      return segments;
    }

    logTraceSegment(idx, current, ROAD_IMG_W, ROAD_IMG_H);

    const finalized = segments.map((seg, i) => (i === idx ? current : seg));
    logTraceSegments(
      finalized.filter((s) => s.length >= 2),
      ROAD_IMG_W,
      ROAD_IMG_H,
    );

    if (idx === 0 && !TRACE_RETRACE_SEGMENT_2_ONLY) {
      console.log(
        "[road-trace] Segment 1 saved. Trace segment 2 where the road re-enters, then tap top-right again.",
      );
      return [...finalized, []];
    }

    console.log("[road-trace] All segments saved — combined path logged above.");
    return finalized;
  }, []);

  const handleTraceTap = useCallback(
    (screenX: number, screenY: number) => {
      // Top-left — clear everything (or segment 2 only when re-tracing)
      if (screenX < TRACE_CLEAR_CORNER && screenY < TRACE_CLEAR_CORNER) {
        if (TRACE_RETRACE_SEGMENT_2_ONLY) {
          setTraceSegments((prev) => {
            const lockedSeg1 = prev[0] ?? [];
            console.log("[road-trace] Cleared segment 2. Segment 1 still locked.");
            return [lockedSeg1, []];
          });
        } else {
          setTraceSegments([[]]);
          console.log("[road-trace] Cleared all segments.");
        }
        return;
      }

      // Bottom-left — clear segment 2 only (retrace mode)
      if (
        TRACE_RETRACE_SEGMENT_2_ONLY &&
        screenX < TRACE_CLEAR_CORNER &&
        screenY > height - TRACE_CLEAR_CORNER
      ) {
        setTraceSegments((prev) => {
          const lockedSeg1 = prev[0] ?? [];
          console.log("[road-trace] Cleared segment 2. Segment 1 still locked.");
          return [lockedSeg1, []];
        });
        return;
      }

      // Top-right — finish current segment, start next
      if (
        screenX > width - TRACE_CLEAR_CORNER &&
        screenY < TRACE_CLEAR_CORNER
      ) {
        if (TRACE_RETRACE_SEGMENT_2_ONLY && activeSegmentIndex === 0) {
          console.log("[road-trace] Segment 1 is locked — trace segment 2, then tap top-right to log.");
          return;
        }
        setTraceSegments((prev) => finishActiveSegment(prev));
        return;
      }

      const [imgPx, imgPy] = screenToImagePixel(
        screenX,
        screenY,
        width,
        height,
        DEFAULT_PATH_ADJUST,
      );
      const nx = imgPx / ROAD_IMG_W;
      const ny = imgPy / ROAD_IMG_H;
      const segNum = activeSegmentIndex + 1;

      const point: TracePoint = { screenX, screenY, imgPx, imgPy };
      setTraceSegments((prev) => {
        const idx = prev.length - 1;
        const current = prev[idx] ?? [];
        const next = [...prev];
        next[idx] = [...current, point];
        const n = next[idx]!.length;

        console.log(
          `[road-trace] seg${segNum} #${n} screen (${screenX.toFixed(1)}, ${screenY.toFixed(1)})` +
            ` → image (${imgPx.toFixed(1)}, ${imgPy.toFixed(1)})` +
            ` normalized (${nx.toFixed(4)}, ${ny.toFixed(4)})`,
        );

        if (n === 1 && segNum === 1 && !TRACE_RETRACE_SEGMENT_2_ONLY) {
          console.log(
            "[road-trace] Trace segment 1 until the road exits the screen," +
              " then tap top-right corner to start segment 2.",
          );
        }
        if (n === 1 && segNum === 2) {
          console.log(
            "[road-trace] Trace segment 2 from re-entry through the loop to exit," +
              " then tap top-right to log the combined path.",
          );
        }

        const allPoints = next.flat();
        if (allPoints.length >= TRACE_MIN_POINTS) {
          logTraceSegments(next.filter((s) => s.length >= 2), ROAD_IMG_W, ROAD_IMG_H);
        } else {
          const remaining = TRACE_MIN_POINTS - allPoints.length;
          console.log(`[road-trace] ${remaining} more point(s) total until combined path logs.`);
        }

        return next;
      });
    },
    [width, height, activeSegmentIndex, finishActiveSegment],
  );

  const totalTracePoints = traceSegments.reduce((n, seg) => n + seg.length, 0);
  const savedSegmentCount = traceSegments.filter(
    (seg, i) =>
      seg.length >= TRACE_MIN_POINTS_PER_SEGMENT &&
      (i < activeSegmentIndex || activeSegment.length === 0),
  ).length;

  return (
    <View style={styles.root}>
      <Canvas style={styles.canvas}>
        {bgImage && (
          <Image
            image={bgImage}
            x={0}
            y={0}
            width={width}
            height={height}
            fit="cover"
          />
        )}

        {stars.map((star, i) => (
          <TwinkleStar key={i} star={star} />
        ))}

        {/* Glitter trails: behind the avatars, above the road / edge highlights. */}
        {!DEV_TRACE_PATH &&
          TROLLS.map((troll, i) => (
            <TrollTrail
              key={`trail-${i}`}
              startOffset={troll.startOffset}
              samples={samples}
              t={ride}
            />
          ))}

        {!DEV_TRACE_PATH &&
          TROLLS.map((troll, i) => (
            <TrollRider
              key={i}
              sheet={troll.sheet}
              meta={troll.meta}
              glowColor={troll.glowColor}
              startOffset={troll.startOffset}
              samples={samples}
              t={ride}
            />
          ))}

        {tracePreviewPaths.map(({ path, color, key }) => (
          <Path
            key={key}
            path={path}
            style="stroke"
            strokeWidth={2}
            color={color}
            opacity={0.9}
            strokeCap="round"
            strokeJoin="round"
            antiAlias
          />
        ))}

        {traceSegments.flatMap((seg, segIdx) =>
          seg.map((pt, i) => {
            const color = TRACE_SEGMENT_COLORS[segIdx % TRACE_SEGMENT_COLORS.length] ?? "#39ff14";
            return (
              <Group key={`${segIdx}-${i}`}>
                <Circle cx={pt.screenX} cy={pt.screenY} r={8} color={color} opacity={0.95} />
                <Circle cx={pt.screenX} cy={pt.screenY} r={4} color="#ffffff" opacity={0.95} />
              </Group>
            );
          }),
        )}
      </Canvas>

      {DEV_TRACE_PATH && (
        <>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={(e) => {
              const { locationX, locationY } = e.nativeEvent;
              handleTraceTap(locationX, locationY);
            }}
          />
          <View style={styles.traceHud} pointerEvents="none">
            <Text style={styles.traceHudText}>
              TRACE
              {TRACE_RETRACE_SEGMENT_2_ONLY ? " · seg 1 locked" : ""}
              {" · segment "}
              {activeSegmentIndex + 1}
              {" · "}
              {activeSegment.length} pts
              {savedSegmentCount > 0 ? ` · ${savedSegmentCount} saved` : ""}
              {totalTracePoints >= TRACE_MIN_POINTS ? " · combined logged ✓" : ""}
            </Text>
            <Text style={styles.traceHudHint}>
              {TRACE_RETRACE_SEGMENT_2_ONLY
                ? "Seg 1 locked (green) · trace seg 2 (cyan) · top-right logs · bottom-left clears seg 2"
                : "Top-left clears · top-right finishes segment (road exit / re-entry split)"}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  canvas: { flex: 1 },
  traceHud: {
    position: "absolute",
    top: 52,
    left: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  traceHudText: {
    color: "#39ff14",
    fontSize: 13,
    fontWeight: "600",
  },
  traceHudHint: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    marginTop: 2,
  },
});
