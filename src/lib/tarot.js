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

// 카드 앞면 SVG (200×330) — 크림색 종이, 이중 먹선 테두리, 모서리 꽃잎, 숫자·한자 문양·이름
export function tarotFaceSvg(c) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 330">
  <rect x="1" y="1" width="198" height="328" rx="12" fill="#f3ead8" stroke="#2b2530" stroke-width="2"/>
  <rect x="11" y="11" width="178" height="308" rx="6" fill="none" stroke="#2b2530" stroke-width="1"/>
  ${[[16, 16], [184, 16], [16, 314], [184, 314]].map(([x, y]) => `<path d="M${x} ${y - 5} L${x + 5} ${y} L${x} ${y + 5} L${x - 5} ${y}Z" fill="#b8862b"/>`).join('')}
  <text x="100" y="46" text-anchor="middle" font-family="Georgia, serif" font-size="17" letter-spacing="3" fill="#2b2530">${roman(c.id)}</text>
  <path d="M60 58 H140" stroke="#2b2530" stroke-width=".8"/>
  <circle cx="100" cy="160" r="62" fill="none" stroke="#2b2530" stroke-width="1"/>
  <circle cx="100" cy="160" r="56" fill="none" stroke="#b8862b" stroke-width=".8" stroke-dasharray="2 4"/>
  <text x="100" y="190" text-anchor="middle" font-family="ChosunSm, serif" font-size="84" fill="#23284a">${c.han}</text>
  <path d="M60 252 H140" stroke="#2b2530" stroke-width=".8"/>
  <text x="100" y="278" text-anchor="middle" font-family="ChosunSm, serif" font-size="21" fill="#2b2530">${c.ko}</text>
  <text x="100" y="300" text-anchor="middle" font-family="Georgia, serif" font-size="10" letter-spacing="1.5" fill="#6b6170">${c.en.toUpperCase()}</text>
</svg>`;
}
// 카드 뒷면 SVG — 짙은 남색, 가는 금선, 별자리 무늬, 가운데 초승달
export const TAROT_BACK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 330">
  <rect x="1" y="1" width="198" height="328" rx="12" fill="#1f2340" stroke="#b8862b" stroke-width="1.5"/>
  <rect x="11" y="11" width="178" height="308" rx="6" fill="none" stroke="#b8862b" stroke-width=".8"/>
  <path d="M100 30 L170 165 L100 300 L30 165Z" fill="none" stroke="#b8862b" stroke-width=".7" opacity=".7"/>
  ${[[52, 70], [148, 84], [62, 252], [140, 262], [100, 50], [100, 282], [40, 165], [160, 165]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#e2c27a"/>`).join('')}
  <path d="M112 140 a28 28 0 1 0 0 50 a22 22 0 1 1 0 -50z" fill="#e2c27a"/>
  <text x="100" y="236" text-anchor="middle" font-family="ChosunSm, serif" font-size="15" letter-spacing="6" fill="#e2c27a">天文</text>
</svg>`;
