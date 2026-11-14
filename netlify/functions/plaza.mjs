// 별마루 지금 인원 · 함께 있는 사람 잔상 (/api/plaza, 2026-11-15 — 실시간 서버 없이 가볍게, 사람이 몰려도 부담이 일정하게).
// 화면이 30초마다 POST {sid, x, z, a} 로 "아직 있어요" 신호(탭을 내리면 안 보냄), GET 으로 인원 수와 잔상을 받음.
// 저장 방식: 1분 단위 칸에 키만 씀 — 키 = p/<분>/<sid>_<x×10>_<z×10>_<동작>, 값은 비움. 셀 때 값을 하나하나 읽지 않고 목록만 훑음.
// GET 응답은 Netlify CDN 이 10초 동안 나눠 줌(사람이 많아도 10초에 한 번 계산). 저장하는 것: 탭마다 새 무작위 sid · 위치 · 동작뿐(회원 정보·IP 없음).
import { getStore } from '@netlify/blobs';
import { json, allowedOrigin, createRateLimiter } from '../lib/guard.mjs';

const ACTS = new Set(['walk', 'sit', 'bow', 'star', 'lantern']);
const limited = createRateLimiter(10); // 같은 IP 1분 10번
const minuteNow = () => Math.floor(Date.now() / 60_000);
const store = () => getStore({ name: 'plaza', consistency: 'eventual' });

async function keysOf(m) {
  const { blobs } = await store().list({ prefix: `p/${m}/` });
  return blobs.map((b) => b.key);
}

export default async (req, context) => {
  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  if (req.method === 'GET') {
    const m = minuteNow();
    let keys = [];
    try {
      keys = [...(await keysOf(m)), ...(await keysOf(m - 1))];
    } catch {
      return json({ count: null, ghosts: [] }, 200); // 저장소가 바쁘면 조용히 숨김
    }
    // 사람(sid)마다 가장 최근 자리 하나
    const latest = new Map();
    keys.forEach((k) => {
      const [, min, rest] = k.split('/');
      const [sid, xs, zs, a] = rest.split('_');
      const prev = latest.get(sid);
      if (!prev || Number(min) >= prev.min) latest.set(sid, { min: Number(min), x: Number(xs) / 10, z: Number(zs) / 10, a: ACTS.has(a) ? a : 'walk' });
    });
    const people = [...latest.values()];
    // 가끔 지난 칸 지우기 (3~15분 전)
    if (Math.random() < 0.05) {
      for (let k = 3; k <= 15; k++) keysOf(m - k).then((ks) => Promise.all(ks.map((key) => store().delete(key)))).catch(() => {});
    }
    const body = JSON.stringify({ count: Math.max(1, people.length), ghosts: people.slice(0, 30).map(({ x, z, a }) => ({ x, z, a })) });
    return new Response(body, {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=0, must-revalidate',
        'netlify-cdn-cache-control': 'public, durable, max-age=10, stale-while-revalidate=30',
      },
    });
  }
  if (req.method !== 'POST') return json({ error: '잘못된 요청이에요.' }, 405);
  if (!allowedOrigin(req)) return json({ error: '허용되지 않은 출처예요.' }, 403);
  if (limited(ip)) return json({ error: '요청이 많아요.' }, 429);
  let b;
  try {
    b = await req.json();
  } catch {
    return json({ error: '잘못된 요청이에요.' }, 400);
  }
  const sid = String(b?.sid || '');
  const x = Number(b?.x);
  const z = Number(b?.z);
  const a = ACTS.has(b?.a) ? b.a : 'walk';
  if (!/^[a-z0-9]{8,24}$/.test(sid) || !Number.isFinite(x) || !Number.isFinite(z) || Math.hypot(x, z) > 30) return json({ error: '잘못된 요청이에요.' }, 400);
  await store().set(`p/${minuteNow()}/${sid}_${Math.round(x * 10)}_${Math.round(z * 10)}_${a}`, '');
  return json({ ok: true });
};

export const config = { path: '/api/plaza' };
