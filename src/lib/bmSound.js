// 별마루 소리 (2026-11-15 '다 해줘' 2묶음) — 소리 파일 없이 브라우저에서 바로 만듦(Web Audio).
// 바람(걸러 낸 잡음) · 풀벌레(짧은 고음 울림) · 풍경(맑은 종소리 가끔) · 합장 방울 · 명상 소리(낮게 깔리는 화음).
// 브라우저 규칙상 사용자가 무언가를 누른 뒤에만 켤 수 있음 → ensure() 를 버튼 안에서 부름.
let ctx = null;
let master = null;
let ambientNodes = [];
let timers = [];
let padNodes = [];

function ensure() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  return ctx;
}

function noiseBuffer() {
  const len = ctx.sampleRate * 2;
  const b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

// 맑은 종소리 한 번 (풍경·방울)
function bellAt(freq, vol = 0.05, decay = 3) {
  if (!ctx) return;
  const t = ctx.currentTime;
  [1, 2.76, 5.4].forEach((k, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq * k;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol / (i + 1), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay / (i + 1));
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + decay);
  });
}

function chirp() {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 3; i++) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 4300 + Math.random() * 300;
    const st = t + i * 0.07;
    g.gain.setValueAtTime(0.0001, st);
    g.gain.exponentialRampToValueAtTime(0.012, st + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, st + 0.05);
    o.connect(g).connect(master);
    o.start(st);
    o.stop(st + 0.06);
  }
}

const PENTA = [1046.5, 1174.7, 1318.5, 1568, 1760]; // 높은 5음계

export function startAmbient() {
  if (!ensure() || ambientNodes.length) return;
  // 바람
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer();
  src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 420;
  bp.Q.value = 0.6;
  const g = ctx.createGain();
  g.gain.value = 0.035;
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  lfo.frequency.value = 0.07;
  lfoG.gain.value = 0.02;
  lfo.connect(lfoG).connect(g.gain);
  src.connect(bp).connect(g).connect(master);
  src.start();
  lfo.start();
  ambientNodes = [src, lfo];
  // 풀벌레 · 풍경
  const loopChirp = () => {
    chirp();
    timers.push(setTimeout(loopChirp, 900 + Math.random() * 2600));
  };
  const loopChime = () => {
    bellAt(PENTA[Math.floor(Math.random() * PENTA.length)], 0.025, 3.5);
    timers.push(setTimeout(loopChime, 6000 + Math.random() * 9000));
  };
  timers.push(setTimeout(loopChirp, 600));
  timers.push(setTimeout(loopChime, 2500));
}

export function stopAmbient() {
  ambientNodes.forEach((n) => {
    try {
      n.stop();
    } catch {
      /* 이미 멈춤 */
    }
  });
  ambientNodes = [];
  timers.forEach(clearTimeout);
  timers = [];
}

// 명상 소리: 낮게 깔리는 화음(천천히 숨쉬듯 커졌다 작아짐)
export function startPad() {
  if (!ensure() || padNodes.length) return;
  const out = ctx.createGain();
  out.gain.value = 0;
  out.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 3);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 700;
  const breath = ctx.createOscillator();
  const breathG = ctx.createGain();
  breath.frequency.value = 0.125; // 8초 한 번 (숨 고르기와 같은 박자)
  breathG.gain.value = 0.018;
  breath.connect(breathG).connect(out.gain);
  const oscs = [110, 164.8, 220, 277.2].map((f, i) => {
    const o = ctx.createOscillator();
    o.type = i % 2 ? 'triangle' : 'sine';
    o.frequency.value = f;
    o.detune.value = (Math.random() - 0.5) * 8;
    o.connect(lp);
    o.start();
    return o;
  });
  lp.connect(out).connect(master);
  breath.start();
  padNodes = [...oscs, breath, out];
}

export function stopPad() {
  if (!ctx || !padNodes.length) return;
  const out = padNodes[padNodes.length - 1];
  out.gain.cancelScheduledValues(ctx.currentTime);
  out.gain.setValueAtTime(out.gain.value, ctx.currentTime);
  out.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
  const nodes = padNodes;
  padNodes = [];
  setTimeout(() => nodes.slice(0, -1).forEach((n) => n.stop?.()), 1400);
}

// 합장 방울
export function bowBell() {
  if (!ensure()) return;
  bellAt(880, 0.07, 2.8);
}
// 별 하나 켤 때 작은 반짝 소리
export function starTing() {
  if (!ensure()) return;
  bellAt(PENTA[Math.floor(Math.random() * PENTA.length)] * 1.5, 0.03, 1.2);
}

export function stopAll() {
  stopAmbient();
  stopPad();
}
