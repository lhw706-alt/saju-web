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
// 직접 입력은 1~1,000금전 (2026-11-15 사용자 지시)
export const WISH_OFFER_MAX = 1000;
export const wishOfferOk = (n) => Number.isInteger(n) && n >= 0 && n <= WISH_OFFER_MAX;
// 별마루 천동이 꾸미기 (2026-11-15 '다 해줘' 5묶음) — 한 번 사면 그 계정에서 계속, 갈아입기 자유
export const COSMETICS = [
  { id: 'gat', slot: 'hat', label: '갓', credits: 20 },
  { id: 'flower', slot: 'hat', label: '꽃비녀', credits: 15 },
  { id: 'sky', slot: 'color', label: '하늘빛 옷', credits: 10, color: '#cfe0ff' },
  { id: 'blossom', slot: 'color', label: '분홍빛 옷', credits: 10, color: '#ffd9e4' },
  { id: 'gold', slot: 'color', label: '금빛 옷', credits: 30, color: '#f6dea0' },
  { id: 'goldseat', slot: 'cushion', label: '금빛 방석', credits: 20 },
];
export const cosmeticById = (id) => COSMETICS.find((c) => c.id === id) || null;
export const fmtCredits = (n) => `${Number(n || 0).toLocaleString('ko-KR')}${UNIT}`;
