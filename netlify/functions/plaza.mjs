// 별마루 지금 인원 · 다녀간 사람 잔상 (/api/plaza, 2026-11-15 '다 해줘' 4묶음 — 실시간 서버 없이 가볍게).
// 화면이 20초마다 POST {sid, x, z, a} 로 "아직 있어요" 신호를 보내고, GET 으로 인원 수와 최근 다녀간 자리를 받음.
// 저장하는 것: 탭마다 새로 만드는 무작위 sid 와 마당 안 위치·마지막 동작뿐 (회원 정보·IP 없음). 1시간 지난 기록은 지움.
import { getStore } from '@netlify/blobs';
import { json, allowedOrigin, createRateLimiter } from '../lib/guard.mjs';

const ACTIVE_MS = 60_000; // 1분 안에 신호가 있으면 '지금 있음'
const GHOST_MS = 30 * 60_000; // 30분 안에 다녀간 자리 → 잔상
const KEEP_MS = 60 * 60_000;
const ACTS = new Set(['walk', 'sit', 'bow', 'star', 'lantern']);
const limited = createRateLimiter(12); // 같은 IP 1분 12번 (20초 신호 + 여유)
let cache = null; // { at, all }

const store = () => getStore({ name: 'plaza', consistency: 'eventual' });

async function readAll() {
  if (cache && Date.now() - cache.at < 5000) return cache.all; // 사람이 몰려도 5초에 한 번만 읽음
  const st = store();
  const { blobs } = await st.list({ prefix: 'p/' });
  const all = (await Promise.all(blobs.map(async (b) => ({ sid: b.key.slice(2), ...((await st.get(b.key, { type: 'json' }).catch(() => null)) || {}) })))).filter((v) => v.t);
  cache = { at: Date.now(), all };
  // 가끔 오래된 기록 지우기
  if (Math.random() < 0.1) {
    const old = all.filter((v) => Date.now() - v.t > KEEP_MS);
    await Promise.all(old.map((v) => st.delete(`p/${v.sid}`).catch(() => {})));
  }
  return all;
}

export default async (req, context) => {
  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  const url = new URL(req.url);
  if (req.method === 'GET') {
    const me = String(url.searchParams.get('me') || '');
    const all = await readAll().catch(() => []);
    const now = Date.now();
    const count = all.filter((v) => now - v.t < ACTIVE_MS).length;
    const ghosts = all
      .filter((v) => v.sid !== me && now - v.t < GHOST_MS)
      .sort((a, b) => b.t - a.t)
      .slice(0, 30)
      .map((v) => ({ x: v.x, z: v.z, a: v.a }));
    return json({ count: Math.max(1, count), ghosts }, 200);
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
  await store().setJSON(`p/${sid}`, { t: Date.now(), x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, a });
  return json({ ok: true });
};

export const config = { path: '/api/plaza' };
