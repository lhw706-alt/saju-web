// 복채(충전식 유료) — 2026-11-14 사용자 결정. 단위는 '금전'(2026-11-15 사용자 지시), 1금전 = 100원. 화면·서버가 같이 씀.
// 가격·패키지를 바꾸면 여기만 고치면 됨 (서버가 금액을 이 표로 다시 확인).
export const UNIT = '금전';
export const PACKAGES = [
  { id: 'p3', won: 3000, credits: 30, label: '3,000원', bonus: '' },
  { id: 'p10', won: 10000, credits: 110, label: '10,000원', bonus: '10% 덤' },
  { id: 'p30', won: 30000, credits: 350, label: '30,000원', bonus: '약 17% 덤' },
];
export const packageById = (id) => PACKAGES.find((p) => p.id === id) || null;

// 쓰는 곳 (2026-11-15 사용자 지시: 타로·신년운세는 처음부터 유료)
export const PRICES = {
  tarot1: { credits: 10, label: '타로 한 장' },
  tarot3: { credits: 15, label: '타로 세 장 펼침' },
  newyearMonth: { credits: 40, label: '신년운세 (한 해 흐름 + 월별 상세)' },
};
// 메인 카드 배지에 적는 가격 (contents.js id → 글자)
export const PRICE_TAGS = { tarot: `${PRICES.tarot1.credits}${UNIT}부터`, newyear: `${PRICES.newyearMonth.credits}${UNIT}` };
export const fmtCredits = (n) => `${Number(n || 0).toLocaleString('ko-KR')}${UNIT}`;
