// 복채(충전식 유료) — 2026-11-14 사용자 결정. 단위는 '금전'(2026-11-15 사용자 지시), 1금전 = 100원. 화면·서버가 같이 씀.
// 가격·패키지를 바꾸면 여기만 고치면 됨 (서버가 금액을 이 표로 다시 확인).
export const UNIT = '금전';
export const PACKAGES = [
  { id: 'p3', won: 3000, credits: 30, label: '3,000원', bonus: '' },
  { id: 'p10', won: 10000, credits: 110, label: '10,000원', bonus: '10% 덤' },
  { id: 'p30', won: 30000, credits: 350, label: '30,000원', bonus: '약 17% 덤' },
];
// 1금전 = 100원 기준으로 몇 % 싸게 사는지 (2026-11-15 사용자 지시: 덤 대신 할인율로 표기)
export const WON_PER_CREDIT = 100;
export const listWon = (p) => p.credits * WON_PER_CREDIT;
export const discountOf = (p) => Math.max(0, Math.round((1 - p.won / listWon(p)) * 100));
export const packageById = (id) => PACKAGES.find((p) => p.id === id) || null;

// 쓰는 곳 (2026-11-15 사용자 지시: 타로·신년운세는 처음부터 유료)
export const PRICES = {
  tarot1: { credits: 10, label: '타로 한 장' },
  tarot3: { credits: 20, label: '타로 세 장 펼침' },
  newyearMonth: { credits: 30, label: '신년운세 (한 해 흐름 + 월별 상세)' },
  life: { credits: 50, label: '평생 사주 리포트' }, // 2026-11-15 사용자 지시로 유료
};
// 메인 카드 배지에 적는 가격 (contents.js id → 글자)
// 가격표(엽전 아이콘 + 숫자로 표시, 2026-11-15 사용자 지시) — PriceTag 컴포넌트가 씀
export const PRICE_COIN = { tarot: { n: PRICES.tarot1.credits, from: true }, newyear: { n: PRICES.newyearMonth.credits }, life: { n: PRICES.life.credits } };
// 사람마다 한 번 사는 상품. perYear 면 해마다 따로 (신년운세)
export const PAID_ITEMS = { newyearMonth: { perYear: true, kind: 'newyear', prefix: 'ny' }, life: { perYear: false, kind: 'life', prefix: 'lf' } };
export const PRICE_TAGS = { tarot: `${PRICES.tarot1.credits}${UNIT}부터`, newyear: `${PRICES.newyearMonth.credits}${UNIT}` };
// 소원에 넣는 금전 (2026-11-15 사용자 지시) — 0 은 넣지 않음. 넣은 금전은 돌려받지 않음
export const WISH_OFFERS = [0, 5, 10, 30, 50];
export const fmtCredits = (n) => `${Number(n || 0).toLocaleString('ko-KR')}${UNIT}`;
