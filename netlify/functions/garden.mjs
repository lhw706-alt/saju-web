// 천동이 키우기 + 운세 일기 (2026-11-19 사용자 지시 — 리텐션 기능 ②③). 회원만.
//  GET  /api/grow            → { xp, level…, today:[할 일], streak, asleep }
//  POST /api/grow {action}   → 그날 처음이면 기운 +xp, 정해진 단계에 처음 닿으면 무상 금전(grant) → { …, gained, levelUp, reward }
//  GET  /api/diary?month=YYYY-MM → { entries:[{date, mood, hit, memo, ganzhi}] }
//  POST /api/diary {date, mood 1~5, hit 0~3, memo ≤100} → 오늘·어제(KST)만 쓰기/고치기. 처음 쓰면 천동이 기운(diary)
//  DELETE /api/diary {date}
// 저장: Netlify Blobs 'grow'(키 = 회원번호) · 'diary'(키 = u/회원번호/YYYY-MM-DD). 회원 탈퇴하면 auth.mjs 가 둘 다 지움.
import { getStore } from '@netlify/blobs';
import { Solar } from 'lunar-javascript';
import { sessionOf } from '../lib/session.mjs';
import { grant } from '../lib/wallet.mjs';
import { ACTIONS, LEVELS, levelOf, SLEEP_DAYS, kstDate } from '../../src/lib/grow.js';

const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const hits = new Map();
const limited = (k, max = 40) => {
  const now = Date.now();
  const a = (hits.get(k) || []).filter((t) => now - t < 60_000);
  a.push(now);
  hits.set(k, a);
  return a.length > max;
};
const dayDiff = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400e3);

const growStore = () => getStore({ name: 'grow', consistency: 'strong' });
async function growOf(uid) {
  return (await growStore().get(uid, { type: 'json' }).catch(() => null)) || { xp: 0, days: {}, streak: 0, lastDay: null, rewarded: [] };
}
function view(g) {
  const today = kstDate();
  const asleep = g.lastDay ? dayDiff(g.lastDay, today) > SLEEP_DAYS : false;
  return { xp: g.xp, ...levelOf(g.xp), today: g.days?.[today] || [], streak: g.streak || 0, lastDay: g.lastDay, asleep, actions: ACTIONS };
}
async function award(uid, action) {
  const today = kstDate();
  const g = await growOf(uid);
  const done = g.days?.[today] || [];
  if (done.includes(action)) return { ...view(g), gained: 0 };
  const before = levelOf(g.xp).level;
  // 연속 일수: 어제 왔으면 +1, 오늘 이미 셌으면 그대로, 아니면 1
  if (g.lastDay !== today) g.streak = g.lastDay && dayDiff(g.lastDay, today) === 1 ? (g.streak || 0) + 1 : 1;
  g.lastDay = today;
  g.xp = (g.xp || 0) + ACTIONS[action].xp;
  g.days = Object.fromEntries(Object.entries({ ...(g.days || {}), [today]: [...done, action] }).sort().slice(-14)); // 최근 14일만
  const after = levelOf(g.xp).level;
  let reward = 0;
  for (let lv = before + 1; lv <= after; lv++) {
    const r = LEVELS[lv - 1]?.reward;
    if (r && !(g.rewarded || []).includes(lv)) {
      reward += r;
      g.rewarded = [...(g.rewarded || []), lv];
    }
  }
  await growStore().setJSON(uid, g);
  if (reward) await grant(uid, reward, `천동이 키우기 · ${LEVELS[after - 1].name}`).catch(() => {});
  return { ...view(g), gained: ACTIONS[action].xp, levelUp: after > before, reward };
}

const diaryStore = () => getStore({ name: 'diary', consistency: 'strong' });
const ganzhiOf = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return Solar.fromYmd(y, m, d).getLunar().getDayInGanZhi();
};

export default async (req) => {
  const url = new URL(req.url);
  const s = sessionOf(req);
  if (!s) return json({ error: '로그인이 필요해요.', login: true }, 401);
  if (limited(s.sub)) return json({ error: '요청이 많아요. 잠시 뒤 다시 시도해 주세요.' }, 429);
  const body = req.method === 'POST' || req.method === 'DELETE' ? await req.json().catch(() => ({})) : {};

  if (url.pathname === '/api/grow') {
    if (req.method === 'GET') return json(view(await growOf(s.sub)));
    if (req.method !== 'POST') return json({ error: '잘못된 요청이에요.' }, 405);
    const action = String(body?.action || '');
    if (!ACTIONS[action] || action === 'diary') return json({ error: '잘못된 요청이에요.' }, 400); // 일기는 일기 저장 때 서버가 셈
    return json(await award(s.sub, action));
  }

  if (url.pathname === '/api/diary') {
    const store = diaryStore();
    if (req.method === 'GET') {
      const month = /^\d{4}-\d{2}$/.test(url.searchParams.get('month') || '') ? url.searchParams.get('month') : kstDate().slice(0, 7);
      const { blobs } = await store.list({ prefix: `u/${s.sub}/${month}` });
      const entries = (await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' }).catch(() => null)))).filter(Boolean).sort((a, b) => (a.date < b.date ? 1 : -1));
      // 일진 패턴용: 최근 기록 전체(최대 120개)의 날짜·기분·일진
      let all = [];
      if (url.searchParams.get('all') === '1') {
        const { blobs: ab } = await store.list({ prefix: `u/${s.sub}/` });
        all = (await Promise.all(ab.slice(-120).map((b) => store.get(b.key, { type: 'json' }).catch(() => null)))).filter(Boolean).map(({ date, mood, ganzhi }) => ({ date, mood, ganzhi }));
      }
      return json({ month, today: kstDate(), entries, all });
    }
    const date = String(body?.date || '');
    const today = kstDate();
    if (!DATE_RE.test(date)) return json({ error: '날짜를 확인해 주세요.' }, 400);
    const key = `u/${s.sub}/${date}`;
    if (req.method === 'DELETE') {
      await store.delete(key);
      return json({ ok: true });
    }
    if (req.method !== 'POST') return json({ error: '잘못된 요청이에요.' }, 405);
    const diff = dayDiff(date, today);
    if (diff < 0 || diff > 1) return json({ error: '오늘과 어제 일기만 쓸 수 있어요.' }, 400);
    const mood = Number(body?.mood);
    const hit = Number(body?.hit ?? 0);
    if (!Number.isInteger(mood) || mood < 1 || mood > 5) return json({ error: '오늘 하루가 어땠는지 골라 주세요.' }, 400);
    if (!Number.isInteger(hit) || hit < 0 || hit > 3) return json({ error: '잘못된 요청이에요.' }, 400);
    const memo = String(body?.memo || '').replace(/\s+/g, ' ').trim().slice(0, 100);
    const old = await store.get(key, { type: 'json' }).catch(() => null);
    const entry = { date, mood, hit, memo, ganzhi: ganzhiOf(date), at: new Date().toISOString(), ...(old ? { createdAt: old.createdAt || old.at } : {}) };
    await store.setJSON(key, entry);
    const grow = date === today ? await award(s.sub, 'diary') : null;
    return json({ ok: true, entry, grow });
  }
  return json({ error: '없는 주소예요.' }, 404);
};

export const config = { path: ['/api/grow', '/api/diary'] };
