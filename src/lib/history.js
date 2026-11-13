// 풀이 기억하기 (2026-11-13)
// 같은 생년월일·성별·시각·지역·주제로 다시 보면 새로 만들지 않고 전에 받은 풀이를 그대로 보여 줌.
// - 이 브라우저: localStorage 'saju:readings' (최근 12건)
// - 로그인 회원: 서버 /api/history 에도 저장 → 다른 기기에서도 그대로, 마이페이지 '내역' 탭
// 풀이 키에는 올해 연도를 넣음 (올해·신년 운세처럼 해마다 달라지는 풀이가 있어서)
const LOCAL_KEY = 'saju:readings';
const MAX_LOCAL = 12;

// 생년월일시 정보 → 사람 키 (불러오기 목록과 같은 기준)
export const personKey = (p) => [p.calendar, p.leap ? 1 : 0, p.year, p.month, p.day, p.timeKnown ? `${p.hour}:${p.minute || 0}` : '-', p.gender, p.city].join('|');
// 주제 'life' = 평생 사주 리포트(네 부분), 그 밖엔 topics.js 의 주제 id
export const readingKey = (input, topic) => `${personKey(input)}#${topic}#${new Date().getFullYear()}`;

function loadAll() {
  try {
    const v = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}
function saveAll(all) {
  try {
    const keys = Object.keys(all).sort((a, b) => (all[b].at || 0) - (all[a].at || 0));
    const kept = Object.fromEntries(keys.slice(0, MAX_LOCAL).map((k) => [k, all[k]]));
    localStorage.setItem(LOCAL_KEY, JSON.stringify(kept));
  } catch {
    /* 저장 공간 부족·사생활 보호 모드 — 무시 */
  }
}

// 이 브라우저에 기억한 풀이 조각들 { partId: text }
export function localParts(input, topic) {
  return loadAll()[readingKey(input, topic)]?.parts || {};
}

// 풀이 한 조각 저장 (이 브라우저 + 회원이면 서버)
export function rememberPart(input, topic, partId, text, { member = false } = {}) {
  if (!text) return;
  const key = readingKey(input, topic);
  const all = loadAll();
  const cur = all[key] || { input, topic, parts: {} };
  cur.parts = { ...cur.parts, [partId]: text };
  cur.at = Date.now();
  all[key] = cur;
  saveAll(all);
  if (member) {
    fetch('/api/history', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key, input, topic, partId, text }),
    }).catch(() => {});
  }
}

// 회원: 서버에 저장된 풀이 조각 { partId: text } (없으면 {})
export async function serverParts(input, topic) {
  try {
    const r = await fetch(`/api/history?key=${encodeURIComponent(readingKey(input, topic))}`, { cache: 'no-store' });
    if (!r.ok) return {};
    const d = await r.json();
    return d?.item?.parts || {};
  } catch {
    return {};
  }
}

// 내역에서 다시 열 때: 서버에서 받은 풀이를 이 브라우저에 넣어 두면 결과 화면이 바로 보여 줌
export function seedLocal(item) {
  const all = loadAll();
  all[item.key] = { input: item.input, topic: item.topic, parts: item.parts || {}, at: Date.now() };
  saveAll(all);
}

// ── 비회원은 서로 다른 사람의 사주를 2번까지 (3번째부터 로그인) ──
const GUEST_KEY = 'saju:guest-seen';
export const GUEST_LIMIT = 2;
function guestSeen() {
  try {
    const v = JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
// 이 사람을 볼 수 있는지 (이미 본 사람은 몇 번이든 다시 볼 수 있음)
export function guestCanView(input) {
  const seen = guestSeen();
  return seen.includes(personKey(input)) || seen.length < GUEST_LIMIT;
}
export function markGuestView(input) {
  try {
    const seen = guestSeen();
    const k = personKey(input);
    if (!seen.includes(k)) localStorage.setItem(GUEST_KEY, JSON.stringify([...seen, k].slice(-20)));
  } catch {
    /* 무시 */
  }
}
