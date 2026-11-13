// 이름 궁합의 계산 근거 (2026-11-14): 이름 글자마다 첫소리(초성)로 소리 오행(발음 오행)을 정한다.
// 성명학에서 흔히 쓰는 기준 — ㄱㅋ 목(木), ㄴㄷㄹㅌ 화(火), ㅇㅎ 토(土), ㅅㅈㅊ 금(金), ㅁㅂㅍ 수(水).
// (학파에 따라 ㅇㅎ 과 ㅁㅂㅍ 을 서로 바꿔 보기도 해서, 화면에 '흔히 쓰는 기준'이라고 밝힌다.)
// 화면(src/pages/NameMatch.jsx)과 서버(netlify/functions/name-match.mjs)가 같이 쓴다. 한자 획수·뜻은 보지 않는다.

const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const EL_OF = {
  ㄱ: 'wood', ㄲ: 'wood', ㅋ: 'wood',
  ㄴ: 'fire', ㄷ: 'fire', ㄸ: 'fire', ㄹ: 'fire', ㅌ: 'fire',
  ㅇ: 'earth', ㅎ: 'earth',
  ㅅ: 'metal', ㅆ: 'metal', ㅈ: 'metal', ㅉ: 'metal', ㅊ: 'metal',
  ㅁ: 'water', ㅂ: 'water', ㅃ: 'water', ㅍ: 'water',
};
export const EL_KO = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' };
export const EL_HAN = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
export const EL_WORD = { wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물' };
const ORDER = ['wood', 'fire', 'earth', 'metal', 'water']; // 상생 순서: 목→화→토→금→수→목

// 이름 검사: 한글 2~5글자 (띄어쓰기는 지움)
export const cleanName = (s) => String(s || '').replace(/\s+/g, '');
export const nameOk = (s) => /^[가-힣]{2,5}$/.test(cleanName(s));

export const RELATIONS = [
  { id: 'lover', label: '연인', icon: '💕', romantic: true },
  { id: 'some', label: '썸', icon: '💗', romantic: true },
  { id: 'friend', label: '친구', icon: '😊' },
  { id: 'spouse', label: '부부', icon: '💍', romantic: true },
  { id: 'coworker', label: '동료', icon: '🤝' },
  { id: 'etc', label: '기타', icon: '✨' },
];
export const relationById = (id) => RELATIONS.find((r) => r.id === id) || null;

// 이름 → 글자마다 { ch, cho, el }, 오행 개수, 가장 많은 오행
export function nameSound(name) {
  const chars = [...cleanName(name)].map((ch) => {
    const code = ch.charCodeAt(0) - 0xac00;
    const cho = CHO[Math.floor(code / 588)];
    return { ch, cho, el: EL_OF[cho] };
  });
  const count = Object.fromEntries(ORDER.map((e) => [e, chars.filter((c) => c.el === e).length]));
  // 가장 많은 오행 (같으면 이름(성 뺀 부분)의 첫 글자 쪽을 우선)
  const max = Math.max(...Object.values(count));
  const firstGiven = chars[1]?.el;
  const main = count[firstGiven] === max ? firstGiven : ORDER.find((e) => count[e] === max);
  return { chars, count, main };
}

// 두 오행의 관계: 같음 / 상생(a가 b를 살림·b가 a를 살림) / 상극(a가 b를 누름·b가 a를 누름)
export function elRelation(a, b) {
  const i = ORDER.indexOf(a);
  const j = ORDER.indexOf(b);
  if (i === j) return { kind: 'same', text: `같은 ${EL_WORD[a]}(${EL_HAN[a]}) 기운이라 닮은 점이 많은 사이` };
  if ((i + 1) % 5 === j) return { kind: 'give', text: `${EL_WORD[a]}(${EL_HAN[a]})가 ${EL_WORD[b]}(${EL_HAN[b]})를 살려 주는 상생 — 내가 상대를 북돋는 흐름` };
  if ((j + 1) % 5 === i) return { kind: 'take', text: `${EL_WORD[b]}(${EL_HAN[b]})가 ${EL_WORD[a]}(${EL_HAN[a]})를 살려 주는 상생 — 상대가 나를 북돋는 흐름` };
  if ((i + 2) % 5 === j) return { kind: 'press', text: `${EL_WORD[a]}(${EL_HAN[a]})가 ${EL_WORD[b]}(${EL_HAN[b]})를 누르는 상극 — 내가 이끄는 쪽이 되기 쉬운 흐름` };
  return { kind: 'pressed', text: `${EL_WORD[b]}(${EL_HAN[b]})가 ${EL_WORD[a]}(${EL_HAN[a]})를 누르는 상극 — 상대가 이끄는 쪽이 되기 쉬운 흐름` };
}

// 서버가 풀이에 넘기는 요약 (화면에 보이는 근거와 같은 내용)
export function nameSummary(me, partner) {
  const a = nameSound(me);
  const b = nameSound(partner);
  const line = (n, s) => `${cleanName(n)}: ${s.chars.map((c) => `${c.ch}(${c.cho}·${EL_KO[c.el]})`).join(' ')} → 가장 많은 소리 오행 ${EL_KO[s.main]}(${EL_HAN[s.main]}), 오행 개수 ${Object.entries(s.count).map(([e, n]) => `${EL_KO[e]}${n}`).join(' ')}`;
  return `${line(me, a)}\n${line(partner, b)}\n두 이름의 중심 오행 관계: ${elRelation(a.main, b.main).text}`;
}

// 이 브라우저에 남기는 키 (이름을 그대로 쓰지 않게 간단한 해시)
export function nameKey(me, partner, relation) {
  const s = `${cleanName(me)}|${cleanName(partner)}|${relation}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return `name:${h.toString(36)}`;
}
