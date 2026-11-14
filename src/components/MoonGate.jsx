// 별마루 입장 달 (2026-11-15 사용자 지시) — 메인 히어로 천동이 오른쪽에 떠 있는 '판화로 새긴 달'. 누르면 별마루로.
// 21st.dev 'BurinHatch'(동판화 선 음영 구) 기법을 Tailwind·TS 없이 옮겨, 사이트 톤(밤하늘 + 금빛)에 맞게 바꿈:
//  - 어두운 하늘 위라 빛 받는 쪽에 금빛 선이 굵어지고(밝은 면), 그늘 쪽은 비어 있음 — 오늘 실제 달 모양(음력)으로 빛 방향을 정함
//  - 가장 밝은 곳에만 가로 선을 한 번 더(크로스 해칭). 채우기·그라데이션·빛 번짐 없이 선 두께만으로 명암
//  - 마우스를 올리면 빛이 포인터 쪽으로 천천히 돌고, 누르면 꾹 눌렸다가 퍼지는 선 한 줄 → 이동
// 선 하나는 굵기가 변하므로 stroke 가 아니라 닫힌 다각형 띠로 그림(앞으로 +w/2, 뒤로 -w/2). 프레임마다 fill 두 번.
import { useEffect, useMemo, useRef, useState } from 'react';
import { skyState } from '../lib/byeolmaruSky.js';

const DEG = Math.PI / 180;
const RADIUS_FRAC = 0.4;
const MERIDIANS = 72; // 5도마다 (앞면에 36줄)
const MERIDIAN_STEP = 5 * DEG;
const LAT_MIN = -88 * DEG;
const LAT_STEP = 3 * DEG;
const LAT_N = 59;
const WIDTH_A = 2.3;
const SHADE_POW = 0.9;
const PARALLELS = 25; // 6도마다 -72 ~ +72
const PARALLEL_STEP = 6 * DEG;
const PARALLEL_MIN = -72 * DEG;
const LON_N = 120;
const LON_STEP = 3 * DEG;
const CROSS_FROM = 0.3; // 이보다 밝은 곳에만 가로 선
const WIDTH_B = 1.5;
const SPIN = 0.05;
const LIGHT_TAU = 0.5;
const DT_MAX = 1 / 30;
const BUF = 140;
const INK = '#E2C27A';

function moonName(day) {
  if (day <= 2 || day >= 29) return '그믐';
  if (day <= 6) return '초승달';
  if (day <= 9) return '상현달';
  if (day <= 13) return '차오르는 달';
  if (day <= 17) return '보름달';
  if (day <= 21) return '기우는 달';
  if (day <= 24) return '하현달';
  return '그믐달';
}

export default function MoonGate({ onEnter }) {
  const btnRef = useRef(null);
  const canvasRef = useRef(null);
  const [going, setGoing] = useState(false);
  const sky = useMemo(() => {
    try {
      return skyState();
    } catch {
      return null;
    }
  }, []);
  const phase = sky?.phase ?? 0.3;

  useEffect(() => {
    const btn = btnRef.current;
    const canvas = canvasRef.current;
    if (!btn || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 오늘 달 모양 → 빛 방향 (새달 = 뒤, 보름 = 앞). 새달에도 보이게 앞쪽을 조금 섞음
    const th = 2 * Math.PI * phase;
    const base = [Math.sin(th), 0.12, -Math.cos(th) + 0.75];
    const bl = Math.hypot(...base);
    const home = base.map((v) => v / bl);

    const latCos = new Float64Array(LAT_N), latSin = new Float64Array(LAT_N);
    for (let k = 0; k < LAT_N; k++) { const p = LAT_MIN + k * LAT_STEP; latCos[k] = Math.cos(p); latSin[k] = Math.sin(p); }
    const mC = new Float64Array(MERIDIANS), mS = new Float64Array(MERIDIANS);
    for (let m = 0; m < MERIDIANS; m++) { mC[m] = Math.cos(m * MERIDIAN_STEP); mS[m] = Math.sin(m * MERIDIAN_STEP); }
    const pC = new Float64Array(PARALLELS), pS = new Float64Array(PARALLELS);
    for (let p = 0; p < PARALLELS; p++) { const f = PARALLEL_MIN + p * PARALLEL_STEP; pC[p] = Math.cos(f); pS[p] = Math.sin(f); }
    const lC = new Float64Array(LON_N), lS = new Float64Array(LON_N);
    for (let j = 0; j < LON_N; j++) { lC[j] = Math.cos(j * LON_STEP); lS[j] = Math.sin(j * LON_STEP); }
    const xs = new Float64Array(BUF), ys = new Float64Array(BUF), ws = new Float64Array(BUF), nxs = new Float64Array(BUF), nys = new Float64Array(BUF);

    const emitRun = (path, n) => {
      if (n < 2) return;
      for (let i = 0; i < n; i++) {
        const a = i > 0 ? i - 1 : i, b = i < n - 1 ? i + 1 : i;
        const tx = xs[b] - xs[a], ty = ys[b] - ys[a];
        const len = Math.hypot(tx, ty) || 1;
        nxs[i] = -ty / len; nys[i] = tx / len;
        const h = ws[i] * 0.5;
        if (i === 0) path.moveTo(xs[i] + nxs[i] * h, ys[i] + nys[i] * h);
        else path.lineTo(xs[i] + nxs[i] * h, ys[i] + nys[i] * h);
      }
      for (let i = n - 1; i >= 0; i--) { const h = ws[i] * 0.5; path.lineTo(xs[i] - nxs[i] * h, ys[i] - nys[i] * h); }
      path.closePath();
    };

    let W = 0, H = 0, sized = false;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      if (r.width < 4) { sized = false; return; }
      W = r.width; H = r.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sized = true;
    };

    let lam0 = 0, lx = home[0], ly = home[1], lz = home[2];
    const draw = () => {
      if (!sized) return;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, R = RADIUS_FRAC * Math.min(W, H);
      const c0 = Math.cos(lam0), s0 = Math.sin(lam0);
      const A = new Path2D(), B = new Path2D();
      for (let m = 0; m < MERIDIANS; m++) {
        const sL = mS[m] * c0 + mC[m] * s0, cL = mC[m] * c0 - mS[m] * s0;
        let n = 0;
        for (let k = 0; k < LAT_N; k++) {
          const cp = latCos[k], nz = cp * cL;
          if (nz <= 0) { if (n > 1) emitRun(A, n); n = 0; continue; }
          const nx = cp * sL, ny = latSin[k];
          const d = nx * lx + ny * ly + nz * lz;
          const u = d <= 0 ? 0 : d >= 1 ? 1 : d;
          xs[n] = cx + R * nx; ys[n] = cy - R * ny; ws[n] = WIDTH_A * Math.pow(u, SHADE_POW);
          n++;
        }
        if (n > 1) emitRun(A, n);
      }
      const j0 = (((Math.round((Math.PI - lam0) / LON_STEP) % LON_N) + LON_N) % LON_N) | 0;
      for (let p = 0; p < PARALLELS; p++) {
        let n = 0;
        for (let q = 0; q < LON_N; q++) {
          const j = (j0 + q) % LON_N;
          const sL = lS[j] * c0 + lC[j] * s0, cL = lC[j] * c0 - lS[j] * s0;
          const nz = pC[p] * cL, nx = pC[p] * sL, ny = pS[p];
          const d = nz > 0 ? nx * lx + ny * ly + nz * lz : 0;
          if (nz <= 0 || d <= CROSS_FROM) { if (n > 1) emitRun(B, n); n = 0; continue; }
          xs[n] = cx + R * nx; ys[n] = cy - R * ny;
          ws[n] = WIDTH_B * Math.min(1, (d - CROSS_FROM) / (1 - CROSS_FROM));
          n++;
        }
        if (n > 1) emitRun(B, n);
      }
      ctx.fillStyle = INK;
      ctx.globalAlpha = 0.95; ctx.fill(A);
      ctx.globalAlpha = 0.7; ctx.fill(B);
      ctx.globalAlpha = 0.18; ctx.strokeStyle = INK; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    };

    resize();
    const ro = new ResizeObserver(() => { resize(); draw(); });
    ro.observe(canvas);
    if (reduced) { draw(); return () => ro.disconnect(); }

    let raf = 0, last = 0, hasP = false, px = 0, py = 0;
    const target = [...home];
    const loop = (now) => {
      const dt = last ? Math.min(DT_MAX, (now - last) / 1000) : 1 / 60;
      last = now;
      lam0 = (lam0 + SPIN * dt) % (Math.PI * 2);
      if (hasP) { const m = Math.hypot(px, py, 0.7) || 1; target[0] = px / m; target[1] = py / m; target[2] = 0.7 / m; }
      else { target[0] = home[0]; target[1] = home[1]; target[2] = home[2]; }
      const k = Math.min(1, dt / LIGHT_TAU);
      lx += (target[0] - lx) * k; ly += (target[1] - ly) * k; lz += (target[2] - lz) * k;
      const l = Math.hypot(lx, ly, lz) || 1; lx /= l; ly /= l; lz /= l;
      draw();
      raf = document.hidden ? 0 : requestAnimationFrame(loop);
    };
    const onMove = (e) => {
      if (e.pointerType === 'touch' || !sized) return;
      const r = canvas.getBoundingClientRect();
      const R = RADIUS_FRAC * Math.min(r.width, r.height);
      px = (e.clientX - r.left - r.width / 2) / R; py = -(e.clientY - r.top - r.height / 2) / R;
      hasP = true;
    };
    const onLeave = () => { hasP = false; };
    const onVis = () => { if (!document.hidden && !raf) { last = 0; raf = requestAnimationFrame(loop); } };
    btn.addEventListener('pointermove', onMove);
    btn.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVis);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf); raf = 0; ro.disconnect();
      btn.removeEventListener('pointermove', onMove); btn.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [phase]);

  const enter = () => {
    if (going) return;
    setGoing(true);
    setTimeout(onEnter, 420); // 퍼지는 선을 잠깐 보여 주고 이동
  };

  return (
    <button ref={btnRef} type="button" className={`moon-gate${going ? ' is-going' : ''}`} onClick={enter} aria-label={`달빛 따라 별마루로${sky ? ` — 오늘 밤 ${moonName(sky.lunarDay)}` : ''}`}>
      <span className="moon-gate-orb">
        <canvas ref={canvasRef} aria-hidden="true" />
        <span className="moon-gate-ring" aria-hidden="true" />
      </span>
      <span className="moon-gate-label">
        <span>달빛 따라</span>
        <b>별마루로</b>
      </span>
    </button>
  );
}
