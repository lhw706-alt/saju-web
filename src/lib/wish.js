// 소원빌기 공용 규칙 (2026-11-14 사용자 기획안) — 화면(src/pages/Wish.jsx)과 서버(netlify/functions/auth.mjs /api/wish*)가 같이 씀.
export const WISH_MAX = 100; // 글자 수
export const WISH_DAILY = 3; // 하루에 빌 수 있는 소원 수 (KST)
export const WISH_HIDE_REPORTS = 3; // 신고가 이만큼 쌓이면 목록에서 숨김

// 카테고리 (아이콘은 화면의 글래스 아이콘)
export const WISH_CATS = [
  { id: 'love', label: '사랑' },
  { id: 'money', label: '재물' },
  { id: 'career', label: '취업' },
  { id: 'health', label: '건강' },
  { id: 'study', label: '학업' },
  { id: 'etc', label: '기타' },
];
export const wishCat = (id) => WISH_CATS.find((c) => c.id === id) || null;

// 공개 금지·부적절한 내용 거르기 → 문제가 있으면 안내 문구, 없으면 null
const BAD = ['시발', '씨발', 'ㅅㅂ', '병신', 'ㅂㅅ', '좆', '개새', '새끼', '미친놈', '미친년', '지랄', '꺼져', '죽어', '죽여', '섹스', '야동', '토토', '카지노', '바카라', '대출', '텔레그램', '카톡아이디'];
export function wishProblem(text) {
  const t = String(text || '').trim();
  if (t.length < 2) return '소원을 두 글자 이상 적어 주세요.';
  if (t.length > WISH_MAX) return `소원은 ${WISH_MAX}자까지 적을 수 있어요.`;
  const flat = t.replace(/\s+/g, '');
  if (/01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/.test(t) || /\d{2,3}-\d{3,4}-\d{4}/.test(t)) return '전화번호 같은 연락처는 적을 수 없어요.';
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(t)) return '이메일 주소는 적을 수 없어요.';
  if (/(https?:\/\/|www\.|\.com|\.kr|\.net|open\.kakao)/i.test(t)) return '링크나 광고는 적을 수 없어요.';
  if (BAD.some((w) => flat.includes(w))) return '모두가 함께 보는 하늘이라 고운 말로 적어 주세요.';
  return null;
}
