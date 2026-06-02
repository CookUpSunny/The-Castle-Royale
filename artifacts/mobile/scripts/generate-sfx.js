/* eslint-disable */
/**
 * Generates casino-style sound effect WAV files used by the in-game SFX layer.
 *
 * All sounds are short, mono, 22050Hz, 16-bit PCM — small enough to bundle
 * alongside the app and decode instantly on both web and native. Each
 * effect is synthesised from a handful of decaying sinusoids + an FM
 * shimmer to evoke the metallic ring of a Vegas slot floor without
 * needing any binary dependencies.
 *
 * Run with `node scripts/generate-sfx.js` from artifacts/mobile/. The
 * resulting WAVs are checked in under assets/audio/.
 */

const fs = require('fs');
const path = require('path');

const SR = 22050; // Sample rate
const OUT_DIR = path.resolve(__dirname, '..', 'assets', 'audio');

fs.mkdirSync(OUT_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
// Tone primitives.
// ─────────────────────────────────────────────────────────────────────────────

function makeBuffer(durationS) {
  const n = Math.floor(durationS * SR);
  return new Float32Array(n);
}

// Add a decaying partial to the buffer, starting at sampleStart, with
// frequency freq, amplitude amp, decay τ (seconds), and optional FM-style
// pitch sag.
function addPartial(buf, sampleStart, freq, amp, tau, opts = {}) {
  const { sag = 0, sagTau = 0.04, attack = 0.002, vibratoHz = 0, vibratoDepth = 0 } = opts;
  for (let i = sampleStart; i < buf.length; i++) {
    const t = (i - sampleStart) / SR;
    if (t < 0) continue;
    const env = Math.exp(-t / tau) * (1 - Math.exp(-t / attack));
    const sagF = sag ? freq * (1 - sag * Math.exp(-t / sagTau)) : freq;
    const vib = vibratoDepth ? vibratoDepth * Math.sin(2 * Math.PI * vibratoHz * t) : 0;
    buf[i] += amp * env * Math.sin(2 * Math.PI * sagF * t + vib);
  }
}

// Add a quick burst of band-limited noise (for the metallic "shoulder"
// of a coin clink and the breathy attack of a cash-register chime).
function addNoise(buf, sampleStart, amp, durationS) {
  const n = Math.floor(durationS * SR);
  for (let i = 0; i < n; i++) {
    const idx = sampleStart + i;
    if (idx >= buf.length) break;
    const t = i / n;
    const env = (1 - t) * (1 - t);
    buf[idx] += amp * env * (Math.random() * 2 - 1);
  }
}

function normalize(buf, peak = 0.92) {
  let max = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = Math.abs(buf[i]);
    if (v > max) max = v;
  }
  if (max <= 0) return;
  const g = peak / max;
  for (let i = 0; i < buf.length; i++) buf[i] *= g;
}

// Simple click + decay envelope for the very front edge — keeps tones
// from sounding like mushy sine waves on phone speakers.
function addClick(buf, sampleStart, amp, durationS = 0.005) {
  const n = Math.floor(durationS * SR);
  for (let i = 0; i < n; i++) {
    const idx = sampleStart + i;
    if (idx >= buf.length) break;
    const t = i / n;
    buf[idx] += amp * (1 - t) * (Math.random() * 2 - 1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WAV writer (16-bit PCM mono).
// ─────────────────────────────────────────────────────────────────────────────

function writeWav(buf, outPath) {
  const numSamples = buf.length;
  const byteRate = SR * 2;
  const dataSize = numSamples * 2;
  const fileSize = 36 + dataSize;
  const out = Buffer.alloc(44 + dataSize);
  let p = 0;
  out.write('RIFF', p); p += 4;
  out.writeUInt32LE(fileSize, p); p += 4;
  out.write('WAVE', p); p += 4;
  out.write('fmt ', p); p += 4;
  out.writeUInt32LE(16, p); p += 4;       // PCM chunk size
  out.writeUInt16LE(1, p); p += 2;        // format = PCM
  out.writeUInt16LE(1, p); p += 2;        // channels = mono
  out.writeUInt32LE(SR, p); p += 4;       // sample rate
  out.writeUInt32LE(byteRate, p); p += 4; // byte rate
  out.writeUInt16LE(2, p); p += 2;        // block align
  out.writeUInt16LE(16, p); p += 2;       // bits per sample
  out.write('data', p); p += 4;
  out.writeUInt32LE(dataSize, p); p += 4;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, buf[i]));
    out.writeInt16LE(Math.round(s * 32767), p);
    p += 2;
  }
  fs.writeFileSync(outPath, out);
  console.log(`  wrote ${path.relative(process.cwd(), outPath)} (${(out.length / 1024).toFixed(1)} KB)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Patches.
// ─────────────────────────────────────────────────────────────────────────────

// Single coin clink — short, bright, metallic.
function coinClink(durationS = 0.32) {
  const buf = makeBuffer(durationS);
  addClick(buf, 0, 0.55, 0.004);
  addNoise(buf, 0, 0.35, 0.025);
  // Two strong inharmonic partials give a bell-like "ting".
  addPartial(buf, 0, 3300, 0.6, 0.18, { attack: 0.001 });
  addPartial(buf, 0, 4980, 0.45, 0.14, { attack: 0.001 });
  addPartial(buf, 0, 6650, 0.25, 0.08, { attack: 0.001 });
  // Subtle low body.
  addPartial(buf, 0, 880, 0.18, 0.10, { attack: 0.002 });
  normalize(buf, 0.9);
  return buf;
}

// Quick cluster of coin clinks — the "you hit a payline" feel.
function coinStack() {
  const buf = makeBuffer(0.85);
  const beats = [
    { t: 0.00, p: 1.00, freq: [3300, 4980, 6650] },
    { t: 0.09, p: 0.85, freq: [3700, 5560, 7100] },
    { t: 0.20, p: 0.78, freq: [3050, 4570, 6200] },
    { t: 0.34, p: 0.72, freq: [3520, 5280, 7000] },
    { t: 0.49, p: 0.62, freq: [3160, 4740, 6320] },
    { t: 0.66, p: 0.55, freq: [3800, 5700, 7400] },
  ];
  for (const b of beats) {
    const start = Math.floor(b.t * SR);
    addClick(buf, start, 0.45 * b.p, 0.003);
    addNoise(buf, start, 0.28 * b.p, 0.022);
    addPartial(buf, start, b.freq[0], 0.55 * b.p, 0.16, { attack: 0.001 });
    addPartial(buf, start, b.freq[1], 0.42 * b.p, 0.12, { attack: 0.001 });
    addPartial(buf, start, b.freq[2], 0.22 * b.p, 0.07, { attack: 0.001 });
    addPartial(buf, start, 880 + b.t * 200, 0.15 * b.p, 0.10);
  }
  normalize(buf, 0.92);
  return buf;
}

// Big slot-machine bell — long ringing tone, used for deck burn.
function slotBell() {
  const buf = makeBuffer(1.1);
  addClick(buf, 0, 0.4, 0.003);
  addNoise(buf, 0, 0.3, 0.018);
  // Bell-ish stacked partials with mild pitch sag for the strike.
  addPartial(buf, 0, 880,  0.55, 0.55, { attack: 0.002, sag: 0.02 });
  addPartial(buf, 0, 1320, 0.40, 0.42, { attack: 0.002, sag: 0.02 });
  addPartial(buf, 0, 1760, 0.32, 0.32, { attack: 0.002 });
  addPartial(buf, 0, 2640, 0.22, 0.22, { attack: 0.002 });
  addPartial(buf, 0, 3520, 0.16, 0.18, { attack: 0.002 });
  // A second strike a beat later for the "ding-ding" feel.
  const second = Math.floor(0.18 * SR);
  addClick(buf, second, 0.32, 0.003);
  addPartial(buf, second, 880,  0.42, 0.45, { attack: 0.002 });
  addPartial(buf, second, 1320, 0.30, 0.34, { attack: 0.002 });
  addPartial(buf, second, 1760, 0.22, 0.26, { attack: 0.002 });
  addPartial(buf, second, 2640, 0.16, 0.18, { attack: 0.002 });
  normalize(buf, 0.95);
  return buf;
}

// Light reset chime — softer, sweeping tone for 2-RESET.
function resetChime() {
  const buf = makeBuffer(0.7);
  addClick(buf, 0, 0.18, 0.002);
  // Two quick rising partials w/ vibrato.
  addPartial(buf, 0, 1200, 0.5, 0.30, { attack: 0.005, vibratoHz: 6, vibratoDepth: 0.12 });
  addPartial(buf, 0, 1800, 0.35, 0.28, { attack: 0.006 });
  addPartial(buf, 0, 2400, 0.20, 0.22, { attack: 0.008 });
  // Echo at +120ms one note higher.
  const echo = Math.floor(0.13 * SR);
  addPartial(buf, echo, 1500, 0.4, 0.28, { attack: 0.005 });
  addPartial(buf, echo, 2250, 0.28, 0.24, { attack: 0.006 });
  addPartial(buf, echo, 3000, 0.16, 0.20, { attack: 0.008 });
  normalize(buf, 0.88);
  return buf;
}

// Jackpot fanfare — ascending bell tones for the bottom-castle milestone.
function jackpot() {
  const buf = makeBuffer(1.85);
  // Notes in a major arpeggio: C, E, G, C, then a held C+E+G chord.
  const notes = [
    { t: 0.00, f: 523 },   // C5
    { t: 0.16, f: 659 },   // E5
    { t: 0.32, f: 784 },   // G5
    { t: 0.48, f: 1047 },  // C6
  ];
  for (const n of notes) {
    const start = Math.floor(n.t * SR);
    addClick(buf, start, 0.25, 0.003);
    addPartial(buf, start, n.f,        0.55, 0.30, { attack: 0.003 });
    addPartial(buf, start, n.f * 2,    0.30, 0.22, { attack: 0.003 });
    addPartial(buf, start, n.f * 3,    0.18, 0.16, { attack: 0.003 });
    addPartial(buf, start, n.f * 4.1,  0.10, 0.10, { attack: 0.003 });
  }
  // Held chord at the end + sparkle noise.
  const hold = Math.floor(0.66 * SR);
  for (const f of [523, 659, 784, 1047]) {
    addPartial(buf, hold, f,       0.45, 0.65, { attack: 0.005 });
    addPartial(buf, hold, f * 2,   0.25, 0.5,  { attack: 0.005 });
    addPartial(buf, hold, f * 3,   0.14, 0.35, { attack: 0.005 });
  }
  // Sparkle hit — high register coin shimmer ride-out.
  for (let s = 0; s < 6; s++) {
    const t = 0.66 + s * 0.16;
    const idx = Math.floor(t * SR);
    if (idx >= buf.length) break;
    addPartial(buf, idx, 4200 + (s % 2) * 500, 0.20, 0.10, { attack: 0.001 });
    addPartial(buf, idx, 6300 + (s % 2) * 400, 0.13, 0.08, { attack: 0.001 });
  }
  normalize(buf, 0.96);
  return buf;
}

// Pickup pile — descending "buzz" sad trombone (light), used when picking up.
function pickup() {
  const buf = makeBuffer(0.55);
  addClick(buf, 0, 0.2, 0.003);
  // Descending stack of partials with vibrato.
  for (let s = 0; s < 4; s++) {
    const t = s * 0.10;
    const idx = Math.floor(t * SR);
    const base = 580 - s * 70;
    addPartial(buf, idx, base,       0.55, 0.18, { attack: 0.005, vibratoHz: 5, vibratoDepth: 0.2 });
    addPartial(buf, idx, base * 1.5, 0.30, 0.16, { attack: 0.005 });
    addPartial(buf, idx, base * 2,   0.18, 0.13, { attack: 0.005 });
  }
  normalize(buf, 0.78);
  return buf;
}

/** One-shot classic slot: lever thunk, spin ticks, three reel stops, tiny payoff. */
function slotMachine() {
  const buf = makeBuffer(1.38);
  // Lever pull / mechanism
  addClick(buf, 0, 0.5, 0.006);
  addNoise(buf, Math.floor(0.018 * SR), 0.22, 0.035);
  addPartial(buf, Math.floor(0.02 * SR), 160, 0.38, 0.07, { attack: 0.001 });
  // Spin ticks
  for (let k = 0; k < 9; k++) {
    const idx = Math.floor((0.075 + k * 0.038) * SR);
    addClick(buf, idx, 0.14, 0.002);
    addNoise(buf, idx, 0.06, 0.012);
  }
  // Three reel stops (clunk + ding)
  const stops = [0.44, 0.57, 0.71];
  for (let s = 0; s < stops.length; s++) {
    const idx = Math.floor(stops[s] * SR);
    addClick(buf, idx, 0.42, 0.003);
    addPartial(buf, idx, 2400 + s * 220, 0.48, 0.13, { attack: 0.001 });
    addPartial(buf, idx, 3600 + s * 180, 0.32, 0.10, { attack: 0.001 });
    addPartial(buf, idx, 5000, 0.18, 0.08, { attack: 0.001 });
  }
  // Payoff chime
  const pay = Math.floor(0.9 * SR);
  addClick(buf, pay, 0.28, 0.002);
  addPartial(buf, pay, 880, 0.32, 0.22);
  addPartial(buf, pay, 1320, 0.26, 0.18);
  addNoise(buf, pay, 0.16, 0.028);
  normalize(buf, 0.93);
  return buf;
}

// ─────────────────────────────────────────────────────────────────────────────
// Alternative slot cues (pick one and copy/rename to slot-machine.wav, or
// wire a second name in lib/sfx.ts). Preview all: open sfx-alternatives-preview.html
// in a browser from the artifacts/mobile folder.
// ─────────────────────────────────────────────────────────────────────────────

/** A — Vintage floor: slower mechanical spin, darker brassy stops, longer tail. */
function slotAltVintage() {
  const buf = makeBuffer(1.55);
  addClick(buf, 0, 0.48, 0.007);
  addNoise(buf, Math.floor(0.02 * SR), 0.18, 0.04);
  addPartial(buf, Math.floor(0.022 * SR), 95, 0.45, 0.12, { attack: 0.002 });
  for (let k = 0; k < 7; k++) {
    const idx = Math.floor((0.1 + k * 0.052) * SR);
    addClick(buf, idx, 0.12, 0.0025);
    addNoise(buf, idx, 0.05, 0.014);
    addPartial(buf, idx, 140 + k * 15, 0.2, 0.05);
  }
  const stops = [0.5, 0.68, 0.9];
  for (let s = 0; s < stops.length; s++) {
    const idx = Math.floor(stops[s] * SR);
    addClick(buf, idx, 0.38, 0.004);
    addPartial(buf, idx, 620 + s * 80, 0.42, 0.18, { attack: 0.002 });
    addPartial(buf, idx, 1240 + s * 100, 0.32, 0.15, { attack: 0.002 });
    addPartial(buf, idx, 2200 + s * 150, 0.22, 0.12, { attack: 0.001 });
  }
  const pay = Math.floor(1.05 * SR);
  addPartial(buf, pay, 440, 0.28, 0.35);
  addPartial(buf, pay, 880, 0.22, 0.28);
  addNoise(buf, pay, 0.12, 0.04);
  normalize(buf, 0.91);
  return buf;
}

/** B — Bright strip: fast ticks, shiny high reel locks, sparkly payoff. */
function slotAltBright() {
  const buf = makeBuffer(1.15);
  addClick(buf, 0, 0.42, 0.004);
  addNoise(buf, Math.floor(0.012 * SR), 0.26, 0.025);
  for (let k = 0; k < 12; k++) {
    const idx = Math.floor((0.06 + k * 0.028) * SR);
    addClick(buf, idx, 0.11, 0.0018);
    addPartial(buf, idx, 3000 + (k % 3) * 400, 0.15, 0.04, { attack: 0.001 });
  }
  const stops = [0.4, 0.52, 0.63];
  for (let s = 0; s < stops.length; s++) {
    const idx = Math.floor(stops[s] * SR);
    addClick(buf, idx, 0.35, 0.002);
    addPartial(buf, idx, 3200 + s * 300, 0.55, 0.11, { attack: 0.001 });
    addPartial(buf, idx, 4800 + s * 200, 0.35, 0.09, { attack: 0.001 });
    addNoise(buf, idx, 0.14, 0.018);
  }
  const pay = Math.floor(0.78 * SR);
  for (let i = 0; i < 5; i++) {
    const idx = pay + Math.floor(i * 0.045 * SR);
    if (idx >= buf.length) break;
    addPartial(buf, idx, 4000 + i * 250, 0.2, 0.08, { attack: 0.001 });
  }
  normalize(buf, 0.94);
  return buf;
}

/** C — Tight / mobile: ~0.75s — lever, short whirl, two stops + coin hit. */
function slotAltTight() {
  const buf = makeBuffer(0.78);
  addClick(buf, 0, 0.52, 0.005);
  addNoise(buf, Math.floor(0.015 * SR), 0.2, 0.03);
  for (let k = 0; k < 5; k++) {
    const idx = Math.floor((0.08 + k * 0.045) * SR);
    addClick(buf, idx, 0.1, 0.002);
  }
  for (let s = 0; s < 2; s++) {
    const idx = Math.floor((0.35 + s * 0.12) * SR);
    addClick(buf, idx, 0.36, 0.003);
    addPartial(buf, idx, 2600 + s * 400, 0.5, 0.12, { attack: 0.001 });
    addPartial(buf, idx, 4200, 0.3, 0.09, { attack: 0.001 });
  }
  const pay = Math.floor(0.62 * SR);
  addPartial(buf, pay, 1310, 0.4, 0.14);
  addPartial(buf, pay, 2620, 0.25, 0.11);
  addClick(buf, pay, 0.22, 0.002);
  normalize(buf, 0.92);
  return buf;
}

/** D — Digital / video-slot: beepy steps, less mechanical noise. */
function slotAltDigital() {
  const buf = makeBuffer(1.05);
  addClick(buf, 0, 0.25, 0.002);
  const beeps = [900, 1100, 900, 1300, 1100, 1500, 1300, 1700];
  for (let k = 0; k < beeps.length; k++) {
    const idx = Math.floor((0.06 + k * 0.052) * SR);
    addPartial(buf, idx, beeps[k], 0.35, 0.06, { attack: 0.001 });
    addPartial(buf, idx, beeps[k] * 2, 0.15, 0.05, { attack: 0.001 });
  }
  const locks = [0.5, 0.62, 0.74];
  const lf = [1200, 1500, 1800];
  for (let s = 0; s < 3; s++) {
    const idx = Math.floor(locks[s] * SR);
    addClick(buf, idx, 0.2, 0.002);
    addPartial(buf, idx, lf[s], 0.45, 0.12, { attack: 0.001 });
    addPartial(buf, idx, lf[s] * 2, 0.25, 0.09, { attack: 0.001 });
  }
  const pay = Math.floor(0.88 * SR);
  addPartial(buf, pay, 2000, 0.3, 0.1);
  addPartial(buf, pay, 3000, 0.2, 0.08);
  normalize(buf, 0.9);
  return buf;
}

/** E — Heavy cabinet: big low thunk, slow weighted stops. */
function slotAltHeavy() {
  const buf = makeBuffer(1.45);
  addClick(buf, 0, 0.62, 0.008);
  addNoise(buf, Math.floor(0.02 * SR), 0.32, 0.045);
  addPartial(buf, Math.floor(0.025 * SR), 55, 0.55, 0.2, { attack: 0.003 });
  addPartial(buf, Math.floor(0.025 * SR), 110, 0.4, 0.18);
  for (let k = 0; k < 6; k++) {
    const idx = Math.floor((0.12 + k * 0.065) * SR);
    addClick(buf, idx, 0.22, 0.003);
    addPartial(buf, idx, 75 + k * 8, 0.25, 0.06);
  }
  const stops = [0.55, 0.78, 1.02];
  for (let s = 0; s < stops.length; s++) {
    const idx = Math.floor(stops[s] * SR);
    addClick(buf, idx, 0.48, 0.005);
    addNoise(buf, idx, 0.2, 0.03);
    addPartial(buf, idx, 180 + s * 40, 0.48, 0.22);
    addPartial(buf, idx, 540 + s * 120, 0.35, 0.16);
    addPartial(buf, idx, 1100 + s * 200, 0.22, 0.12);
  }
  normalize(buf, 0.9);
  return buf;
}

/** F — Fanfare end: like default arc but finishes on a tiny major arp flourish. */
function slotAltFanfare() {
  const buf = makeBuffer(1.42);
  addClick(buf, 0, 0.48, 0.005);
  addNoise(buf, Math.floor(0.016 * SR), 0.2, 0.03);
  for (let k = 0; k < 8; k++) {
    const idx = Math.floor((0.07 + k * 0.036) * SR);
    addClick(buf, idx, 0.12, 0.002);
  }
  const stops = [0.38, 0.52, 0.66];
  for (let s = 0; s < stops.length; s++) {
    const idx = Math.floor(stops[s] * SR);
    addClick(buf, idx, 0.38, 0.003);
    addPartial(buf, idx, 2000 + s * 200, 0.45, 0.12, { attack: 0.001 });
    addPartial(buf, idx, 3200, 0.3, 0.1, { attack: 0.001 });
  }
  // Mini fanfare C–E–G
  const fan = [
    { t: 0.82, f: 523 },
    { t: 0.92, f: 659 },
    { t: 1.02, f: 784 },
  ];
  for (const n of fan) {
    const idx = Math.floor(n.t * SR);
    if (idx >= buf.length) continue;
    addClick(buf, idx, 0.2, 0.002);
    addPartial(buf, idx, n.f, 0.38, 0.2, { attack: 0.003 });
    addPartial(buf, idx, n.f * 2, 0.2, 0.14, { attack: 0.003 });
  }
  normalize(buf, 0.92);
  return buf;
}

// ─────────────────────────────────────────────────────────────────────────────
// Grand fanfares — mid-game castle layers (see useGameMilestones) & preview alts.
// Match win uses fanfare-victory.wav (slot jackpot / hand-pay style, below).
// ─────────────────────────────────────────────────────────────────────────────

/** In-game default: brassy stairs-up + major chord + sparkles + cadence ~2.35s */
function fanfareEpic() {
  const buf = makeBuffer(2.38);
  addPartial(buf, Math.floor(0.03 * SR), 110, 0.32, 0.95, { attack: 0.06 });
  addPartial(buf, Math.floor(0.03 * SR), 220, 0.28, 0.85, { attack: 0.06 });
  const stairT = [0.18, 0.34, 0.5];
  const stairF = [349, 440, 523];
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(stairT[i] * SR);
    addClick(buf, idx, 0.32, 0.003);
    addPartial(buf, idx, stairF[i], 0.52, 0.38, { attack: 0.008 });
    addPartial(buf, idx, stairF[i] * 2, 0.32, 0.28, { attack: 0.008 });
    addPartial(buf, idx, stairF[i] * 3, 0.2, 0.2, { attack: 0.008 });
  }
  const chordIdx = Math.floor(0.72 * SR);
  addClick(buf, chordIdx, 0.28, 0.003);
  for (const f of [392, 494, 587, 784]) {
    addPartial(buf, chordIdx, f, 0.48, 0.62, { attack: 0.02 });
    addPartial(buf, chordIdx, f * 2, 0.26, 0.45, { attack: 0.02 });
  }
  for (let s = 0; s < 10; s++) {
    const t = 0.92 + s * 0.085;
    const ix = Math.floor(t * SR);
    if (ix >= buf.length) break;
    addPartial(buf, ix, 1800 + (s % 5) * 350, 0.22, 0.14, { attack: 0.001 });
    addNoise(buf, ix, 0.05, 0.012);
  }
  const fin = Math.floor(1.82 * SR);
  addClick(buf, fin, 0.4, 0.004);
  addPartial(buf, fin, 523, 0.42, 0.52);
  addPartial(buf, fin, 659, 0.32, 0.45);
  addPartial(buf, fin, 1047, 0.35, 0.42);
  addNoise(buf, fin, 0.12, 0.045);
  normalize(buf, 0.93);
  return buf;
}

/** Option A — Regal / slow coronation: one deep pedal + distant bells */
function fanfareOptRegal() {
  const buf = makeBuffer(2.65);
  addPartial(buf, 0, 65, 0.4, 1.2, { attack: 0.12 });
  addPartial(buf, 0, 130, 0.35, 1.0, { attack: 0.12 });
  const bells = [
    { t: 0.45, f: 880 },
    { t: 0.72, f: 988 },
    { t: 0.95, f: 1175 },
    { t: 1.25, f: 1319 },
  ];
  for (const b of bells) {
    const idx = Math.floor(b.t * SR);
    addClick(buf, idx, 0.22, 0.002);
    addPartial(buf, idx, b.f, 0.55, 0.45, { attack: 0.003 });
    addPartial(buf, idx, b.f * 2, 0.3, 0.32, { attack: 0.003 });
    addPartial(buf, idx, b.f * 3, 0.16, 0.22, { attack: 0.003 });
  }
  const boom = Math.floor(1.55 * SR);
  addClick(buf, boom, 0.45, 0.005);
  for (const f of [196, 262, 330, 392]) {
    addPartial(buf, boom, f, 0.38, 0.75, { attack: 0.02 });
  }
  normalize(buf, 0.9);
  return buf;
}

/** Option B — Herald / athletic: rhythmic brass hits, shorter */
function fanfareOptHerald() {
  const buf = makeBuffer(1.95);
  const pat = [392, 440, 523, 587, 659, 784];
  for (let i = 0; i < pat.length; i++) {
    const idx = Math.floor((0.08 + i * 0.14) * SR);
    addClick(buf, idx, 0.35, 0.003);
    const f = pat[i];
    addPartial(buf, idx, f, 0.5, 0.22, { attack: 0.004 });
    addPartial(buf, idx, f * 2, 0.28, 0.16, { attack: 0.004 });
  }
  const hold = Math.floor(1.02 * SR);
  for (const f of [523, 659, 784]) {
    addPartial(buf, hold, f, 0.45, 0.55, { attack: 0.015 });
    addPartial(buf, hold, f * 2, 0.25, 0.38, { attack: 0.015 });
  }
  addNoise(buf, Math.floor(1.45 * SR), 0.14, 0.04);
  normalize(buf, 0.93);
  return buf;
}

/** Option C — Cinema: noise swell + wide stacked fifths */
function fanfareOptCinema() {
  const buf = makeBuffer(2.5);
  for (let i = 0; i < Math.floor(0.55 * SR); i++) {
    const t = i / SR;
    const env = t / 0.55;
    buf[i] += 0.18 * env * env * (Math.random() * 2 - 1);
  }
  const hits = [
    { t: 0.42, f: 174 },
    { t: 0.58, f: 262 },
    { t: 0.76, f: 349 },
  ];
  for (const h of hits) {
    const idx = Math.floor(h.t * SR);
    addClick(buf, idx, 0.4, 0.004);
    addPartial(buf, idx, h.f, 0.55, 0.55, { attack: 0.03 });
    addPartial(buf, idx, h.f * 3, 0.35, 0.38, { attack: 0.03 });
    addPartial(buf, idx, h.f * 5, 0.22, 0.28, { attack: 0.03 });
  }
  const wide = Math.floor(1.05 * SR);
  for (const f of [220, 330, 440, 554]) {
    addPartial(buf, wide, f, 0.4, 0.85, { attack: 0.04 });
  }
  const sparkle = Math.floor(1.75 * SR);
  addPartial(buf, sparkle, 2093, 0.35, 0.35);
  addPartial(buf, sparkle, 2794, 0.22, 0.28);
  normalize(buf, 0.9);
  return buf;
}

/** Option D — Game-show run: fast rising arpeggio + payoff ping */
function fanfareOptGameshow() {
  const buf = makeBuffer(2.1);
  const notes = [523, 587, 659, 784, 880, 988, 1047, 1175];
  for (let k = 0; k < notes.length; k++) {
    const idx = Math.floor((0.06 + k * 0.068) * SR);
    addPartial(buf, idx, notes[k], 0.42, 0.12, { attack: 0.002 });
    addPartial(buf, idx, notes[k] * 2, 0.2, 0.09, { attack: 0.002 });
    addClick(buf, idx, 0.2, 0.002);
  }
  const pay = Math.floor(0.75 * SR);
  addClick(buf, pay, 0.48, 0.003);
  for (const f of [1047, 1319, 1568]) {
    addPartial(buf, pay, f, 0.45, 0.4, { attack: 0.005 });
  }
  for (let s = 0; s < 6; s++) {
    const ix = Math.floor((1.15 + s * 0.09) * SR);
    if (ix >= buf.length) break;
    addPartial(buf, ix, 2500 + s * 180, 0.16, 0.1, { attack: 0.001 });
  }
  normalize(buf, 0.92);
  return buf;
}

/** Option E — Cathedral: low hum + Tierce bells + long decay shimmer */
function fanfareOptCathedral() {
  const buf = makeBuffer(2.8);
  addPartial(buf, 0, 98, 0.45, 1.4, { attack: 0.15 });
  addPartial(buf, 0, 147, 0.35, 1.2, { attack: 0.15 });
  const peal = [0.35, 0.52, 0.7, 0.9, 1.15, 1.42];
  for (let i = 0; i < peal.length; i++) {
    const idx = Math.floor(peal[i] * SR);
    const f = 660 + i * 55;
    addClick(buf, idx, 0.18, 0.002);
    addPartial(buf, idx, f, 0.5, 0.55, { attack: 0.004 });
    addPartial(buf, idx, f * 2, 0.35, 0.4, { attack: 0.004 });
    addPartial(buf, idx, f * 4, 0.18, 0.3, { attack: 0.004 });
  }
  const tail = Math.floor(1.75 * SR);
  for (let j = 0; j < 12; j++) {
    const ix = tail + Math.floor(j * 0.055 * SR);
    if (ix >= buf.length) break;
    addPartial(buf, ix, 1200 + j * 90, 0.12 * (1 - j / 14), 0.35, { attack: 0.001 });
  }
  normalize(buf, 0.88);
  return buf;
}

// ─────────────────────────────────────────────────────────────────────────────
// Match win — casino slot jackpot hand-pay style (fanfare-victory.wav).
// Same reel-lock / tray timbre DNA as slotMachine(), extended with credit bleeps,
// hopper pour, and major chord land — not a generic coin foley shower.
// ─────────────────────────────────────────────────────────────────────────────

/** One coin hitting the brass tray (matches reel-stop metallic DNA). */
function addSlotTrayCoin(buf, sampleStart, amp, variant) {
  const a = amp * (0.88 + (variant % 3) * 0.07);
  addClick(buf, sampleStart, 0.38 * a, 0.0022);
  addNoise(buf, sampleStart, 0.11 * a, 0.012 + (variant % 4) * 0.004);
  const r = 2320 + (variant * 47) % 720;
  addPartial(buf, sampleStart, r, 0.46 * a, 0.078, { attack: 0.001 });
  addPartial(buf, sampleStart, r * 1.46, 0.29 * a, 0.062, { attack: 0.001 });
  addPartial(buf, sampleStart, 4920 + (variant % 4) * 140, 0.17 * a, 0.058, { attack: 0.001 });
  addPartial(buf, sampleStart, 118 + (variant % 6) * 22, 0.11 * a, 0.038);
}

/**
 * ~4.1s content + ring-out tail: classic floor-slot big win — spin blur → 3 reel
 * locks → credit counter → tray dump → major chord + sparkles (buffer lasts for full decay).
 */
function victorySlotJackpot() {
  const durationS = 4.45;
  const buf = makeBuffer(durationS);

  addClick(buf, 0, 0.35, 0.005);
  addNoise(buf, Math.floor(0.014 * SR), 0.2, 0.032);
  addPartial(buf, Math.floor(0.016 * SR), 155, 0.32, 0.065, { attack: 0.001 });

  let tTick = 0.055;
  for (let k = 0; k < 8; k++) {
    const idx = Math.floor(tTick * SR);
    addClick(buf, idx, 0.13, 0.002);
    addNoise(buf, idx, 0.054, 0.011);
    tTick += Math.max(0.022, 0.054 - k * 0.0036);
  }

  const stops = [0.38, 0.52, 0.66];
  for (let s = 0; s < stops.length; s++) {
    const idx = Math.floor(stops[s] * SR);
    addClick(buf, idx, 0.46, 0.0035);
    addPartial(buf, idx, 2400 + s * 220, 0.52, 0.15, { attack: 0.001 });
    addPartial(buf, idx, 3600 + s * 180, 0.35, 0.12, { attack: 0.001 });
    addPartial(buf, idx, 5000, 0.21, 0.09, { attack: 0.001 });
    addNoise(buf, idx, 0.11, 0.019);
  }

  const bleeps = [784, 880, 988, 1047, 1175, 1319, 1480, 1568, 1760, 1976, 2093];
  let bt = 0.73;
  for (let b = 0; b < bleeps.length; b++) {
    const idx = Math.floor(bt * SR);
    const f = bleeps[b];
    addClick(buf, idx, 0.17, 0.002);
    addPartial(buf, idx, f, 0.3, 0.075, { attack: 0.001 });
    addPartial(buf, idx, f * 2, 0.14, 0.056, { attack: 0.001 });
    bt += b < 4 ? 0.042 : 0.033;
  }

  let ct = 1.08;
  let coinIx = 0;
  while (ct < 2.64) {
    const phase = (ct - 1.08) / 1.56;
    let gap;
    if (phase < 0.22) gap = 0.048 - phase * 0.14;
    else if (phase < 0.68) gap = 0.012 + ((coinIx * 17) % 6) * 0.0016;
    else gap = 0.015 + (phase - 0.68) * 0.085;
    const idx = Math.floor(ct * SR);
    if (idx < buf.length) {
      const loud = 0.62 + 0.5 * Math.pow(Math.sin(Math.PI * Math.min(1, phase * 1.05)), 1.4);
      addSlotTrayCoin(buf, idx, loud, coinIx);
      if (phase > 0.3 && phase < 0.75 && coinIx % 7 === 0) {
        addPartial(buf, idx, 65, 0.22 * loud, 0.028, { attack: 0.001 });
      }
    }
    coinIx += 1;
    ct += Math.max(0.0085, gap);
  }

  const notes = [
    { t: 2.68, f: 523 },
    { t: 2.81, f: 659 },
    { t: 2.93, f: 784 },
    { t: 3.06, f: 1047 },
  ];
  for (const n of notes) {
    const start = Math.floor(n.t * SR);
    if (start >= buf.length) continue;
    addClick(buf, start, 0.26, 0.003);
    addPartial(buf, start, n.f, 0.5, 0.26, { attack: 0.003 });
    addPartial(buf, start, n.f * 2, 0.27, 0.19, { attack: 0.003 });
    addPartial(buf, start, n.f * 3, 0.14, 0.14, { attack: 0.003 });
  }
  const hold = Math.floor(3.18 * SR);
  if (hold < buf.length) {
    for (const f of [523, 659, 784, 1047]) {
      addPartial(buf, hold, f, 0.4, 0.72, { attack: 0.006 });
      addPartial(buf, hold, f * 2, 0.22, 0.52, { attack: 0.006 });
    }
    addNoise(buf, hold, 0.14, 0.032);
  }
  for (let s = 0; s < 7; s++) {
    const idx = Math.floor((3.18 + s * 0.048) * SR);
    if (idx >= buf.length) break;
    addPartial(buf, idx, 4000 + (s % 3) * 450, 0.17, 0.11, { attack: 0.001 });
    addPartial(buf, idx, 6000 + (s % 2) * 350, 0.11, 0.095, { attack: 0.001 });
  }

  normalize(buf, 0.93);
  return buf;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate.
// ─────────────────────────────────────────────────────────────────────────────

console.log('Generating SFX into', OUT_DIR);
writeWav(coinClink(),     path.join(OUT_DIR, 'coin.wav'));
writeWav(coinStack(),     path.join(OUT_DIR, 'coin-stack.wav'));
writeWav(slotBell(),      path.join(OUT_DIR, 'bell.wav'));
writeWav(resetChime(),    path.join(OUT_DIR, 'reset.wav'));
writeWav(jackpot(),       path.join(OUT_DIR, 'jackpot.wav'));
writeWav(pickup(),        path.join(OUT_DIR, 'pickup.wav'));
writeWav(slotMachine(),   path.join(OUT_DIR, 'slot-machine.wav'));
console.log('Slot alternatives (A–F):');
writeWav(slotAltVintage(), path.join(OUT_DIR, 'slot-alt-a-vintage.wav'));
writeWav(slotAltBright(), path.join(OUT_DIR, 'slot-alt-b-bright.wav'));
writeWav(slotAltTight(), path.join(OUT_DIR, 'slot-alt-c-tight.wav'));
writeWav(slotAltDigital(), path.join(OUT_DIR, 'slot-alt-d-digital.wav'));
writeWav(slotAltHeavy(), path.join(OUT_DIR, 'slot-alt-e-heavy.wav'));
writeWav(slotAltFanfare(), path.join(OUT_DIR, 'slot-alt-f-fanfare.wav'));
console.log('Fanfares (castle milestones + legacy preview alts):');
writeWav(fanfareEpic(), path.join(OUT_DIR, 'fanfare-epic.wav'));
writeWav(fanfareOptRegal(), path.join(OUT_DIR, 'fanfare-opt-a-regal.wav'));
writeWav(fanfareOptHerald(), path.join(OUT_DIR, 'fanfare-opt-b-herald.wav'));
writeWav(fanfareOptCinema(), path.join(OUT_DIR, 'fanfare-opt-c-cinema.wav'));
writeWav(fanfareOptGameshow(), path.join(OUT_DIR, 'fanfare-opt-d-gameshow.wav'));
writeWav(fanfareOptCathedral(), path.join(OUT_DIR, 'fanfare-opt-e-cathedral.wav'));
console.log('Victory (slot jackpot — fanfare-victory.wav):');
writeWav(victorySlotJackpot(), path.join(OUT_DIR, 'fanfare-victory.wav'));
console.log('Done.');
