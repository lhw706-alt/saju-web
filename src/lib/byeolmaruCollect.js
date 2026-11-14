// 별마루 3묶음 (2026-11-15 '다 해줘'): 28수 별자리 도감 · 천둥도사의 암자 점괘 — 모두 이 브라우저(localStorage), 풀이 비용 없음.

// 동양 별자리 28수(二十八宿) — 네 방위 신수별 7개씩. 하늘에 그리는 모양은 실제 별 배치가 아니라 그림 표현.
export const MANSIONS = [
  ['角', '각', '청룡'], ['亢', '항', '청룡'], ['氐', '저', '청룡'], ['房', '방', '청룡'], ['心', '심', '청룡'], ['尾', '미', '청룡'], ['箕', '기', '청룡'],
  ['斗', '두', '현무'], ['牛', '우', '현무'], ['女', '여', '현무'], ['虛', '허', '현무'], ['危', '위', '현무'], ['室', '실', '현무'], ['壁', '벽', '현무'],
  ['奎', '규', '백호'], ['婁', '루', '백호'], ['胃', '위', '백호'], ['昴', '묘', '백호'], ['畢', '필', '백호'], ['觜', '자', '백호'], ['參', '삼', '백호'],
  ['井', '정', '주작'], ['鬼', '귀', '주작'], ['柳', '류', '주작'], ['星', '성', '주작'], ['張', '장', '주작'], ['翼', '익', '주작'], ['軫', '진', '주작'],
].map(([hanja, ko, group], i) => ({ id: i, hanja, ko, group }));
export const GROUPS = [
  { id: '청룡', dir: '동쪽', color: '#6dbb8a' },
  { id: '현무', dir: '북쪽', color: '#6b9be6' },
  { id: '백호', dir: '서쪽', color: '#eef0f6' },
  { id: '주작', dir: '남쪽', color: '#e8705f' },
];

// 별자리 i 의 점 모양 (같은 i 면 늘 같은 모양) — [x, y] -1~1
export function mansionShape(i) {
  let seed = (i + 1) * 9301 + 49297;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const n = 4 + Math.floor(rnd() * 4);
  const pts = [];
  let x = -0.8;
  let y = (rnd() - 0.5) * 0.6;
  for (let k = 0; k < n; k++) {
    pts.push([x, y]);
    x += 1.6 / (n - 1);
    y = Math.max(-0.8, Math.min(0.8, y + (rnd() - 0.5) * 0.9));
  }
  return pts;
}

const kstDay = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const COL_KEY = 'saju:bm-constellations';
export function loadMansions() {
  try {
    const v = JSON.parse(localStorage.getItem(COL_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
// 오늘 108개를 채우면 다음 별자리 하나 (하루 한 개, 28개 다 모으면 끝)
export function unlockToday() {
  const list = loadMansions();
  const today = kstDay();
  if (list.some((m) => m.date === today)) return { list, added: null };
  const next = MANSIONS.find((m) => !list.some((x) => x.id === m.id));
  if (!next) return { list, added: null };
  const out = [...list, { id: next.id, date: today }];
  try {
    localStorage.setItem(COL_KEY, JSON.stringify(out));
  } catch {
    /* 무시 */
  }
  return { list: out, added: next };
}

// 천둥도사의 암자 점괘 — 하루 한 번(이 브라우저), 같은 날 다시 열면 같은 점괘
export const ORACLES = [
  { rank: '대길', words: '雲開見月', ko: '구름이 걷히고 달이 보인다', line: '오래 막혀 있던 일이 풀리는 흐름이에요. 미뤄 둔 일을 다시 꺼내 보세요.' },
  { rank: '대길', words: '春風得意', ko: '봄바람에 뜻을 얻는다', line: '하려던 일에 순풍이 불어요. 자신 있게 한 걸음 내디뎌 보세요.' },
  { rank: '대길', words: '金石爲開', ko: '정성이면 쇠와 돌도 열린다', line: '꾸준히 쌓아 온 노력이 빛을 보는 때예요. 조금만 더 힘을 내요.' },
  { rank: '길', words: '水到渠成', ko: '물이 이르면 도랑이 생긴다', line: '억지로 밀지 않아도 때가 되면 길이 나요. 흐름을 믿어 보세요.' },
  { rank: '길', words: '花開滿枝', ko: '가지마다 꽃이 핀다', line: '사람 사이에 좋은 기운이 돌아요. 먼저 웃으며 다가가 보세요.' },
  { rank: '길', words: '日新月異', ko: '날마다 새로워진다', line: '작은 변화를 시도하기 좋은 날이에요. 익숙한 길 대신 새 길로 가 보세요.' },
  { rank: '길', words: '鵬程萬里', ko: '붕새가 만 리를 난다', line: '큰 그림을 그리기 좋은 때예요. 목표를 한 번 크게 적어 보세요.' },
  { rank: '길', words: '和氣致祥', ko: '화목한 기운이 복을 부른다', line: '집과 가까운 사람에게 마음을 쓰면 좋은 일이 따라와요.' },
  { rank: '중길', words: '積小成大', ko: '작은 것을 쌓아 큰 것을 이룬다', line: '오늘 한 일은 작아 보여도 차곡차곡 쌓이고 있어요.' },
  { rank: '중길', words: '溫故知新', ko: '옛것을 익혀 새것을 안다', line: '예전에 배운 것, 예전에 만난 사람에게서 실마리가 나와요.' },
  { rank: '중길', words: '靜中有動', ko: '고요함 속에 움직임이 있다', line: '겉으로는 조용해도 안에서는 일이 무르익고 있어요. 서두르지 마세요.' },
  { rank: '중길', words: '有備無患', ko: '준비하면 걱정이 없다', line: '미리 챙겨 두면 마음이 편해지는 날이에요. 내일 일을 오늘 조금 준비해요.' },
  { rank: '중길', words: '雨後地實', ko: '비 온 뒤에 땅이 굳는다', line: '지난 어려움이 오히려 바탕을 단단하게 해 줬어요.' },
  { rank: '중길', words: '知足常樂', ko: '만족을 알면 늘 즐겁다', line: '이미 가진 것을 세어 보면 마음이 넉넉해지는 날이에요.' },
  { rank: '소길', words: '一步一步', ko: '한 걸음 한 걸음', line: '크게 바뀌지 않아도 괜찮아요. 오늘 할 몫만 해도 충분해요.' },
  { rank: '소길', words: '守口如甁', ko: '입을 병처럼 지킨다', line: '말을 아끼면 오해가 줄어드는 날이에요. 듣는 쪽에 서 보세요.' },
  { rank: '소길', words: '欲速不達', ko: '서두르면 이르지 못한다', line: '급한 마음이 들 땐 한 번 쉬어 가세요. 천천히 가야 빨라요.' },
  { rank: '소길', words: '他山之石', ko: '남의 산의 돌', line: '다른 사람의 일에서 배울 점이 보여요. 마음을 열고 둘러보세요.' },
  { rank: '소길', words: '柔能制剛', ko: '부드러움이 굳셈을 이긴다', line: '부딪히기보다 한발 물러서면 일이 더 잘 풀려요.' },
  { rank: '평', words: '心平氣和', ko: '마음이 고르면 기운이 온화하다', line: '특별한 일은 없어도 평온한 하루예요. 그 평온을 즐겨 보세요.' },
  { rank: '평', words: '待時而動', ko: '때를 기다려 움직인다', line: '오늘은 큰 결정보다 살펴보는 날이에요. 기회는 곧 와요.' },
  { rank: '평', words: '物極必反', ko: '끝에 이르면 돌아선다', line: '힘든 흐름이 끝자락에 와 있어요. 곧 방향이 바뀌어요.' },
  { rank: '평', words: '淸風明月', ko: '맑은 바람, 밝은 달', line: '욕심을 내려놓고 쉬면 머리가 맑아지는 날이에요.' },
  { rank: '평', words: '飮水思源', ko: '물을 마실 때 근원을 생각한다', line: '고마운 사람을 떠올리고 안부를 전해 보세요.' },
];
const ORA_KEY = 'saju:bm-oracle';
export function todayOracle() {
  try {
    const v = JSON.parse(localStorage.getItem(ORA_KEY) || 'null');
    return v && v.d === kstDay() ? ORACLES[v.i] : null;
  } catch {
    return null;
  }
}
export function drawOracle() {
  const done = todayOracle();
  if (done) return done;
  const i = Math.floor(Math.random() * ORACLES.length);
  try {
    localStorage.setItem(ORA_KEY, JSON.stringify({ d: kstDay(), i }));
  } catch {
    /* 무시 */
  }
  return ORACLES[i];
}
