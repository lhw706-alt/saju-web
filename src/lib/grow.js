// 천동이 키우기 (2026-11-19 사용자 지시 — 리텐션 기능 ②) — 화면·서버(netlify/functions/garden.mjs)가 같이 쓰는 규칙.
// 하루에 한 번씩 할 일(ACTIONS)을 하면 천동이가 기운(xp)을 받고, 기운이 쌓이면 단계(LEVELS)가 올라요. 정해진 단계에 처음 닿으면 무상 금전 보상.
// 3일 넘게 안 오면 천동이가 다시 잠들어요(기운은 줄지 않음 — 겁주지 않기). 회원만.

export const ACTIONS = {
  visit: { label: '사주천문에 들르기', xp: 5, to: '/' },
  fortune: { label: '오늘의 운세 보기', xp: 10, to: '/#fortune' },
  diary: { label: '운세 일기 쓰기', xp: 15, to: '/my/diary' },
  star: { label: '별마루에서 별 헤아리기', xp: 10, to: '/byeolmaru' },
  cheer: { label: '다른 사람 소원 응원하기', xp: 5, to: '/wish' },
  iljoo: { label: '일주 카드 보기', xp: 5, to: '/iljoo' },
};
export const DAILY_MAX = Object.values(ACTIONS).reduce((t, a) => t + a.xp, 0);

export const LEVELS = [
  { min: 0, name: '잠에서 깬 천동이' },
  { min: 60, name: '기운을 모으는 천동이' },
  { min: 180, name: '은은히 빛나는 천동이', reward: 5 },
  { min: 360, name: '별빛을 품은 천동이' },
  { min: 600, name: '하늘에 닿은 천동이', reward: 10 },
  { min: 900, name: '달빛 두른 천동이' },
  { min: 1300, name: '천문을 읽는 천동이', reward: 20 },
];
export function levelOf(xp) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].min) i++;
  const next = LEVELS[i + 1] || null;
  return { level: i + 1, name: LEVELS[i].name, min: LEVELS[i].min, next: next ? next.min : null, nextReward: next?.reward || null };
}
export const SLEEP_DAYS = 3;
export const kstDate = (t = Date.now()) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);

// 화면에서 할 일을 했다고 알림 — 같은 날 같은 일은 이 브라우저에서 한 번만 보냄(서버도 하루 한 번만 셈)
// 결과는 window 'saju:grow' 이벤트로 (Layout 이 단계가 오르면 알림)
export function growAction(action) {
  if (typeof window === 'undefined' || !ACTIONS[action]) return;
  const key = `saju:grow:${kstDate()}:${action}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
  } catch {}
  fetch('/api/grow', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => d && window.dispatchEvent(new CustomEvent('saju:grow', { detail: d })))
    .catch(() => {});
}
