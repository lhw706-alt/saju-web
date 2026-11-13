// 오늘의 운세 부적 데이터 + 부적 도감 (2026-11-13)
// 도감: 펼친 부적을 이 브라우저(localStorage 'saju:charm-book')에 모음 — { 번호: { first: 날짜, count } }, 연속 방문은 펼친 날짜로 셈
// el: 오늘의 기운(오행) → 행운의 색
export const FORTUNES = [
  { title: '새싹운', el: 'wood', text: '작게 시작한 일이 생각보다 힘 있게 자라는 날이에요.', tip: '미뤄 둔 일 하나를 오늘 첫걸음만 떼어 보세요.' },
  { title: '인연운', el: 'fire', text: '먼저 건넨 인사 한마디가 좋은 인연으로 이어져요.', tip: '오랜만에 떠오른 사람에게 안부를 전해 보세요.' },
  { title: '안정운', el: 'earth', text: '서두르지 않아도 일이 제자리를 찾아가는 하루예요.', tip: '오늘은 계획보다 쉬는 시간을 먼저 정해 보세요.' },
  { title: '결단운', el: 'metal', text: '고민하던 일에 또렷한 답이 보이기 시작해요.', tip: '마음이 기우는 쪽을 메모로 적어 두세요.' },
  { title: '지혜운', el: 'water', text: '조용히 생각할수록 좋은 아이디어가 떠올라요.', tip: '잠들기 전 오늘 떠오른 생각을 적어 보세요.' },
  { title: '성장운', el: 'wood', text: '배우고 익힌 것이 오늘 쓸모를 찾아가요.', tip: '새로 알게 된 것 하나를 누군가와 나눠 보세요.' },
  { title: '활력운', el: 'fire', text: '몸을 움직일수록 기분과 운이 함께 밝아져요.', tip: '가까운 거리는 걸어서 다녀 보세요.' },
  { title: '신뢰운', el: 'earth', text: '꾸준히 지켜 온 약속이 든든한 믿음으로 돌아와요.', tip: '작은 약속 하나를 오늘 꼭 지켜 보세요.' },
  { title: '정리운', el: 'metal', text: '비우고 정리한 자리에 좋은 기운이 들어와요.', tip: '책상 위 한 칸만 깨끗이 치워 보세요.' },
  { title: '흐름운', el: 'water', text: '억지로 밀기보다 흐름을 타면 일이 술술 풀려요.', tip: '오늘은 상대의 속도에 맞춰 보세요.' },
  { title: '용기운', el: 'fire', text: '망설이던 말을 꺼내기 좋은 날이에요.', tip: '하고 싶은 말을 짧고 따뜻하게 건네 보세요.' },
  { title: '여유운', el: 'water', text: '한 박자 쉬어 갈 때 오히려 길이 잘 보여요.', tip: '따뜻한 차 한 잔과 함께 잠깐 멈춰 보세요.' },
  { title: '재물운', el: 'metal', text: '작은 지출을 살피면 마음까지 넉넉해지는 날이에요.', tip: '이번 주 쓴 돈을 한 번 훑어보세요.' },
  { title: '화합운', el: 'earth', text: '함께하는 자리에서 내 장점이 빛나요.', tip: '오늘은 내가 먼저 고마움을 표현해 보세요.' },
  { title: '기회운', el: 'wood', text: '스쳐 지나갈 수 있는 기회가 눈에 띄는 날이에요.', tip: '평소와 다른 길로 한 번 가 보세요.' },
  { title: '집중운', el: 'metal', text: '하나에만 몰두하면 생각보다 빨리 끝나요.', tip: '알림을 잠시 끄고 한 가지만 해 보세요.' },
  { title: '치유운', el: 'water', text: '지친 마음이 조금씩 풀리고 가벼워져요.', tip: '오늘은 일찍 잠자리에 들어 보세요.' },
  { title: '표현운', el: 'fire', text: '내 생각을 꺼낼수록 좋은 반응이 돌아와요.', tip: '글이든 말이든 하나를 표현해 보세요.' },
  { title: '든든운', el: 'earth', text: '미리 준비해 둔 것이 오늘을 지켜 줘요.', tip: '내일 할 일을 오늘 하나만 미리 챙겨 보세요.' },
  { title: '귀인운', el: 'wood', text: '도움이 필요할 때 손을 내미는 사람이 있어요.', tip: '혼자 끙끙대지 말고 먼저 물어보세요.' },
  { title: '복덕운', el: 'earth', text: '베푼 만큼 따뜻함이 되돌아오는 하루예요.', tip: '작은 친절 하나를 건네 보세요.' },
];

export const LUCKY = {
  wood: { name: '초록', hex: '#6dbb8a', dir: '동쪽' },
  fire: { name: '빨강', hex: '#e8705f', dir: '남쪽' },
  earth: { name: '노랑', hex: '#d6a65a', dir: '가운데' },
  metal: { name: '흰색', hex: '#d2d5df', dir: '서쪽' },
  water: { name: '남색', hex: '#6b9be6', dir: '북쪽' },
};
export const EL_HANJA = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };

const BOOK_KEY = 'saju:charm-book';
const DAYS_KEY = 'saju:charm-days';
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function loadBook() {
  try {
    const v = JSON.parse(localStorage.getItem(BOOK_KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}
function loadDays() {
  try {
    const v = JSON.parse(localStorage.getItem(DAYS_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
// 오늘 펼친 부적을 도감에 넣기 (같은 날 두 번 세지 않음)
export function collect(idx, date = dayKey()) {
  try {
    const days = loadDays();
    if (days.includes(date)) return;
    const book = loadBook();
    const cur = book[idx] || { first: date, count: 0 };
    book[idx] = { ...cur, count: cur.count + 1, last: date };
    localStorage.setItem(BOOK_KEY, JSON.stringify(book));
    localStorage.setItem(DAYS_KEY, JSON.stringify([...days, date].slice(-400)));
  } catch {
    /* 무시 */
  }
}
// 오늘(또는 어제)까지 이어진 연속 일수
export function streak() {
  const days = new Set(loadDays());
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // 오늘 아직 안 펼쳤으면 어제부터
  let n = 0;
  while (days.has(dayKey(d))) {
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
// 새 부적 뽑기: 아직 못 모은 부적이 나올 확률을 높여 도감을 채우기 쉽게 (70%)
export function drawIndex() {
  const book = loadBook();
  const missing = FORTUNES.map((_, i) => i).filter((i) => !book[i]);
  if (missing.length && Math.random() < 0.7) return missing[Math.floor(Math.random() * missing.length)];
  return Math.floor(Math.random() * FORTUNES.length);
}
