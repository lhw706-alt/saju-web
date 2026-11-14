// 타로 (2026-11-14) — 메이저 아르카나 22장. 카드 그림은 사주천문 창작(크림색 종이 + 먹선 + 한자 문양), 화면·서버가 같이 씀.
// kw: 정방향 / 역방향 핵심어 (풀이 근거로 서버가 AI 에 넘김)
export const TAROT = [
  { id: 0, ko: '바보', en: 'The Fool', han: '愚', up: '새로운 시작·자유·모험', rev: '무모함·준비 부족' },
  { id: 1, ko: '마법사', en: 'The Magician', han: '術', up: '의지·재능·실행력', rev: '속임수·흩어진 힘' },
  { id: 2, ko: '여사제', en: 'The High Priestess', han: '秘', up: '직관·지혜·기다림', rev: '숨김·혼란' },
  { id: 3, ko: '여황제', en: 'The Empress', han: '豊', up: '풍요·보살핌·창조', rev: '지나친 의존·정체' },
  { id: 4, ko: '황제', en: 'The Emperor', han: '皇', up: '안정·책임·리더십', rev: '고집·통제' },
  { id: 5, ko: '교황', en: 'The Hierophant', han: '敎', up: '배움·조언·전통', rev: '틀에 갇힘·반발' },
  { id: 6, ko: '연인', en: 'The Lovers', han: '戀', up: '사랑·조화·선택', rev: '엇갈림·망설임' },
  { id: 7, ko: '전차', en: 'The Chariot', han: '進', up: '전진·승리·의지', rev: '방향 잃음·조급함' },
  { id: 8, ko: '힘', en: 'Strength', han: '力', up: '용기·인내·부드러운 힘', rev: '자신감 부족·지침' },
  { id: 9, ko: '은둔자', en: 'The Hermit', han: '隱', up: '성찰·홀로 서기·탐구', rev: '고립·외로움' },
  { id: 10, ko: '운명의 수레바퀴', en: 'Wheel of Fortune', han: '輪', up: '전환점·흐름·기회', rev: '엇박자·기다림' },
  { id: 11, ko: '정의', en: 'Justice', han: '義', up: '균형·공정·결단', rev: '치우침·미룬 결정' },
  { id: 12, ko: '매달린 사람', en: 'The Hanged Man', han: '懸', up: '멈춤·다른 시각·내려놓기', rev: '헛된 희생·정체' },
  { id: 13, ko: '죽음', en: 'Death', han: '變', up: '끝과 새 출발·변화', rev: '변화를 미룸·집착' },
  { id: 14, ko: '절제', en: 'Temperance', han: '節', up: '조화·절제·회복', rev: '불균형·과함' },
  { id: 15, ko: '악마', en: 'The Devil', han: '縛', up: '집착·유혹·얽매임', rev: '풀려남·벗어남' },
  { id: 16, ko: '탑', en: 'The Tower', han: '崩', up: '뜻밖의 변화·깨달음', rev: '미뤄 둔 변화·불안' },
  { id: 17, ko: '별', en: 'The Star', han: '星', up: '희망·치유·영감', rev: '실망·자신감 저하' },
  { id: 18, ko: '달', en: 'The Moon', han: '月', up: '불확실함·상상·직감', rev: '오해가 풀림·안개 걷힘' },
  { id: 19, ko: '태양', en: 'The Sun', han: '日', up: '기쁨·성공·활력', rev: '잠시 흐림·과한 자신감' },
  { id: 20, ko: '심판', en: 'Judgement', han: '審', up: '되돌아봄·부름·재출발', rev: '자기 비판·망설임' },
  { id: 21, ko: '세계', en: 'The World', han: '界', up: '완성·성취·한 바퀴', rev: '마무리 부족·미완' },
];
export const tarotById = (id) => TAROT.find((c) => c.id === Number(id)) || null;

export const TAROT_TOPICS = [
  { id: 'love', label: '연애·관계' },
  { id: 'work', label: '일·진로' },
  { id: 'money', label: '재물' },
  { id: 'mind', label: '마음·고민' },
  { id: 'today', label: '오늘의 흐름' },
];
export const TAROT_SPREADS = {
  1: { label: '한 장', desc: '지금 나에게 필요한 메시지', pos: ['오늘의 카드'] },
  3: { label: '세 장', desc: '과거 · 현재 · 미래의 흐름', pos: ['과거', '현재', '미래'] },
};
export const TAROT_Q_MAX = 60;

// 로마 숫자 (0 은 0)
export const roman = (n) => {
  if (!n) return '0';
  const t = [['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]];
  let s = '';
  for (const [r, v] of t) while (n >= v) (s += r), (n -= v);
  return s;
};

// 카드 그림 (2026-11-14 사용자 레퍼런스 톤: 짙은 보랏빛 우주 + 금빛 장식 테두리·모서리 고리·별)
const STARS = [[30, 60], [168, 44], [44, 140], [160, 120], [26, 230], [174, 210], [60, 286], [142, 300], [100, 36], [92, 312], [130, 82], [72, 104]];
const frame = (id) => `
  <defs>
    <linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a1d63"/><stop offset=".5" stop-color="#4a3596"/><stop offset="1" stop-color="#1b1449"/></linearGradient>
    <radialGradient id="${id}-glow" cx="50%" cy="48%" r="50%"><stop offset="0" stop-color="#b9a0ff" stop-opacity=".45"/><stop offset="1" stop-color="#b9a0ff" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6df9c"/><stop offset=".5" stop-color="#d9ad52"/><stop offset="1" stop-color="#f3d68a"/></linearGradient>
  </defs>
  <rect x="1" y="1" width="198" height="328" rx="12" fill="url(#${id}-bg)"/>
  <rect x="1" y="1" width="198" height="328" rx="12" fill="url(#${id}-glow)"/>
  ${STARS.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 0.9 : 1.6}" fill="#fff4d6" opacity="${0.5 + (i % 4) / 8}"/>`).join('')}
  <rect x="8" y="8" width="184" height="314" rx="9" fill="none" stroke="url(#${id}-gold)" stroke-width="2.2"/>
  <rect x="15" y="15" width="170" height="300" rx="6" fill="none" stroke="url(#${id}-gold)" stroke-width="0.9"/>
  ${[[15, 15], [185, 15], [15, 315], [185, 315]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#2a1d63" stroke="url(#${id}-gold)" stroke-width="1.4"/><circle cx="${x}" cy="${y}" r="3.2" fill="url(#${id}-gold)"/>`).join('')}`;
const rays = (cx, cy, r1, r2, id) => Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * Math.PI * 2;
  const r = i % 2 ? r2 * 0.8 : r2;
  return `<path d="M${(cx + Math.cos(a) * r1).toFixed(1)} ${(cy + Math.sin(a) * r1).toFixed(1)} L${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}" stroke="url(#${id}-gold)" stroke-width="1"/>`;
}).join('');

// 앞면 (200×330): 숫자 · 빛살 속 금빛 한자 문양 · 이름
export function tarotFaceSvg(c) {
  const id = `tf${c.id}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 330">${frame(id)}
  <text x="100" y="48" text-anchor="middle" font-family="Georgia, serif" font-size="16" letter-spacing="3" fill="url(#${id}-gold)">${roman(c.id)}</text>
  ${rays(100, 158, 50, 74, id)}
  <circle cx="100" cy="158" r="48" fill="#24195a" stroke="url(#${id}-gold)" stroke-width="1.6"/>
  <circle cx="100" cy="158" r="42" fill="none" stroke="url(#${id}-gold)" stroke-width=".7" stroke-dasharray="2 3"/>
  <text x="100" y="184" text-anchor="middle" font-family="ChosunSm, serif" font-size="68" fill="url(#${id}-gold)">${c.han}</text>
  <path d="M58 250 H142" stroke="url(#${id}-gold)" stroke-width=".8"/>
  <path d="M100 245 l4 5 -4 5 -4 -5z" fill="url(#${id}-gold)"/>
  <text x="100" y="278" text-anchor="middle" font-family="ChosunSm, serif" font-size="20" fill="#f6e7c0">${c.ko}</text>
  <text x="100" y="298" text-anchor="middle" font-family="Georgia, serif" font-size="9.5" letter-spacing="1.5" fill="#cbbcf0">${c.en.toUpperCase()}</text>
</svg>`;
}
// 뒷면: 금빛 빛살 속 마름모와 눈 문양
export const TAROT_BACK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 330">${frame('tb')}
  ${rays(100, 165, 30, 62, 'tb')}
  <path d="M100 110 L136 165 L100 220 L64 165Z" fill="#24195a" stroke="url(#tb-gold)" stroke-width="1.6"/>
  <path d="M74 165 Q100 140 126 165 Q100 190 74 165Z" fill="none" stroke="url(#tb-gold)" stroke-width="1.4"/>
  <circle cx="100" cy="165" r="8" fill="url(#tb-gold)"/>
  <text x="100" y="268" text-anchor="middle" font-family="ChosunSm, serif" font-size="14" letter-spacing="6" fill="url(#tb-gold)">天文</text>
</svg>`;
